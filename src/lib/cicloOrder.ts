import type { CicloItem, ConcursoMateria } from "@/types/db";

// Peso usado para matérias sem peso definido no edital: entram DEPOIS das
// que têm peso, preservando a ordem original do edital como desempate.
const SEM_PESO = -1;

/**
 * Ordem sugerida de rodízio ("ciclo de estudos") para um concurso.
 *
 * Estratégia: intercalar Conhecimentos Básicos (P1) e Específicos (P2), sempre
 * priorizando as matérias de maior peso dentro de cada área. Assim o aluno
 * nunca estuda vários conteúdos da mesma frente em sequência e as matérias que
 * mais caem na prova aparecem no começo do ciclo. Conteúdos "outros" (ex.:
 * discursiva) entram ao final.
 *
 * Retorna os `materia_id` já na ordem do ciclo.
 */
export function sugerirOrdemCiclo(vinculos: ConcursoMateria[]): string[] {
  const porArea = (area: string) =>
    vinculos
      .filter((v) => v.area === area)
      .sort(
        (a, b) =>
          (b.peso_questoes ?? SEM_PESO) - (a.peso_questoes ?? SEM_PESO) ||
          a.ordem - b.ordem
      )
      .map((v) => v.materia_id);

  const p1 = porArea("P1");
  const p2 = porArea("P2");
  const outros = porArea("outros");

  // Zip alternando P1/P2, começando pela área que tem a matéria de maior peso.
  const ordem: string[] = [];
  const pesoTopo = (ids: string[]) =>
    ids.length === 0
      ? SEM_PESO
      : vinculos.find((v) => v.materia_id === ids[0])?.peso_questoes ?? SEM_PESO;
  let [a, b] = pesoTopo(p2) > pesoTopo(p1) ? [p2, p1] : [p1, p2];

  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) ordem.push(a[i]);
    if (i < b.length) ordem.push(b[i]);
  }
  return [...ordem, ...outros];
}

export interface EstadoCiclo {
  /** Matéria que está em "Estude agora". */
  atual: CicloItem | null;
  /** A próxima da fila efetiva (primeira reserva, se houver). */
  proxima: CicloItem | null;
  /** Fila efetiva depois da atual: reservas primeiro, depois o resto. */
  fila: CicloItem[];
  /** Matérias adiadas ("reserva"), da mais antiga para a mais recente. */
  adiadas: CicloItem[];
  /** Itens ativos (não concluídos) da volta. */
  ativos: CicloItem[];
}

/**
 * Estado de estudo do ciclo levando em conta as matérias "puladas" (reserva).
 *
 * A atual é a primeira matéria ativa NÃO adiada (na ordem do ciclo). As adiadas
 * flutuam para logo depois da atual, virando a "próxima" — e permanecem lá
 * (ordenadas pela hora em que foram adiadas) mesmo que outras sejam puladas.
 * Se todas as ativas estiverem adiadas, a atual passa a ser a reserva mais antiga.
 */
export function estadoCiclo(itens: CicloItem[]): EstadoCiclo {
  const ativos = itens.filter((i) => !i.concluido).sort((a, b) => a.ordem - b.ordem);
  const adiadas = ativos
    .filter((i) => i.adiado_em)
    .sort((a, b) =>
      a.adiado_em! < b.adiado_em! ? -1 : a.adiado_em! > b.adiado_em! ? 1 : a.ordem - b.ordem
    );
  const naoAdiadas = ativos.filter((i) => !i.adiado_em);

  const atual = naoAdiadas[0] ?? adiadas[0] ?? null;
  const fila =
    naoAdiadas.length > 0 ? [...adiadas, ...naoAdiadas.slice(1)] : adiadas.slice(1);

  return { atual, proxima: fila[0] ?? null, fila, adiadas, ativos };
}
