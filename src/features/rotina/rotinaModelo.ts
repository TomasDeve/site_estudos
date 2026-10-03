import type { RotinaBloco } from "@/types/db";
import type { BlocoNovo } from "@/api/rotina";

/**
 * Modelo da Rotina — uma rotina só, a mesma todos os dias. Cada bloco vai de
 * `inicio` a `fim` em minutos desde 00:00; `fim <= inicio` = passa da meia-noite
 * (o sono: 22:30 → 6:00). A coluna `dias` (0 = domingo … 6 = sábado) existe no banco,
 * mas a tela grava sempre todos os dias.
 */

export type TipoBloco =
  | "sono"
  | "estudo"
  | "intervalo"
  | "academia"
  | "refeicao"
  | "trabalho"
  | "lazer"
  | "outro";

export const TIPOS: Record<TipoBloco, { label: string; emoji: string; cor: string }> = {
  estudo: { label: "Estudo", emoji: "📚", cor: "#e0a83e" },
  intervalo: { label: "Intervalo", emoji: "☕", cor: "#3fc8d6" },
  academia: { label: "Academia", emoji: "🏋️", cor: "#3fbf7f" },
  refeicao: { label: "Refeição", emoji: "🍽️", cor: "#f08a4b" },
  sono: { label: "Sono", emoji: "😴", cor: "#7c8cf2" },
  trabalho: { label: "Trabalho", emoji: "💼", cor: "#9db0c7" },
  lazer: { label: "Lazer", emoji: "🎮", cor: "#e46fb0" },
  outro: { label: "Outro", emoji: "📌", cor: "#6f849e" },
};

export const ORDEM_TIPOS = Object.keys(TIPOS) as TipoBloco[];

export const tipoDe = (b: Pick<RotinaBloco, "tipo">): TipoBloco =>
  (b.tipo in TIPOS ? b.tipo : "outro") as TipoBloco;

/** Título exibido: o digitado ou, vazio, o nome do tipo. */
export const tituloDe = (b: Pick<RotinaBloco, "tipo" | "titulo">) =>
  b.titulo.trim() || TIPOS[tipoDe(b)].label;

/** Semana começando na segunda (como se pensa a rotina de estudo). */
export const DIAS_SEMANA = [
  { dia: 1, curto: "Seg", letra: "S" },
  { dia: 2, curto: "Ter", letra: "T" },
  { dia: 3, curto: "Qua", letra: "Q" },
  { dia: 4, curto: "Qui", letra: "Q" },
  { dia: 5, curto: "Sex", letra: "S" },
  { dia: 6, curto: "Sáb", letra: "S" },
  { dia: 0, curto: "Dom", letra: "D" },
] as const;

export const NOME_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export const DIAS_UTEIS = [1, 2, 3, 4, 5];
export const FIM_DE_SEMANA = [6, 0];
export const TODOS_OS_DIAS = [1, 2, 3, 4, 5, 6, 0];

const DIA_MIN = 1440;
const SEMANA_MIN = 7 * DIA_MIN;

/** Duração em minutos (atravessando a meia-noite quando `fim <= inicio`). */
export function duracao(b: Pick<RotinaBloco, "inicio" | "fim">): number {
  return b.fim > b.inicio ? b.fim - b.inicio : b.fim + DIA_MIN - b.inicio;
}

export const passaDaMeiaNoite = (b: Pick<RotinaBloco, "inicio" | "fim">) => b.fim <= b.inicio;

