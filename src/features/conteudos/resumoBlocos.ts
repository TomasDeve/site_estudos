/**
 * O "Adicionar ao resumo" envolve o trecho de cada questão num `<div>` marcado
 * com o id dela. Assim o botão sabe se a questão já está no resumo e o painel
 * "No resumo" consegue mostrar/editar/remover exatamente aquele trecho — sem
 * mexer no resto do que você anotou.
 */
export const ATTR_QUESTAO = "data-resumo-questao";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** Envolve o bloco (que já vem com `<hr>` + corpo) num container marcado com a questão. */
export function envolverBlocoQuestao(html: string, questaoId: string): string {
  return `<div ${ATTR_QUESTAO}="${esc(questaoId)}">${html}</div>`;
}

/** Faz o parse do HTML do resumo num container solto (fora do `.conteudo-lei`). */
function parse(conteudo: string): HTMLDivElement {
  const div = document.createElement("div");
  div.innerHTML = conteudo;
  return div;
}

/** Acha o container do trecho da questão dentro de uma raiz já parseada. */
function acharBloco(raiz: HTMLElement, questaoId: string): HTMLElement | null {
  const blocos = raiz.querySelectorAll<HTMLElement>(`[${ATTR_QUESTAO}]`);
  for (const el of blocos) {
    if (el.getAttribute(ATTR_QUESTAO) === questaoId) return el;
  }
  return null;
}

/** Ids das questões que já têm trecho neste resumo — decide o rótulo do botão. */
export function idsNoResumo(conteudo: string | null | undefined): Set<string> {
  const set = new Set<string>();
  if (!conteudo) return set;
  const blocos = parse(conteudo).querySelectorAll<HTMLElement>(`[${ATTR_QUESTAO}]`);
  for (const el of blocos) {
    const id = el.getAttribute(ATTR_QUESTAO);
    if (id) set.add(id);
  }
  return set;
}

/**
 * Corpo editável do trecho da questão: o HTML de dentro do container, já sem o
 * `<hr>` separador que abre o bloco (ele é decoração entre blocos, não conteúdo).
 * `null` se a questão não tem trecho no resumo.
 */
export function corpoBlocoQuestao(conteudo: string, questaoId: string): string | null {
  const el = acharBloco(parse(conteudo), questaoId);
  if (!el) return null;
  const clone = el.cloneNode(true) as HTMLElement;
  const primeiro = clone.firstElementChild;
  if (primeiro && primeiro.tagName === "HR") primeiro.remove();
  return clone.innerHTML;
}

/**
 * Reescreve o corpo do trecho da questão (mantendo o `<hr>` separador) e devolve
 * o resumo inteiro atualizado. `null` se o trecho não existe mais.
 */
export function substituirCorpoBlocoQuestao(
  conteudo: string,
  questaoId: string,
  novoCorpo: string
): string | null {
  const raiz = parse(conteudo);
  const el = acharBloco(raiz, questaoId);
  if (!el) return null;
  el.innerHTML = `<hr>${novoCorpo}`;
  return raiz.innerHTML;
}

/** Remove o trecho da questão do resumo. Devolve o resumo sem o bloco (ou o mesmo, se não achar). */
export function removerBlocoQuestao(conteudo: string, questaoId: string): string {
  const raiz = parse(conteudo);
  const el = acharBloco(raiz, questaoId);
  if (el) el.remove();
  return raiz.innerHTML;
}
