import type { ConcursoMateria, Materia, Topico } from "@/types/db";

export interface ProgressoMateria {
  materiaId: string;
  total: number;
  concluidos: number;
  emAndamento: number;
  pct: number;
}

/** Progresso de uma matéria a partir da lista global de tópicos. */
export function progressoMateria(materiaId: string, topicos: Topico[]): ProgressoMateria {
  const meus = topicos.filter((t) => t.materia_id === materiaId);
  const concluidos = meus.filter((t) => t.status === "concluido").length;
  const emAndamento = meus.filter(
    (t) => t.status === "estudando" || t.status === "revisar"
  ).length;
  return {
    materiaId,
    total: meus.length,
    concluidos,
    emAndamento,
    pct: meus.length === 0 ? 0 : Math.round((concluidos / meus.length) * 100),
  };
}

export interface ProgressoConcurso {
  total: number;
  concluidos: number;
  pct: number;
  porArea: Record<string, { total: number; concluidos: number; pct: number }>;
}

/** Progresso do edital de um concurso (tópicos das matérias vinculadas). */
export function progressoConcurso(
  concursoId: string,
  vinculos: ConcursoMateria[],
  topicos: Topico[]
): ProgressoConcurso {
  const meusVinculos = vinculos.filter((v) => v.concurso_id === concursoId);
  const porArea: ProgressoConcurso["porArea"] = {};
  let total = 0;
  let concluidos = 0;
  for (const v of meusVinculos) {
    const p = progressoMateria(v.materia_id, topicos);
    total += p.total;
    concluidos += p.concluidos;
    const area = (porArea[v.area] ??= { total: 0, concluidos: 0, pct: 0 });
    area.total += p.total;
    area.concluidos += p.concluidos;
  }
  for (const a of Object.values(porArea)) {
    a.pct = a.total === 0 ? 0 : Math.round((a.concluidos / a.total) * 100);
  }
  return {
    total,
    concluidos,
    pct: total === 0 ? 0 : Math.round((concluidos / total) * 100),
    porArea,
  };
}

/** Matérias usadas por 2+ concursos ("comuns"): progresso vale para todos. */
export function materiasComuns(vinculos: ConcursoMateria[]): Set<string> {
  const contagem = new Map<string, number>();
  for (const v of vinculos) {
    contagem.set(v.materia_id, (contagem.get(v.materia_id) ?? 0) + 1);
  }
  return new Set([...contagem.entries()].filter(([, n]) => n > 1).map(([id]) => id));
}

export function nomeMateria(materiaId: string, materias: Materia[]): string {
  return materias.find((m) => m.id === materiaId)?.nome ?? "—";
}

/**
 * Tópicos visíveis dentro de um concurso.
 *
 * A matéria é única e compartilhada; cada concurso cobra um recorte do edital.
 * Quando o vínculo concurso↔matéria tem `topicos_incluidos`, só esses tópicos
 * entram naquele concurso (o progresso/as questões continuam compartilhados,
 * porque é a MESMA linha de tópico usada nos outros concursos). Sem recorte:
 * no Concurso Indefinido (`somente_nucleo`) entram só os `nucleo_comum`; nos
 * demais, a matéria inteira.
 *
 * `vinculos` é a lista de concurso_materias (pode ser a global — filtra pelo
 * id do concurso internamente). Se omitida, mantém o comportamento antigo.
 */
export function topicosDoConcurso(
  topicos: Topico[],
  concurso: { id: string; somente_nucleo: boolean },
  vinculos?: ConcursoMateria[]
): Topico[] {
  if (!vinculos) {
    return concurso.somente_nucleo ? topicos.filter((t) => t.nucleo_comum) : topicos;
  }
  // Matéria -> conjunto de tópicos incluídos (null = matéria inteira) neste concurso.
  const inclusaoPorMateria = new Map<string, Set<string> | null>();
  for (const v of vinculos) {
    if (v.concurso_id !== concurso.id) continue;
    inclusaoPorMateria.set(v.materia_id, v.topicos_incluidos ? new Set(v.topicos_incluidos) : null);
  }
  return topicos.filter((t) => {
    if (!inclusaoPorMateria.has(t.materia_id)) return false; // matéria não é deste concurso
    const incluidos = inclusaoPorMateria.get(t.materia_id);
    if (incluidos) return incluidos.has(t.id); // recorte explícito do edital
    return concurso.somente_nucleo ? t.nucleo_comum : true;
  });
}

/**
 * Ordena os tópicos de uma matéria conforme o recorte do concurso: se o vínculo
 * tem `topicos_incluidos`, segue exatamente a ordem desse array (ordem do
 * edital daquele concurso); senão, cai na ordem natural (campo `ordem`).
 */
export function ordenarTopicosDoVinculo(
  topicos: Topico[],
  incluidos: string[] | null | undefined
): Topico[] {
  if (incluidos && incluidos.length > 0) {
    const posicao = new Map(incluidos.map((id, i) => [id, i]));
    return [...topicos].sort(
      (a, b) => (posicao.get(a.id) ?? 1e9) - (posicao.get(b.id) ?? 1e9)
    );
  }
  return [...topicos].sort(
    (a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)
  );
}
