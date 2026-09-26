import { minutosDe } from "./planoDias";

/**
 * Ciclo das matérias (Painel, abaixo do plano): cada matéria do edital sobe um
 * nível a cada bloco dela que entra no plano, como um ranking. As classes ficam
 * escritas por inteiro para o Tailwind achá-las.
 */
export interface NivelCiclo {
  legenda: string;
  /** Borda, fundo e texto do chip da matéria. */
  chip: string;
  /** Selo com o número de vezes (o cinza não tem selo). */
  selo: string;
  /** Bolinha da legenda. */
  ponto: string;
}

/** Cinza (ainda não entrou) → verde → azul → roxo → dourado, que vale dali pra cima. */
export const NIVEIS_CICLO: readonly NivelCiclo[] = [
  {
    legenda: "ainda não entrou",
    chip: "border-dashed border-line bg-navy-900/40 text-dim",
    selo: "",
    ponto: "border border-dashed border-mut",
  },
  { legenda: "1×", chip: "border-green/50 bg-green/15 text-txt", selo: "bg-green text-navy-950", ponto: "bg-green" },
  { legenda: "2×", chip: "border-blue/50 bg-blue/15 text-txt", selo: "bg-blue text-navy-950", ponto: "bg-blue" },
  {
    legenda: "3×",
    chip: "border-[#8b7bd8]/60 bg-[#8b7bd8]/20 text-txt",
    selo: "bg-[#8b7bd8] text-navy-950",
    ponto: "bg-[#8b7bd8]",
  },
  { legenda: "4× ou mais", chip: "border-gold/60 bg-gold/15 text-txt", selo: "bg-gold text-navy-950", ponto: "bg-gold" },
];

/** O nível de uma matéria que entrou `vezes` no plano; do último em diante, fica nele. */
export function nivelDoCiclo(vezes: number): NivelCiclo {
  return NIVEIS_CICLO[Math.min(Math.max(vezes, 0), NIVEIS_CICLO.length - 1)];
}

export interface ContagemCiclo {
  /** Blocos da matéria no ciclo — cada um sobe um nível. */
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
