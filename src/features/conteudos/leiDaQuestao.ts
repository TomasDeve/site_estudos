import { TITULO_RESUMO_QUESTOES } from "@/api/topicoTextos";

/** Artigo citado na fonte da questão: "CPPM, art. 4º, I, b" → 4. Sem artigo, null. */
export function artigoDaFonte(fonte: string | null): number | null {
  const m = (fonte ?? "").match(/arts?\.?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** Faixa de artigos anunciada no título: "União (arts. 20 a 24)" → 20 a 24. */
export function faixaDoTitulo(titulo: string): { de: number; ate: number } | null {
  const m = titulo.match(/arts?\.\s*([\d\sºoª.,ae]+)/i);
  const nums = m ? [...m[1].matchAll(/\d+/g)].map(Number) : [];
  if (nums.length === 0) return null;
  return { de: Math.min(...nums), ate: Math.max(...nums) };
}

/** O resumo das questões não é lei: fica fora da escolha automática. */
export function apenasLeis<T extends { titulo: string }>(textos: T[]): T[] {
  return textos.filter((t) => t.titulo !== TITULO_RESUMO_QUESTOES);
}

/**
 * Qual texto abrir sozinho: se o assunto só tem uma lei, é ela; com várias,
 * vale a que anuncia no título a faixa do artigo da questão. Sem certeza,
 * devolve null — aí você escolhe.
 */
export function escolherTexto(
  leis: { id: string; titulo: string }[],
  artigo: number | null
): string | null {
  if (leis.length === 1) return leis[0].id;
  if (artigo != null) {
    const naFaixa = leis.filter((t) => {
      const f = faixaDoTitulo(t.titulo);
      return f && artigo >= f.de && artigo <= f.ate;
    });
    if (naFaixa.length === 1) return naFaixa[0].id;
  }
  return null;
}
