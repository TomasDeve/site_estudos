/**
 * Nota da discursiva pela fórmula do Cebraspe: NPD = NC − 6 × NE ÷ TL.
 * NC fica limitado a [0, notaMax]; nota negativa vira zero. Devolve null enquanto
 * faltar algum dos três números (ou se TL não for positivo).
 */
export function notaCebraspe(
  nc: number | null,
  ne: number | null,
  tl: number | null,
  notaMax: number
): number | null {
  if (nc == null || ne == null || tl == null || tl <= 0 || ne < 0) return null;
  const conteudo = Math.min(Math.max(nc, 0), notaMax);
  const npd = conteudo - (6 * ne) / tl;
  return npd <= 0 ? 0 : Math.round(npd * 100) / 100;
}
