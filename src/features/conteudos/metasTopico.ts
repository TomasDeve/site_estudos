import type { QuestaoLog, TopicoMeta, TopicoMetaTipo } from "@/types/db";
import { diasEntre, hojeISO } from "@/lib/dates";

/**
 * O plano padrão de um assunto: 5 metas.
 *
 * As duas primeiras são marcadas na mão (só você sabe se leu e se resumiu). As
 * três últimas saem sozinhas do histórico de questões, porque medir isso na mão
 * é justamente o que a gente erra: a sensação de domínio infla depois da
 * leitura, e o número não infla.
 */
export const PLANO_PADRAO: ReadonlyArray<{
  chave: string;
  titulo: string;
  tipo: TopicoMetaTipo;
  alvo: number | null;
  janela: number | null;
  dias: number | null;
}> = [
  {
    chave: "lei",
    titulo: "Ler a lei seca do assunto",
    tipo: "manual",
    alvo: null,
    janela: null,
    dias: null,
  },
  {
    chave: "producao",
    titulo: "Fazer um resumo próprio ou 15 flashcards",
    tipo: "manual",
    alvo: null,
    janela: null,
    dias: null,
  },
  {
    chave: "volume",
    titulo: "20 questões em 2 dias diferentes",
    tipo: "volume",
    alvo: 20,
    janela: null,
    dias: 2,
  },
  {
    chave: "acerto",
    titulo: "85% nas últimas 20 questões",
    tipo: "acerto",
    alvo: 85,
    janela: 20,
    dias: null,
  },
  {
    chave: "frio",
    titulo: "Teste frio: 80% num bloco de 10, após 7 dias parado",
    tipo: "frio",
    alvo: 80,
    janela: 10,
    dias: 7,
  },
];

export interface EstadoMeta {
  concluida: boolean;
  /** 0 a 1 — o quanto já andou, para a barrinha. */
  progresso: number;
  /** Frase curta do estado atual, ex.: "14/20 questões · 2 dias". */
  detalhe: string;
  /** true quando o estado veio do histórico, não de um clique. */
  automatica: boolean;
  /** Marcada na mão apesar de ser automática. */
  forcada: boolean;
}

/** Soma de um punhado de registros. */
function somar(logs: QuestaoLog[]) {
  let total = 0;
  let acertos = 0;
  for (const l of logs) {
    total += l.total;
    acertos += l.acertos;
  }
  return { total, acertos };
}

function pct(acertos: number, total: number): number {
  return total === 0 ? 0 : Math.round((acertos / total) * 100);
}

/** Do mais recente para o mais antigo. */
function ordenarDesc(logs: QuestaoLog[]): QuestaoLog[] {
  return [...logs].sort(
    (a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at)
  );
}

/**
 * As N questões mais recentes do assunto.
 *
 * Os registros são diários (um por dia/assunto), então quando o dia mais antigo
 * estoura a janela ele entra proporcional — 20 de um dia de 30 questões com 24
 * acertos contam como 16 acertos. Aproximação consciente: sem guardar questão a
 * questão, é o mais perto que dá da "janela móvel" de verdade.
 */
export function ultimasQuestoes(logs: QuestaoLog[], n: number) {
  let total = 0;
  let acertos = 0;
  for (const l of ordenarDesc(logs)) {
    if (total >= n) break;
    if (l.total <= 0) continue;
    const cabe = Math.min(l.total, n - total);
    acertos += cabe === l.total ? l.acertos : Math.round(l.acertos * (cabe / l.total));
    total += cabe;
  }
  return { total, acertos, pct: pct(acertos, total) };
}

/**
 * O bloco do teste frio: o primeiro punhado de questões feito depois da lacuna
 * mais recente de `dias` sem tocar no assunto.
 *
 * "Frio" aqui é literal — ficou tempo sem contato. É o que separa "sei agora,
 * acabei de ler" de "vou saber daqui a um mês na prova".
 */
export function blocoFrio(logs: QuestaoLog[], janela: number, dias: number) {
  // Um registro por dia: dias iguais viram um só, senão a lacuna nunca aparece.
  const porDia = new Map<string, QuestaoLog[]>();
  for (const l of logs) {
    const arr = porDia.get(l.data) ?? [];
    arr.push(l);
    porDia.set(l.data, arr);
  }
  const datas = [...porDia.keys()].sort();
  if (datas.length === 0) return null;

  // A lacuna mais recente: é ela que reflete o estado de hoje.
  let inicio = -1;
  for (let i = datas.length - 1; i >= 1; i--) {
    if (diasEntre(datas[i - 1], datas[i]) >= dias) {
      inicio = i;
      break;
    }
  }
  if (inicio === -1) return null;

  // Do reencontro em diante, até fechar o bloco.
  const doBloco: QuestaoLog[] = [];
  let total = 0;
  for (let i = inicio; i < datas.length && total < janela; i++) {
    const doDia = porDia.get(datas[i])!;
    doBloco.push(...doDia);
    total += somar(doDia).total;
  }
  const soma = somar(doBloco);
  return {
    data: datas[inicio],
    total: soma.total,
    acertos: soma.acertos,
    pct: pct(soma.acertos, soma.total),
    completo: soma.total >= janela,
  };
}

