import type { QuestaoCategoria } from "@/types/db";

/**
 * As categorias (origem) das questões geradas por IA. A ordem aqui é a ordem em
 * que as pílulas de filtro aparecem no caderno. "Todas" não mora aqui — é o
 * estado "sem filtro" da tela, não um valor guardado no banco.
 *
 * - `label`: nome completo (tooltip e textos).
 * - `curto`: rótulo enxuto da pílula, para caber em telas estreitas.
 */
export const CATEGORIAS: { chave: QuestaoCategoria; label: string; curto: string }[] = [
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