/** 390 → "6:30"; 1350 → "22:30". */
export function fmtHora(min: number): string {
  const m = ((min % DIA_MIN) + DIA_MIN) % DIA_MIN;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** 390 → "06:30" (valor do <input type="time">). */
export function paraInputHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** "06:30" → 390; inválido → null. */
export function deInputHora(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/** Blocos que começam no dia, por horário. */
export function blocosDoDia(blocos: RotinaBloco[], dia: number): RotinaBloco[] {
  return blocos
    .filter((b) => b.dias.includes(dia))
    .sort((a, b) => a.inicio - b.inicio || duracao(b) - duracao(a));
}

/** O bloco da véspera que entra madrugada adentro neste dia (o sono, normalmente). */
export function vindoDeOntem(blocos: RotinaBloco[], dia: number): RotinaBloco | null {
  const ontem = (dia + 6) % 7;
  const candidatos = blocos.filter((b) => b.dias.includes(ontem) && passaDaMeiaNoite(b) && b.fim > 0);
  // O que termina mais tarde manda (é a hora de acordar).
  return candidatos.sort((a, b) => b.fim - a.fim)[0] ?? null;
}

export interface Ocorrencia {
  bloco: RotinaBloco;
  /** Minutos a partir de hoje 00:00 (negativo = começou ontem). */
  inicio: number;
  fim: number;
}

/** Ocorrências de ontem a depois de amanhã, em minutos relativos a hoje 00:00. */
function ocorrencias(blocos: RotinaBloco[], hoje: number): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  for (let off = -1; off <= 2; off++) {
    const dia = (hoje + off + 7) % 7;
    for (const b of blocos) {
      if (!b.dias.includes(dia)) continue;
      const inicio = off * DIA_MIN + b.inicio;
      out.push({ bloco: b, inicio, fim: inicio + duracao(b) });
    }
  }
  return out;
}

/** O que está valendo agora e o que vem em seguida. */
export function agoraNaRotina(blocos: RotinaBloco[], agora: Date) {
  const hoje = agora.getDay();
  const min = agora.getHours() * 60 + agora.getMinutes() + agora.getSeconds() / 60;
  const occ = ocorrencias(blocos, hoje);
  // Sobrepostos: vale o que começou por último (um intervalo dentro do estudo, p. ex.).
  const atual =
    occ.filter((o) => o.inicio <= min && min < o.fim).sort((a, b) => b.inicio - a.inicio)[0] ??
    null;
  const proximo = occ.filter((o) => o.inicio > min).sort((a, b) => a.inicio - b.inicio)[0] ?? null;
  return { atual, proximo, min };
}

/** Blocos que batem com o candidato em algum dia em comum. */
export function conflitos(
  blocos: RotinaBloco[],
  cand: Pick<RotinaBloco, "inicio" | "fim" | "dias">,
  ignorarId?: string
): RotinaBloco[] {
  const durC = duracao(cand);
  return blocos.filter((b) => {
    if (b.id === ignorarId) return false;
    const durB = duracao(b);
    return cand.dias.some((dc) =>
      b.dias.some((db) => {
        const s1 = dc * DIA_MIN + cand.inicio;
        const s2 = db * DIA_MIN + b.inicio;
        // A semana dá a volta (o sono de sábado entra no domingo).
        return [-SEMANA_MIN, 0, SEMANA_MIN].some(
          (k) => s1 < s2 + k + durB && s2 + k < s1 + durC
        );
      })
    );
  });
}

/** Resumo do dia: hora de acordar/dormir, sono e o total de cada tipo. */
export function resumoDoDia(blocos: RotinaBloco[], dia: number) {
  const doDia = blocosDoDia(blocos, dia);
  const ontem = vindoDeOntem(blocos, dia);
  const sonoNoite = doDia.filter((b) => tipoDe(b) === "sono").sort((a, b) => b.inicio - a.inicio)[0];
  const porTipo = new Map<TipoBloco, number>();
  for (const b of doDia) porTipo.set(tipoDe(b), (porTipo.get(tipoDe(b)) ?? 0) + duracao(b));
  return {
    acorda: ontem && tipoDe(ontem) === "sono" ? ontem.fim : null,
    dorme: sonoNoite?.inicio ?? null,
    sono: sonoNoite ? duracao(sonoNoite) : null,
    porTipo,
  };
}

/** Rotina de partida (um dia típico de estudo da PC PE, com as 3h de estudo). */
export const MODELO: BlocoNovo[] = [
  { tipo: "sono", titulo: "Dormir", inicio: 22 * 60 + 30, fim: 6 * 60 },
  { tipo: "refeicao", titulo: "Café da manhã", inicio: 6 * 60 + 30, fim: 7 * 60 },
  { tipo: "estudo", titulo: "Estudo — 1º bloco", inicio: 8 * 60, fim: 9 * 60 + 30 },
  { tipo: "intervalo", titulo: "Intervalo", inicio: 9 * 60 + 30, fim: 9 * 60 + 45 },
  { tipo: "estudo", titulo: "Estudo — 2º bloco", inicio: 9 * 60 + 45, fim: 11 * 60 + 15 },
  { tipo: "refeicao", titulo: "Almoço", inicio: 12 * 60, fim: 13 * 60 },
  { tipo: "academia", titulo: "Academia", inicio: 18 * 60, fim: 19 * 60 },
  { tipo: "refeicao", titulo: "Jantar", inicio: 19 * 60 + 30, fim: 20 * 60 },
  { tipo: "outro", titulo: "Desligar as telas", inicio: 22 * 60, fim: 22 * 60 + 30 },
].map((b) => ({ ...b, dias: TODOS_OS_DIAS }));

type BlocoComId = BlocoNovo & { id?: string };

const camposDe = (b: BlocoNovo): BlocoNovo => ({
  tipo: b.tipo,
  titulo: b.titulo ?? "",
  inicio: b.inicio,
  fim: b.fim,
  dias: b.dias ?? TODOS_OS_DIAS,
});

/** O bloco mudou (tipo, nome, horário ou dias)? */
export function blocoMudou(antes: Pick<RotinaBloco, "tipo" | "titulo" | "inicio" | "fim" | "dias">, depois: BlocoNovo) {
  const d = camposDe(depois);
  return (
    antes.tipo !== d.tipo ||
    antes.titulo.trim() !== (d.titulo ?? "").trim() ||
    antes.inicio !== d.inicio ||
    antes.fim !== d.fim ||
    [...antes.dias].sort().join() !== [...(d.dias ?? [])].sort().join()
  );
}

/**
 * O que gravar para a rotina `atual` virar a `nova` (a da IA, ou a de antes no
 * "Desfazer"): bloco com `id` que ainda existe é atualizado (se mudou), o resto
 * entra como novo e o que sumiu da lista é apagado. Um mesmo `id` repetido só
 * aproveita a linha uma vez — a cópia entra como bloco novo.
 */
export function diffRotina(atual: RotinaBloco[], nova: BlocoComId[]) {
  const porId = new Map(atual.map((b) => [b.id, b]));
  const usados = new Set<string>();
  const inserir: BlocoNovo[] = [];
  const atualizar: (BlocoNovo & { id: string })[] = [];
  for (const b of nova) {
    const antigo = b.id ? porId.get(b.id) : undefined;
    if (antigo && !usados.has(antigo.id)) {
      usados.add(antigo.id);
      if (blocoMudou(antigo, b)) atualizar.push({ ...camposDe(b), id: antigo.id });
    } else {
      inserir.push(camposDe(b));
    }
  }
  const excluir = atual.filter((b) => !usados.has(b.id)).map((b) => b.id);
  return { inserir, atualizar, excluir };
}

/**
 * Ordem de leitura de uma rotina: do acordar (fim do sono) em diante, para o sono
 * da noite ficar no fim e um bloco de madrugada não ir parar no topo.
 */
export function ordenarPeloDia<T extends Pick<RotinaBloco, "tipo" | "inicio" | "fim">>(blocos: T[]): T[] {
  const sono = blocos.find((b) => tipoDe(b) === "sono" && passaDaMeiaNoite(b));
  const acorda = sono ? sono.fim : 0;
  const pos = (b: T) => (b.inicio - acorda + DIA_MIN) % DIA_MIN;
  return [...blocos].sort((a, b) => pos(a) - pos(b) || duracao(b) - duracao(a));
}
