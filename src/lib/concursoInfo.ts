import type { Json } from "@/types/db";

const AREA_PADRAO: Record<string, string> = {
  P1: "Conhecimentos Básicos",
  P2: "Conhecimentos Específicos",
  outros: "Outros conteúdos",
};

/**
 * Nome da área (P1/P2) conforme o edital do próprio concurso: o `estrutura` traz a
 * prova ("P1 — Objetiva") e a área ("Noções de Direito", na PC PE). Sem isso, cai
 * no padrão ("Conhecimentos Básicos"/"Específicos").
 */
export function nomeDaArea(concurso: { estrutura: Json } | undefined, area: string): string {
  if (area === "P1" || area === "P2") {
    const itens = Array.isArray(concurso?.estrutura) ? concurso.estrutura : [];
    for (const item of itens) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const prova = typeof item.prova === "string" ? item.prova.trim().toUpperCase() : "";
      const nome = typeof item.area === "string" ? item.area.trim() : "";
      if (nome && prova.startsWith(area)) return nome;
    }
  }
  return AREA_PADRAO[area] ?? area;
}

/** "pc_pe_escrivao" → "PCPEESCRIVAO": só letras e números, em maiúsculas. */
function normalizar(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "COMUM PCPE" → "PCPE"; outras etiquetas → null. */
function alvoDaEtiqueta(tag: string): string | null {
  const m = tag.trim().toUpperCase().match(/^COMUM\s+(.+)$/);
  return m ? normalizar(m[1]) : null;
}

/**
 * A etiqueta "COMUM X" aponta para o próprio concurso aberto (ex.: "COMUM PCPE"
 * vendo a PC PE)? Aí ela é redundante e fica escondida — o assunto guarda as duas
 * ("COMUM PCAL" e "COMUM PCPE") e cada concurso mostra só a do outro. Vale também
 * para outro cargo do mesmo edital: "COMUM PCPE" some no `pc_pe_escrivao`.
 */
export function etiquetaDoProprioConcurso(tag: string, slugConcurso: string): boolean {
  const alvo = alvoDaEtiqueta(tag);
  return alvo !== null && normalizar(slugConcurso).startsWith(alvo);
}

/**
 * A etiqueta "COMUM X" aponta só para concurso parado (futuro ou arquivado)?
 * Enquanto o foco é outro ela só polui a lista de assuntos — fica escondida e
 * volta sozinha quando o concurso for reativado. Etiqueta de um concurso que nem
 * está cadastrado continua aparecendo.
 */
export function etiquetaDeConcursoParado(
  tag: string,
  concursos: { slug: string; status: string }[]
): boolean {
  const alvo = alvoDaEtiqueta(tag);
  if (!alvo) return false;
  const doAlvo = concursos.filter((c) => normalizar(c.slug).startsWith(alvo));
  return doAlvo.length > 0 && doAlvo.every((c) => c.status !== "ativo");
}

/**
 * Texto de ajuda da etiqueta: "COMUM PCAL" → "…edital da PC-AL"; "COMUM PPPE" →
 * "…edital da Polícia Penal-PE"; "COMUM PMPE" → "…edital da PM-PE";
 * "COMUM CBPE" → "…edital do CBM-PE".
 */
export function ajudaDaEtiqueta(tag: string): string {
  const alvo = alvoDaEtiqueta(tag);
  if (!alvo) return tag;
  if (/^CB[A-Z]{2}$/.test(alvo)) return `Este assunto também cai no edital do CBM-${alvo.slice(2)}`;
  const nome = /^PC[A-Z]{2}$/.test(alvo)
    ? `PC-${alvo.slice(2)}`
    : /^PP[A-Z]{2}$/.test(alvo)
      ? `Polícia Penal-${alvo.slice(2)}`
      : /^PM[A-Z]{2}$/.test(alvo)
        ? `PM-${alvo.slice(2)}`
        : alvo;
  return `Este assunto também cai no edital da ${nome}`;
}
