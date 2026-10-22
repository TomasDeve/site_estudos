import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ConcursoMateria, PlanoHora } from "@/types/db";
import { primeiraLivre } from "@/features/metas/planoDias";
import type { ItemCiclo } from "@/features/metas/cicloFila";

/**
 * Ciclo de estudos em fila: os blocos do plano que vieram do ciclo, a partir da
 * volta gravada. Fica sob a chave do plano, então as mudanças otimistas da grade
 * (marcar feito, mover, apagar…) já repintam a fila.
 */
const KEY = ["plano_horas"];

export function useLinhasDoCiclo(voltaGravada: number) {
  return useQuery({
    queryKey: [...KEY, "ciclo", voltaGravada],
    queryFn: async (): Promise<PlanoHora[]> => {
      const { data, error } = await supabase
        .from("plano_horas")
        .select("*")
        .not("ciclo_item", "is", null)
        .gte("ciclo_volta", voltaGravada);
      if (error) throw error;
      return data;
    },
  });
}

function useRecarregar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["sessoes"] });
  };
}

/**
 * Sobe um item da fila para o dia, na primeira posição livre (lida do banco na
 * hora). Se a volta gravada já fechou, grava a volta nova no concurso.
 */
export function useSubirDoCiclo() {
  const recarregar = useRecarregar();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      concursoId: string;
      item: ItemCiclo;
      volta: number;
      voltaGravada: number;
      data: string;
      minutos: number;
      nota: string;
    }) => {
      const { data: dia, error } = await supabase.from("plano_horas").select("hora").eq("data", v.data);
      if (error) throw error;
      const hora = primeiraLivre(dia.map((d) => d.hora));
      if (hora === null) throw new Error("Esse dia já está cheio (16 blocos).");
      const { error: e2 } = await supabase.from("plano_horas").insert({
        data: v.data,
        hora,
        materia_id: v.item.materia_id,
        atividade: v.item.atividade,
        nota: v.nota,
        minutos: v.minutos,
        ciclo_item: v.item.id,
        ciclo_volta: v.volta,
      });
      if (e2) throw e2;
      if (v.volta !== v.voltaGravada) {
        const { error: e3 } = await supabase
          .from("concursos")
          .update({ ciclo_volta: v.volta })
          .eq("id", v.concursoId);
        if (e3) throw e3;
        qc.invalidateQueries({ queryKey: ["concursos"] });
      }
    },
    onSettled: recarregar,
  });
}

/** Apaga os blocos do ciclo que ficaram por fazer num dia que acabou: o item volta pra fila. */
export function useDevolverAoCiclo() {
  const recarregar = useRecarregar();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("plano_horas")
        .delete()
        .in("id", ids)
        .eq("feita", false);
      if (error) throw error;
    },
    onSettled: recarregar,
  });
}

/**
 * Grava o recado "para a próxima vez" da matéria neste concurso. Os blocos dela
 * ainda por fazer a partir do dia de estudo, sem detalhe ou com o recado antigo,
 * passam a mostrar o novo.
 */
export function useSalvarProximoEstudo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      concursoId: string;
      materiaId: string;
      texto: string;
      anterior: string;
      desde: string;
    }) => {
      const { error } = await supabase
        .from("concurso_materias")
        .update({ proximo_estudo: v.texto })
        .eq("concurso_id", v.concursoId)
        .eq("materia_id", v.materiaId);
      if (error) throw error;
      const notas = [...new Set(["", v.anterior])];
      const { error: e2 } = await supabase
        .from("plano_horas")
        .update({ nota: v.texto })
        .eq("materia_id", v.materiaId)
        .eq("feita", false)
        .gte("data", v.desde)
        .in("nota", notas);
      if (e2) throw e2;
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["concurso_materias"] });
      const prev = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]);
      qc.setQueryData<ConcursoMateria[]>(["concurso_materias"], (old) =>
        old?.map((c) =>
          c.concurso_id === v.concursoId && c.materia_id === v.materiaId
            ? { ...c, proximo_estudo: v.texto }
            : c
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concurso_materias"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["concurso_materias"] });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
