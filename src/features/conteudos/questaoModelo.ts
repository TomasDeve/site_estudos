import type { AlternativaQC, TopicoQuestao } from "@/types/db";

/**
 * Modelo de resposta de uma questão do caderno. Há dois tipos:
 *   - "ce"       — Certo/Errado: gabarito boolean, resposta boolean.
 *   - "multipla" — A/B/C/D/E: alternativas [{letra,texto}], gabarito_letra e resposta_letra.
 * Estes helpers concentram a ramificação para o resto do app não repetir o `if tipo`.
 */

/** A questão é de múltipla escolha? (senão, é Certo/Errado). */
export function ehMultipla(q: Pick<TopicoQuestao, "tipo">): boolean {
  return q.tipo === "multipla";
}

/** Alternativas tipadas de uma múltipla escolha (tolerante a JSON malformado). */
export function alternativasDe(q: Pick<TopicoQuestao, "alternativas">): AlternativaQC[] {
  const a = q.alternativas;
  if (!Array.isArray(a)) return [];
  const out: AlternativaQC[] = [];
  for (const x of a) {
    if (!x || typeof x !== "object" || Array.isArray(x)) continue;
    const letra = (x as Record<string, unknown>).letra;
    const texto = (x as Record<string, unknown>).texto;
    if (typeof letra === "string" && typeof texto === "string") out.push({ letra, texto });
  }
  return out;
}

/** Já foi respondida? Vale para C/E (resposta) e múltipla (resposta_letra). */
export function estaResolvida(
  q: Pick<TopicoQuestao, "tipo" | "resposta" | "resposta_letra">
): boolean {
  return ehMultipla(q) ? q.resposta_letra !== null : q.resposta !== null;
}

/** O aluno acertou? Só faz sentido depois de resolvida. */
export function acertou(
  q: Pick<TopicoQuestao, "tipo" | "resposta" | "gabarito" | "resposta_letra" | "gabarito_letra">
): boolean {
  return ehMultipla(q) ? q.resposta_letra === q.gabarito_letra : q.resposta === q.gabarito;
}

/**
 * Um valor de resposta dado agora acerta a questão? Usado no momento de responder
 * (antes do refetch), para saber se a estreia entra como acerto no desempenho.
 * `valor` é boolean em C/E e a letra (string) em múltipla.
 */
export function valorAcerta(
  q: Pick<TopicoQuestao, "tipo" | "gabarito" | "gabarito_letra">,
  valor: boolean | string
): boolean {
  if (ehMultipla(q)) return typeof valor === "string" && valor === q.gabarito_letra;
  return typeof valor === "boolean" && valor === q.gabarito;
}

/** Rótulo curto do gabarito para exibição ("CERTO"/"ERRADO" ou a letra "C"). */
export function gabaritoLabel(
  q: Pick<TopicoQuestao, "tipo" | "gabarito" | "gabarito_letra">
): string {
  if (ehMultipla(q)) return q.gabarito_letra ?? "?";
  return q.gabarito ? "CERTO" : "ERRADO";
}

/** Rótulo curto da resposta do aluno ("Certo"/"Errado" ou a letra); null se não resolvida. */
export function respostaLabel(
  q: Pick<TopicoQuestao, "tipo" | "resposta" | "resposta_letra">
): string | null {
  if (ehMultipla(q)) return q.resposta_letra;
  return q.resposta === null ? null : q.resposta ? "Certo" : "Errado";
}
