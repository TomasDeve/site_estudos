import type { QuestaoLog } from "@/types/db";
import { ultimasQuestoes } from "@/features/conteudos/metasTopico";
import { minutosDe } from "./planoDias";

/**
 * Ciclo das matérias (Painel, abaixo do plano): o rank de cada matéria é o % de
 * acerto nas últimas 50 questões dela, como num jogo — Bronze I, II e III,
 * depois Prata, Ouro e Diamante (Diamante III = 95% ou mais). Quantas vezes ela entrou no
 * plano (1×, 2×…) é contado à parte.
 */
export interface TierRank {
  nome: string;
  /** Cor do tier (hex): pinta a linha da matéria e a insígnia. */
  cor: string;
  icone: "medalha" | "gema";
}

export interface Rank {
  /** 0 = sem rank; depois, um degrau por faixa de acerto. */
  nivel: number;
  /** % de acerto mínimo para chegar nele (0 no Bronze I e no "Sem rank"). */
  minimo: number;
  nome: string;
  /** Nulo no "Sem rank". */
  tier: TierRank | null;
  /** I, II ou III dentro do tier; 0 = sem rank. */
  divisao: 0 | 1 | 2 | 3;
}

const COM_DIVISOES: TierRank[] = [
  { nome: "Bronze", cor: "#c98552", icone: "medalha" },
  { nome: "Prata", cor: "#b8c4d4", icone: "medalha" },
  { nome: "Ouro", cor: "#e0a83e", icone: "medalha" },
  { nome: "Diamante", cor: "#57a8f0", icone: "gema" },
];

/** Os tiers, do mais baixo ao mais alto. */
export const TIERS: readonly TierRank[] = COM_DIVISOES;

const ROMANOS = ["I", "II", "III"] as const;

/** Janela do rank: as últimas N questões da matéria. */
export const JANELA_RANK = 50;
/** Abaixo disso a amostra é pequena demais: a matéria fica "Sem rank". */
export const MINIMO_QUESTOES_RANK = 10;

/**
 * % mínimo de cada rank, do Bronze I ao Diamante III: abaixo de 50% (chute no
 * C/E) é Bronze I; de 5 em 5 pontos até o Ouro III (85%) e mais apertado no
 * Diamante — 88%, 91% e 95%, o topo.
 */
const MINIMOS = [0, 50, 55, 60, 65, 70, 75, 80, 85, 88, 91, 95];

/** A escada inteira: "Sem rank" e 4 tiers com I, II e III — 12 ranks. */
export const RANKS: readonly Rank[] = (
  [
    { nome: "Sem rank", tier: null, divisao: 0 },
    ...COM_DIVISOES.flatMap((tier) =>
      ROMANOS.map((r, i) => ({ nome: `${tier.nome} ${r}`, tier, divisao: (i + 1) as Rank["divisao"] }))
    ),
  ] as Omit<Rank, "nivel" | "minimo">[]
).map((r, nivel) => ({ ...r, nivel, minimo: nivel === 0 ? 0 : MINIMOS[nivel - 1] }));

/** % mínimo para entrar em cada tier (o do rank I dele). */
export function minimoDoTier(tier: TierRank): number {
  return RANKS.find((r) => r.tier === tier)!.minimo;
}

/** O rank de um % de acerto (0–100); `null` = sem questões suficientes. */
export function rankPorAcerto(pct: number | null): Rank {
  if (pct === null) return RANKS[0];
  for (let i = RANKS.length - 1; i > 0; i--) if (pct >= RANKS[i].minimo) return RANKS[i];
  return RANKS[1];
}

export interface DesempenhoCiclo {
  /** Questões na janela (até 50). */
  total: number;
  acertos: number;
  /** % de acerto na janela; nulo abaixo do mínimo de questões. */
  pct: number | null;
  rank: Rank;
}

/**
 * O desempenho de cada matéria nas últimas 50 questões e o rank que ele dá.
 * Registro de assunto conta para a matéria do assunto; registro avulso, para a
 * matéria dele.
 */
export function desempenhoDoCiclo(
  logs: readonly QuestaoLog[],
  materiaDoTopico: ReadonlyMap<string, string>
): Map<string, DesempenhoCiclo> {
  const porMateria = new Map<string, QuestaoLog[]>();
  for (const l of logs) {
    const mid = (l.topico_id && materiaDoTopico.get(l.topico_id)) || l.materia_id;
    if (!mid) continue;
    const arr = porMateria.get(mid) ?? [];
    arr.push(l);
    porMateria.set(mid, arr);
  }
  const out = new Map<string, DesempenhoCiclo>();
  for (const [mid, arr] of porMateria) {
    const u = ultimasQuestoes(arr, JANELA_RANK);
    const pct = u.total >= MINIMO_QUESTOES_RANK ? u.pct : null;
    out.set(mid, { total: u.total, acertos: u.acertos, pct, rank: rankPorAcerto(pct) });
  }
  return out;
}

export interface ContagemCiclo {
  /** Blocos da matéria no ciclo — cada um sobe um rank. */
  blocos: number;
  feitos: number;
  minutos: number;
}

/**
 * Quantos blocos de cada matéria entraram no plano de `desde` em diante (nulo =
 * o plano inteiro), feitos ou não. Bloco sem matéria (texto livre) não conta.
 */
export function contarCiclo(
  linhas: readonly { data: string; materia_id: string | null; feita: boolean; minutos?: number | null }[],
  desde: string | null
): Map<string, ContagemCiclo> {
  const porMateria = new Map<string, ContagemCiclo>();
  for (const l of linhas) {
    if (!l.materia_id || (desde && l.data < desde)) continue;
    const c = porMateria.get(l.materia_id) ?? { blocos: 0, feitos: 0, minutos: 0 };
    c.blocos += 1;
    if (l.feita) c.feitos += 1;
    c.minutos += minutosDe(l);
    porMateria.set(l.materia_id, c);
  }
  return porMateria;
}

export interface VoltaCiclo {
  /** Voltas fechadas: todas as matérias entraram pelo menos essa quantidade de vezes. */
  completas: number;
  /** A volta em andamento (a seguinte às completas). */
  atual: number;
  /** Quantas matérias já entraram na volta em andamento. */
  naVolta: number;
}

/** Voltas do ciclo a partir de quantas vezes cada matéria entrou no plano. */
export function voltaDoCiclo(vezes: readonly number[]): VoltaCiclo {
  const completas = vezes.length ? Math.min(...vezes) : 0;
  const atual = completas + 1;
  return { completas, atual, naVolta: vezes.filter((v) => v >= atual).length };
}

/**
 * As matérias na ordem do ciclo: primeiro as da `ordem` gravada (a que você
 * arrastou), na sequência dela; as que não estão lá (matéria que entrou depois no
 * edital) vêm no fim, na ordem do edital. Id da `ordem` que não é mais matéria do
 * concurso (riscada, desvinculada) é ignorado. Sem `ordem` = ordem do edital.
 */
export function ordenarCiclo<T extends { id: string }>(
  materias: readonly T[],
  ordem: readonly string[] | null | undefined
): T[] {
  if (!ordem?.length) return [...materias];
  const pos = new Map(ordem.map((id, i) => [id, i]));
  const gravadas = materias.filter((m) => pos.has(m.id));
  gravadas.sort((a, b) => pos.get(a.id)! - pos.get(b.id)!);
  return [...gravadas, ...materias.filter((m) => !pos.has(m.id))];
}
