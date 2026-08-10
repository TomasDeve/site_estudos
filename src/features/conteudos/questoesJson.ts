import type { AlternativaQC, Json, QuestaoCategoria, TablesInsert } from "@/types/db";
import { CATEGORIA_PADRAO, normalizarCategoria } from "./categorias";

/**
 * Uma questão como a IA entrega. Certo/Errado usa `gabarito` ("C"/"E"/bool);
 * múltipla escolha traz `alternativas` [{letra,texto}] + `gabarito_letra`.
 */
export interface QuestaoJson {
  contexto?: string | null;
  enunciado: string;
  gabarito?: boolean | string;
  comentario?: string | null;
  fonte?: string | null;
  /** Origem da questão; aceita sinônimos. Ausente = a categoria escolhida na importação. */
  categoria?: string | null;
  tipo?: string | null;
  /** Presença de alternativas marca a questão como múltipla escolha. */
  alternativas?: unknown;
  gabarito_letra?: string | null;
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

/** Lê o array [{letra,texto}], limpando entradas malformadas. Vazio = não é múltipla. */
function lerAlternativas(valor: unknown): AlternativaQC[] {
  if (!Array.isArray(valor)) return [];
  const out: AlternativaQC[] = [];
  for (const x of valor) {
    if (!x || typeof x !== "object") continue;
    const letra = lerTexto((x as Record<string, unknown>).letra);
    const texto = lerTexto((x as Record<string, unknown>).texto);
    if (letra && texto) out.push({ letra: letra.toUpperCase(), texto });
  }
  return out;
}

/**
 * Converte o JSON gerado pela IA em linhas prontas para o insert.
 * `ordem` continua de onde a lista atual do assunto parou. Cada questão vira
 * uma linha C/E (`tipo:"ce"`) ou, se trouxer `alternativas`, uma múltipla escolha.
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

    const base = {
      topico_id: topicoId,
      categoria: normalizarCategoria(q.categoria ?? q.tipo, categoriaPadrao),
      contexto: lerTexto(q.contexto),
      enunciado,
      comentario: lerTexto(q.comentario) ?? "",
      fonte: lerTexto(q.fonte),
      ordem: ordemInicial + i,
    };

    // Múltipla escolha: tem alternativas e a letra do gabarito.
    const alternativas = lerAlternativas(q.alternativas);
    if (alternativas.length > 0) {
      const letra = lerTexto(q.gabarito_letra)?.toUpperCase() ?? null;
      if (!letra) {
        throw new Error(`Questão ${i + 1}: múltipla escolha exige "gabarito_letra" (ex.: "C").`);
      }
      if (!alternativas.some((a) => a.letra === letra)) {
        throw new Error(
          `Questão ${i + 1}: "gabarito_letra" (${letra}) não corresponde a nenhuma alternativa.`
        );
      }
      return {
        ...base,
        tipo: "multipla",
        alternativas: alternativas as unknown as Json,
        gabarito_letra: letra,
        gabarito: null,
      };
    }

    // Certo/Errado (padrão).
    return {
      ...base,
      tipo: "ce",
      gabarito: lerGabarito(q.gabarito, i + 1),
    };
  });
}
