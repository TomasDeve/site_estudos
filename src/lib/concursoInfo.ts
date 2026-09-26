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

/** "COMUM PCPE" → "PCPE"; outras etiquetas → null. */
function alvoDaEtiqueta(tag: string): string | null {
  const m = tag.trim().toUpperCase().match(/^COMUM\s+(.+)$/);
  return m ? m[1].replace(/[^A-Z0-9]/g, "") : null;
}

/**
 * A etiqueta "COMUM X" aponta para o próprio concurso aberto (ex.: "COMUM PCPE"
 * vendo a PC PE)? Aí ela é redundante e fica escondida — o assunto guarda as duas
 * ("COMUM PCAL" e "COMUM PCPE") e cada concurso mostra só a do outro.
 */
export function etiquetaDoProprioConcurso(tag: string, slugConcurso: string): boolean {
  const alvo = alvoDaEtiqueta(tag);
  return alvo !== null && alvo === slugConcurso.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Texto de ajuda da etiqueta: "COMUM PCAL" → "Este assunto também cai no edital da PC-AL". */
export function ajudaDaEtiqueta(tag: string): string {
  const alvo = alvoDaEtiqueta(tag);
  if (!alvo) return tag;
  const nome = /^PC[A-Z]{2}$/.test(alvo) ? `PC-${alvo.slice(2)}` : alvo;
  return `Este assunto também cai no edital da ${nome}`;
}
