import type { ConcursoMateria } from "@/types/db";

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
