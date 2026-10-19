import { useMemo } from "react";
import { toast } from "sonner";
import type { Materia } from "@/types/db";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useOrdemCicloPlano } from "@/api/concursos";
import { usePlanoDesde } from "@/api/planoHoras";
import { useQuestaoLogsTodos } from "@/api/questaoLogs";
import { useTopicos } from "@/api/topicos";
import {
  contarCiclo,
  desempenhoDoCiclo,
  ordenarCiclo,
  type ContagemCiclo,
  type DesempenhoCiclo,
} from "./cicloPlano";

export interface CicloDoPlano {
  /** As matérias do edital, na ordem do ciclo (a arrastada, ou a do edital). */
  materias: Materia[];
  /** Blocos de cada matéria no plano desde o início do ciclo. */
  contagem: Map<string, ContagemCiclo>;
  /** Acerto de cada matéria nas últimas 50 questões e o rank que ele dá. */
  desempenho: Map<string, DesempenhoCiclo>;
  /** Início do ciclo ("Novo ciclo"); nulo = o plano inteiro. */
  desde: string | null;
  /** A ordem do ciclo é diferente da do edital. */
  personalizada: boolean;
  /** Grava a ordem (ids em sequência); `null` volta à ordem do edital. */
  reordenar: (ids: string[] | null) => void;
}

/**
 * O ciclo das matérias do Painel: a ordem (a que você arrastou, gravada no
 * concurso, vale no PC e no celular) e quantos blocos de
 * cada matéria já entraram no plano, e o rank de cada uma (acerto nas últimas
 * 50 questões). Usado pela faixa do ciclo e pelo modal do bloco, pra os dois
 * mostrarem a mesma ordem.
 */
export function useCicloDoPlano(doEdital: Materia[]): CicloDoPlano {
  const concurso = useConcursoAtual();
  const desde = concurso.ciclo_plano_inicio ?? null;
  const { data: linhas } = usePlanoDesde(desde);
  const contagem = useMemo(() => contarCiclo(linhas ?? [], desde), [linhas, desde]);
  const salvar = useOrdemCicloPlano();
  const { data: logs } = useQuestaoLogsTodos();
  const { data: topicos } = useTopicos();
  const desempenho = useMemo(
    () => desempenhoDoCiclo(logs ?? [], new Map((topicos ?? []).map((t) => [t.id, t.materia_id]))),
    [logs, topicos]
  );

  const ordem = concurso.ciclo_plano_ordem;
  const materias = useMemo(() => ordenarCiclo(doEdital, ordem), [doEdital, ordem]);
  const personalizada = materias.some((m, i) => m.id !== doEdital[i]?.id);

  function reordenar(ids: string[] | null) {
    salvar.mutate(
      { id: concurso.id, ciclo_plano_ordem: ids },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
  }

  return { materias, contagem, desempenho, desde, personalizada, reordenar };
}
