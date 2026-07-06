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
