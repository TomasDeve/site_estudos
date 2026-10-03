import type { RegraRedacao } from "@/features/informacoes/infoConcursos";

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

/** Pedido para colar na IA junto com a foto da redação. */
export function promptCorrecao(tema: string, regra?: RegraRedacao): string {
  const linhas = [
    "Você é um corretor de redações de concurso, rigoroso e didático. Na foto anexada está a minha redação manuscrita.",
    regra ? `Prova: ${regra.descricao}.` : null,
    tema.trim() ? `Tema proposto: ${tema.trim()}.` : null,
    "",
    "1. Transcreva o texto fielmente, numerando as linhas como estão na folha.",
  ];
  if (regra?.formulaCebraspe) {
    linhas.push(
      `2. Dê a nota de conteúdo NC (0 a ${regra.notaMax}) avaliando apresentação e estrutura textuais e desenvolvimento do tema, como o Cebraspe faz. Explique o que tirou ponto.`,
      "3. Conte os erros de modalidade escrita NE (grafia, morfossintaxe e propriedade vocabular). Liste cada erro com a linha, o trecho errado e a correção.",
      "4. Conte as linhas efetivamente escritas TL.",
      `5. Calcule a nota final NPD = NC − 6 × NE ÷ TL (nota negativa vira zero). O mínimo para não ser eliminado é ${regra.minimo}.`,
      "6. Aponte os pontos fortes, os pontos fracos e 3 ações concretas para a próxima redação.",
      "",
      "Comece a resposta com uma linha no formato: NC: x | NE: y | TL: z | NPD: w"
    );
  } else {
    linhas.push(
      `2. Dê uma nota${regra ? ` de 0 a ${regra.notaMax}` : ""} explicando os critérios.`,
      "3. Liste os erros de português com a linha e a correção.",
      "4. Aponte pontos fortes, pontos fracos e 3 ações concretas para a próxima redação."
    );
  }
  return linhas.filter((l): l is string => l !== null).join("\n");
}
