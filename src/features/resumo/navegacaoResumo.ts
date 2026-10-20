import type { FiltroResumo } from "./itensResumo";

/**
 * As telas do quadro do resumo (a navegação do celular do GTA, sem o celular): a tela
 * inicial (um app por matéria), o app aberto (os quadradinhos das questões) e uma
 * questão aberta. `escopo` = id da matéria, ou "tudo" (os atalhos Faltam, No Anki, Todas).
 */
export type TelaResumo =
  | { tipo: "inicio" }
  | { tipo: "app"; escopo: string; filtro: FiltroResumo }
  | { tipo: "questao"; escopo: string; filtro: FiltroResumo; questaoId: string };

export const ESCOPO_TUDO = "tudo";

const FILTROS: readonly FiltroResumo[] = ["todas", "falta", "no_anki"];

function lerFiltro(v: string | null): FiltroResumo {
  return FILTROS.includes(v as FiltroResumo) ? (v as FiltroResumo) : "todas";
}

/** A tela que a URL da página /resumo pede (?m=matéria|tudo · &f=filtro · &q=questão). */
export function telaDosParams(p: URLSearchParams): TelaResumo {
  const q = p.get("q");
  const escopo = p.get("m") || (q ? ESCOPO_TUDO : null);
  const filtro = lerFiltro(p.get("f"));
  if (q && escopo) return { tipo: "questao", escopo, filtro, questaoId: q };
  if (escopo) return { tipo: "app", escopo, filtro };
  return { tipo: "inicio" };
}

/** O contrário de `telaDosParams` — a busca (?…) da URL de uma tela. */
export function paramsDaTela(t: TelaResumo): string {
  if (t.tipo === "inicio") return "";
  const p = new URLSearchParams({ m: t.escopo });
  if (t.filtro !== "todas") p.set("f", t.filtro);
  if (t.tipo === "questao") p.set("q", t.questaoId);
  return `?${p.toString()}`;
}

/** Para onde o "voltar" leva: questão → app → tela inicial. */
export function telaPai(t: TelaResumo): TelaResumo {
  if (t.tipo === "questao") return { tipo: "app", escopo: t.escopo, filtro: t.filtro };
  return { tipo: "inicio" };
}

/**
 * "Ver no quadro" (o aviso do "Adicionar ao resumo", o painel de resumos da matéria):
 * a página que tem a gaveta do quadro (as de questões) a abre na hora; nas outras,
 * abre a página /resumo numa aba nova, já na questão ou na matéria.
 */
export const EVENTO_ABRIR_QUADRO = "quadro-resumo:abrir";
/** Um trecho saiu do resumo pelo quadro — o botão "No resumo" da questão volta a "Adicionar". */
export const EVENTO_QUESTAO_REMOVIDA = "quadro-resumo:removida";

export interface PedidoQuadro {
  questaoId?: string;
  materiaId?: string;
}

/** A tela que um pedido "Ver no quadro" abre. */
export function telaDoPedido(p: PedidoQuadro): TelaResumo {
  if (p.questaoId)
    return { tipo: "questao", escopo: p.materiaId ?? ESCOPO_TUDO, filtro: "todas", questaoId: p.questaoId };
  if (p.materiaId) return { tipo: "app", escopo: p.materiaId, filtro: "todas" };
  return { tipo: "inicio" };
}

export function abrirQuadroResumo(pedido: PedidoQuadro = {}) {
  const ev = new CustomEvent<PedidoQuadro>(EVENTO_ABRIR_QUADRO, { detail: pedido, cancelable: true });
  // Quem tem a gaveta na página cancela o evento; ninguém cancelou → página própria.
  if (window.dispatchEvent(ev)) {
    window.open(`/resumo${paramsDaTela(telaDoPedido(pedido))}`, "_blank", "noopener");
  }
}

export function avisarQuestaoRemovida(questaoId: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENTO_QUESTAO_REMOVIDA, { detail: questaoId }));
}
