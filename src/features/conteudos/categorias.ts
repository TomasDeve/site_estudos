import type { QuestaoCategoria } from "@/types/db";

export type Categoria = { chave: QuestaoCategoria; label: string; curto: string };

/**
 * As categorias (origem) das questões que a IA desta sessão produz. Esta lista é
 * a que aparece no seletor de destino ao importar um JSON da IA — por isso NÃO
 * inclui "real": questões reais entram pelo extrator do QConcursos, não coladas
 * à mão aqui. Para as pílulas de filtro do caderno, use `CATEGORIAS_FILTRO`.
 *
 * - `label`: nome completo (tooltip e textos).
 * - `curto`: rótulo enxuto da pílula, para caber em telas estreitas.
 */
export const CATEGORIAS: Categoria[] = [
  {
    chave: "doutrina_jurisprudencia",
    label: "Doutrina / Jurisprudência",
    curto: "Doutrina / Jurisprudência",
  },
  {
    chave: "baseada_questoes",
    label: "Questões Baseadas em Questões",
    curto: "Baseadas em Questões",
  },
  { chave: "ia", label: "Questões criadas pela IA", curto: "Criadas pela IA" },
];

/** Questões reais de prova (importadas do QConcursos). Não é produzida à mão. */
export const CATEGORIA_REAL: Categoria = {
  chave: "real",
  label: "Questões Reais",
  curto: "Reais",
};

/**
 * Ordem das pílulas de filtro por origem no caderno. As reais vêm primeiro — são
 * as mais valiosas para concurso. "Todas" continua sendo o estado "sem filtro",
 * fora desta lista. Diferente de `CATEGORIAS`, aqui entra a categoria "real".
 */
export const CATEGORIAS_FILTRO: Categoria[] = [CATEGORIA_REAL, ...CATEGORIAS];

/** Categoria default de quem não declara uma — o balde genérico "criada pela IA". */
export const CATEGORIA_PADRAO: QuestaoCategoria = "ia";

/**
 * Aceita o `categoria`/`tipo` que a IA pode carimbar no JSON e tolera sinônimos
 * (ex.: "Jurisprudência", "baseada em questões", "IA"). O que não bater cai no
 * `padrao` — que na importação é a categoria escolhida no seletor.
 */
export function normalizarCategoria(valor: unknown, padrao: QuestaoCategoria): QuestaoCategoria {
  if (typeof valor !== "string") return padrao;
  const v = valor.trim().toLowerCase();
  if (!v) return padrao;
  if (v === "doutrina_jurisprudencia" || v === "baseada_questoes" || v === "ia") {
    return v as QuestaoCategoria;
  }
  if (v.includes("doutrina") || v.includes("jurisprud")) return "doutrina_jurisprudencia";
  if (v.includes("basead")) return "baseada_questoes";
  if (v.includes("ia") || v.includes("intelig") || v.includes("criad")) return "ia";
  return padrao;
}