/** Dias desde a última vez que o assunto foi tocado. */
export function diasParado(logs: QuestaoLog[]): number | null {
  const ordenados = ordenarDesc(logs);
  if (ordenados.length === 0) return null;
  return diasEntre(ordenados[0].data, hojeISO());
}

function estadoVolume(meta: TopicoMeta, logs: QuestaoLog[]): EstadoMeta {
  const alvo = meta.alvo ?? 20;
  const diasMin = meta.dias ?? 1;
  const { total } = somar(logs);
  const distintos = new Set(logs.map((l) => l.data)).size;
  const concluida = total >= alvo && distintos >= diasMin;
  const progresso = Math.min(1, alvo === 0 ? 1 : total / alvo);
  const plural = diasMin === 1 ? "dia" : "dias";
  return {
    concluida,
    progresso,
    detalhe:
      total >= alvo && distintos < diasMin
        ? `${total} questões, mas num dia só — faltam ${diasMin - distintos} ${plural}`
        : `${total}/${alvo} questões · ${distintos} ${distintos === 1 ? "dia" : "dias"}`,
    automatica: true,
    forcada: false,
  };
}

function estadoAcerto(meta: TopicoMeta, logs: QuestaoLog[]): EstadoMeta {
  const alvo = meta.alvo ?? 85;
  const janela = meta.janela ?? 20;
  const j = ultimasQuestoes(logs, janela);
  if (j.total < janela) {
    return {
      concluida: false,
      progresso: janela === 0 ? 0 : j.total / janela,
      detalhe:
        j.total === 0
          ? `sem questões ainda — precisa de ${janela} para medir`
          : `faltam ${janela - j.total} questões para medir a janela`,
      automatica: true,
      forcada: false,
    };
  }
  return {
    concluida: j.pct >= alvo,
    progresso: Math.min(1, alvo === 0 ? 1 : j.pct / alvo),
    detalhe: `${j.pct}% nas últimas ${j.total} · alvo ${alvo}%`,
    automatica: true,
    forcada: false,
  };
}

function estadoFrio(meta: TopicoMeta, logs: QuestaoLog[]): EstadoMeta {
  const alvo = meta.alvo ?? 80;
  const janela = meta.janela ?? 10;
  const dias = meta.dias ?? 7;
  const bloco = blocoFrio(logs, janela, dias);

  if (bloco?.completo) {
    return {
      concluida: bloco.pct >= alvo,
      progresso: Math.min(1, alvo === 0 ? 1 : bloco.pct / alvo),
      detalhe:
        bloco.pct >= alvo
          ? `${bloco.pct}% em ${bloco.total} questões frias`
          : `${bloco.pct}% no teste frio — abaixo de ${alvo}%`,
      automatica: true,
      forcada: false,
    };
  }

  const parado = diasParado(logs);
  if (parado === null) {
    return {
      concluida: false,
      progresso: 0,
      detalhe: "faça o assunto andar primeiro",
      automatica: true,
      forcada: false,
    };
  }
  if (bloco) {
    return {
      concluida: false,
      progresso: janela === 0 ? 0 : bloco.total / janela,
      detalhe: `teste frio em andamento: ${bloco.total}/${janela} questões`,
      automatica: true,
      forcada: false,
    };
  }
  if (parado >= dias) {
    return {
      concluida: false,
      progresso: 0,
      detalhe: `liberado — ${parado} dias parado, faça ${janela} questões agora`,
      automatica: true,
      forcada: false,
    };
  }
  return {
    concluida: false,
    progresso: dias === 0 ? 0 : parado / dias,
    detalhe: `esfria em ${dias - parado} ${dias - parado === 1 ? "dia" : "dias"}`,
    automatica: true,
    forcada: false,
  };
}

/** O estado de uma meta hoje: marcada na mão ou calculada pelo histórico. */
export function avaliarMeta(meta: TopicoMeta, logs: QuestaoLog[]): EstadoMeta {
  if (meta.tipo === "manual") {
    return {
      concluida: meta.concluida,
      progresso: meta.concluida ? 1 : 0,
      detalhe: meta.concluida ? "feita" : "marque quando fizer",
      automatica: false,
      forcada: false,
    };
  }

  const calculado =
    meta.tipo === "volume"
      ? estadoVolume(meta, logs)
      : meta.tipo === "acerto"
        ? estadoAcerto(meta, logs)
        : estadoFrio(meta, logs);

  // "Dar por cumprida" só acrescenta: nunca desmarca o que o histórico provou.
  if (meta.concluida && !calculado.concluida) {
    return { ...calculado, concluida: true, progresso: 1, forcada: true };
  }
  return calculado;
}

/** Placar do assunto: quantas metas já fecharam. */
export function placarAssunto(metas: TopicoMeta[], logs: QuestaoLog[]) {
  const feitas = metas.filter((m) => avaliarMeta(m, logs).concluida).length;
  return { feitas, total: metas.length, fechado: metas.length > 0 && feitas === metas.length };
}
