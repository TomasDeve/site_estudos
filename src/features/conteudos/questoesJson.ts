import type { QuestaoCategoria, TablesInsert } from "@/types/db";
import { CATEGORIA_PADRAO, normalizarCategoria } from "./categorias";

/** Uma questão como a IA entrega: gabarito aceita booleano ou "C"/"E". */
export interface QuestaoJson {
  contexto?: string | null;
  enunciado: string;
  gabarito: boolean | string;
  comentario?: string | null;
  fonte?: string | null;
  /** Origem da questão; aceita sinônimos. Ausente = a categoria escolhida na importação. */
  categoria?: string | null;
  tipo?: string | null;
}

const CERTO = new Set(["c", "certo", "true", "v", "verdadeiro"]);
const ERRADO = new Set(["e", "errado", "false", "f", "falso"]);

function lerGabarito(valor: unknown, posicao: number): boolean {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "string") {
    const v = valor.trim().toLowerCase();
    if (CERTO.has(v)) return true;
    if (ERRADO.has(v)) return false;
  }
  throw new Error(`Questão ${posicao}: "gabarito" deve ser "C", "E", true ou false.`);
}

function lerTexto(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim();
  return t || null;
}

/**
 * Converte o JSON gerado pela IA em linhas prontas para o insert.
 * `ordem` continua de onde a lista atual do assunto parou.
 */
export function parsearQuestoesJson(
  texto: string,
  topicoId: string,
  ordemInicial: number,
  categoriaPadrao: QuestaoCategoria = CATEGORIA_PADRAO
): TablesInsert<"topico_questoes">[] {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error("JSON inválido. Cole a lista exatamente como a IA gerou.");
  }

  const itens = Array.isArray(bruto) ? bruto : [bruto];
  if (itens.length === 0) throw new Error("Nenhuma questão encontrada no JSON.");

  return itens.map((item, i) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`Questão ${i + 1}: era esperado um objeto.`);
    }
    const q = item as Record<string, unknown>;
    const enunciado = lerTexto(q.enunciado);
    if (!enunciado) throw new Error(`Questão ${i + 1}: "enunciado" é obrigatório.`);

    return {
      topico_id: topicoId,
      categoria: normalizarCategoria(q.categoria ?? q.tipo, categoriaPadrao),
      contexto: lerTexto(q.contexto),
      enunciado,
      gabarito: lerGabarito(q.gabarito, i + 1),
      comentario: lerTexto(q.comentario) ?? "",
      fonte: lerTexto(q.fonte),
      ordem: ordemInicial + i,
    };
  });
}
