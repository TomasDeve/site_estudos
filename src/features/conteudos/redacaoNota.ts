/**
 * Nota da discursiva pela fórmula do Cebraspe: NPD = NC − peso × NE ÷ TL.
 * O peso é 6 na PC PE (redação de 30 pts) e 2 na Polícia Penal (10 pts).
 * NC fica limitado a [0, notaMax]; nota negativa vira zero. Devolve null enquanto
 * faltar algum dos três números (ou se TL não for positivo).
 */
export function notaCebraspe(
  nc: number | null,
  ne: number | null,
  tl: number | null,
  notaMax: number,
  pesoErro = 6
): number | null {
  if (nc == null || ne == null || tl == null || tl <= 0 || ne < 0) return null;
  const conteudo = Math.min(Math.max(nc, 0), notaMax);
  const npd = conteudo - (pesoErro * ne) / tl;
  return npd <= 0 ? 0 : Math.round(npd * 100) / 100;
}
