/** Classe de cor da taxa de acerto: ciano excelente, verde forte, amarelo mediano, vermelho fraco. */
export function corDesempenho(pct: number) {
  if (pct >= 81) return { texto: "text-cyan", fundo: "bg-cyan/10 hover:bg-cyan/20" };
  if (pct >= 70) return { texto: "text-green", fundo: "bg-green/10 hover:bg-green/20" };
  if (pct >= 50) return { texto: "text-amber", fundo: "bg-amber/10 hover:bg-amber/20" };
  return { texto: "text-red", fundo: "bg-red/10 hover:bg-red/20" };
}
