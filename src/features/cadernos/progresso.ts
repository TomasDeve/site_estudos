import type { Caderno, CapituloCaderno } from "@/types/db";

export type SituacaoCapitulo = "visto" | "andamento" | "falta";

export interface CapituloSituacao extends CapituloCaderno {
  /** Última página do capítulo (a véspera do próximo, ou o fim do caderno). */
  ate: number;
  situacao: SituacaoCapitulo;
}

/** Capítulos guardados no jsonb, ordenados pela página em que começam. */
export function capitulosDe(caderno: Pick<Caderno, "capitulos">): CapituloCaderno[] {
  const lista = Array.isArray(caderno.capitulos) ? (caderno.capitulos as unknown as CapituloCaderno[]) : [];
  return [...lista].sort((a, b) => a.pagina - b.pagina);
}

/**
 * Situação de cada capítulo pela última página estudada:
 * visto = já passou da última página dele; em andamento = começou e não terminou; falta = não chegou.
 */
export function situacaoDosCapitulos(
  caderno: Pick<Caderno, "capitulos" | "pagina_atual" | "total_paginas">
): CapituloSituacao[] {
  const caps = capitulosDe(caderno);
  return caps.map((c, i) => {
    const ate = i + 1 < caps.length ? caps[i + 1].pagina - 1 : caderno.total_paginas;
    const situacao: SituacaoCapitulo =
      caderno.pagina_atual >= ate ? "visto" : caderno.pagina_atual >= c.pagina ? "andamento" : "falta";
    return { ...c, ate, situacao };
  });
}

/** Porcentagem de páginas estudadas (0 a 100, arredondada). */
export function pctCaderno(caderno: Pick<Caderno, "pagina_atual" | "total_paginas">): number {
  if (caderno.total_paginas <= 0) return 0;
  return Math.round((100 * Math.min(caderno.pagina_atual, caderno.total_paginas)) / caderno.total_paginas);
}

/** Porcentagem somando as páginas de todos os cadernos. */
export function pctGeral(cadernos: Pick<Caderno, "pagina_atual" | "total_paginas">[]): number {
  const total = cadernos.reduce((s, c) => s + c.total_paginas, 0);
  if (total <= 0) return 0;
  const lidas = cadernos.reduce((s, c) => s + Math.min(c.pagina_atual, c.total_paginas), 0);
  return Math.round((100 * lidas) / total);
}
