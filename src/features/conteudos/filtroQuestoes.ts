/**
 * Filtro por matéria e assunto da página de questões (estilo QConcursos): uma
 * entrada por matéria marcada, com os assuntos escolhidos dela. Matéria sem
 * nenhum assunto marcado = todos os assuntos da matéria. Lista vazia = sem
 * filtro (todas as questões do escopo da página).
 */
export type FiltroQuestoes = { materiaId: string; assuntos: string[] }[];

export const FILTRO_VAZIO: FiltroQuestoes = [];

/**
 * Compila o filtro num predicado rápido `(matéria, assunto) => passa?`. Serve às
 * questões e também aos logs (que podem não ter assunto: registro geral da
 * matéria só passa quando a matéria está sem recorte de assunto).
 */
export function compilarFiltro(
  f: FiltroQuestoes
): (materiaId: string | null | undefined, topicoId: string | null | undefined) => boolean {
  if (f.length === 0) return () => true;
  const porMateria = new Map(
    f.map((i) => [i.materiaId, i.assuntos.length ? new Set(i.assuntos) : null] as const)
  );
  return (materiaId, topicoId) => {
    if (!materiaId || !porMateria.has(materiaId)) return false;
    const assuntos = porMateria.get(materiaId);
    return !assuntos || (!!topicoId && assuntos.has(topicoId));
  };
}

/** Marca/desmarca uma matéria; desmarcar leva junto os assuntos dela. */
export function alternarMateria(f: FiltroQuestoes, materiaId: string): FiltroQuestoes {
  return f.some((i) => i.materiaId === materiaId)
    ? f.filter((i) => i.materiaId !== materiaId)
    : [...f, { materiaId, assuntos: [] }];
}

/**
 * Marca/desmarca um assunto. Marcar assunto de matéria ainda não escolhida já
 * escolhe a matéria. Desmarcar o último assunto mantém a matéria (volta a valer
 * a matéria inteira), como no QConcursos.
 */
export function alternarAssunto(
  f: FiltroQuestoes,
  materiaId: string,
  topicoId: string
): FiltroQuestoes {
  if (!f.some((i) => i.materiaId === materiaId)) {
    return [...f, { materiaId, assuntos: [topicoId] }];
  }
  return f.map((i) => {
    if (i.materiaId !== materiaId) return i;
    return i.assuntos.includes(topicoId)
      ? { ...i, assuntos: i.assuntos.filter((a) => a !== topicoId) }
      : { ...i, assuntos: [...i.assuntos, topicoId] };
  });
}

/** Limpa os assuntos de uma matéria (ela continua marcada, agora inteira). */
export function limparAssuntos(f: FiltroQuestoes, materiaId: string): FiltroQuestoes {
  return f.map((i) => (i.materiaId === materiaId ? { ...i, assuntos: [] } : i));
}

/**
 * Tira as entradas que não recortam nada. Com a página já presa a uma matéria
 * (`/questoes/materia/:id`), a matéria sem assunto marcado é o próprio escopo —
 * não é filtro.
 */
export function normalizarFiltro(f: FiltroQuestoes, materiaFixa?: string): FiltroQuestoes {
  if (!materiaFixa) return f;
  return f.filter((i) => i.materiaId === materiaFixa && i.assuntos.length > 0);
}

/** Chave estável do filtro (independe da ordem da marcação) — para resetar os bloquinhos. */
export function chaveFiltro(f: FiltroQuestoes): string {
  return f
    .map((i) => `${i.materiaId}:${[...i.assuntos].sort().join("+")}`)
    .sort()
    .join("|");
}

/** Minúsculas e sem acento — busca de assunto tolerante ("inquerito" acha "Inquérito"). */
export function semAcento(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
