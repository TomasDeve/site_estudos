import { minutosDe } from "./planoDias";

/**
 * Ciclo das matérias (Painel, abaixo do plano): cada bloco de uma matéria que
 * entra no plano sobe ela um rank, como num jogo — Bronze I, II e III, depois
 * Prata, Ouro… até a Lenda.
 */
export interface TierRank {
  nome: string;
  /** Cor do tier (hex): pinta a linha da matéria e a insígnia. */
  cor: string;
  /** Tiers de elite: um rank só, insígnia em degradê e linha com brilho. */
  degrade?: string;
  icone: "medalha" | "escudo" | "gema" | "estrela" | "trofeu" | "coroa";
}

export interface Rank {
  /** 0 = sem rank; depois, um por bloco no plano. */
  nivel: number;
  nome: string;
  /** Nulo no "Sem rank". */
  tier: TierRank | null;
  /** I, II ou III dentro do tier; 0 = sem divisões (sem rank e elite). */
  divisao: 0 | 1 | 2 | 3;
}

const COM_DIVISOES: TierRank[] = [
  { nome: "Bronze", cor: "#c98552", icone: "medalha" },
  { nome: "Prata", cor: "#b8c4d4", icone: "medalha" },
  { nome: "Ouro", cor: "#e0a83e", icone: "medalha" },
  { nome: "Platina", cor: "#45cbbd", icone: "escudo" },
  { nome: "Esmeralda", cor: "#3fbf6f", icone: "gema" },
  { nome: "Diamante", cor: "#57a8f0", icone: "gema" },
  { nome: "Ametista", cor: "#9f7aea", icone: "gema" },
  { nome: "Rubi", cor: "#e8506e", icone: "gema" },
];

const ELITE: TierRank[] = [
  {
    nome: "Mestre",
    cor: "#d946ef",
    degrade: "linear-gradient(90deg, #9f7aea, #d946ef)",
    icone: "estrela",
  },
  {
    nome: "Grão-Mestre",
    cor: "#f97316",
    degrade: "linear-gradient(90deg, #e8506e, #f97316)",
    icone: "trofeu",
  },
  {
    nome: "Lenda",
    cor: "#facc15",
    degrade: "linear-gradient(90deg, #facc15, #f97316, #d946ef, #57a8f0)",
    icone: "coroa",
  },
];

/** Os tiers, do mais baixo ao mais alto. */
export const TIERS: readonly TierRank[] = [...COM_DIVISOES, ...ELITE];

const ROMANOS = ["I", "II", "III"] as const;

/** A escada inteira: "Sem rank", 8 tiers com I, II e III e os 3 de elite — 27 ranks. */
export const RANKS: readonly Rank[] = (
  [
    { nome: "Sem rank", tier: null, divisao: 0 },
    ...COM_DIVISOES.flatMap((tier) =>
      ROMANOS.map((r, i) => ({ nome: `${tier.nome} ${r}`, tier, divisao: (i + 1) as Rank["divisao"] }))
    ),
    ...ELITE.map((tier) => ({ nome: tier.nome, tier, divisao: 0 })),
  ] as Omit<Rank, "nivel">[]
).map((r, nivel) => ({ ...r, nivel }));

/** O rank de uma matéria que entrou `vezes` no plano; da Lenda em diante, fica nela. */
export function rankDoCiclo(vezes: number): Rank {
  return RANKS[Math.min(Math.max(vezes, 0), RANKS.length - 1)];
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
