import type { FiltroCelular } from "./itensResumo";

/**
 * As telas do celular do resumo, como no celular do GTA: a tela inicial (um app por
 * matéria), o app aberto (os quadradinhos das questões) e uma questão aberta.
 * `escopo` = id da matéria, ou "tudo" (as três do dock: Faltam, No Anki, Todas).
 */
export type TelaCelular =
  | { tipo: "inicio" }
  | { tipo: "app"; escopo: string; filtro: FiltroCelular }
  | { tipo: "questao"; escopo: string; filtro: FiltroCelular; questaoId: string };

export const ESCOPO_TUDO = "tudo";

const FILTROS: readonly FiltroCelular[] = ["todas", "falta", "no_anki"];

function lerFiltro(v: string | null): FiltroCelular {
  return FILTROS.includes(v as FiltroCelular) ? (v as FiltroCelular) : "todas";
}

/** A tela que a URL da página /resumo pede (?m=matéria|tudo · &f=filtro · &q=questão). */
export function telaDosParams(p: URLSearchParams): TelaCelular {
  const q = p.get("q");
  const escopo = p.get("m") || (q ? ESCOPO_TUDO : null);
  const filtro = lerFiltro(p.get("f"));
  if (q && escopo) return { tipo: "questao", escopo, filtro, questaoId: q };
  if (escopo) return { tipo: "app", escopo, filtro };
  return { tipo: "inicio" };
}

/** O contrário de `telaDosParams` — a busca (?…) da URL de uma tela. */
export function paramsDaTela(t: TelaCelular): string {
  if (t.tipo === "inicio") return "";
  const p = new URLSearchParams({ m: t.escopo });
  if (t.filtro !== "todas") p.set("f", t.filtro);
  if (t.tipo === "questao") p.set("q", t.questaoId);
  return `?${p.toString()}`;
}

/** Para onde o "voltar" leva: questão → app → tela inicial. */
export function telaPai(t: TelaCelular): TelaCelular {
  if (t.tipo === "questao") return { tipo: "app", escopo: t.escopo, filtro: t.filtro };
  return { tipo: "inicio" };
}

/**
 * "Ver no celular" (o aviso do "Adicionar ao resumo", o painel de resumos da matéria):
 * a página que tem o celular flutuante (as de questões) o puxa na hora; nas outras,
 * abre a página /resumo numa aba nova, já na questão ou na matéria.
 */
export const EVENTO_ABRIR_CELULAR = "celular-resumo:abrir";
/** Um trecho saiu do resumo pelo celular — o botão "No resumo" da questão volta a "Adicionar". */
export const EVENTO_QUESTAO_REMOVIDA = "celular-resumo:removida";

export interface PedidoCelular {
  questaoId?: string;
  materiaId?: string;
}

/** A tela que um pedido "Ver no celular" abre. */
export function telaDoPedido(p: PedidoCelular): TelaCelular {
  if (p.questaoId)
    return { tipo: "questao", escopo: p.materiaId ?? ESCOPO_TUDO, filtro: "todas", questaoId: p.questaoId };
  if (p.materiaId) return { tipo: "app", escopo: p.materiaId, filtro: "todas" };
  return { tipo: "inicio" };
}

export function abrirCelularResumo(pedido: PedidoCelular = {}) {
  const ev = new CustomEvent<PedidoCelular>(EVENTO_ABRIR_CELULAR, { detail: pedido, cancelable: true });
  // Quem tem o celular na página cancela o evento; ninguém cancelou → página própria.
  if (window.dispatchEvent(ev)) {
    window.open(`/resumo${paramsDaTela(telaDoPedido(pedido))}`, "_blank", "noopener");
  }
}

export function avisarQuestaoRemovida(questaoId: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENTO_QUESTAO_REMOVIDA, { detail: questaoId }));
}
