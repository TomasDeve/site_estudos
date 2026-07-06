import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CicloItem } from "@/types/db";

const KEY = ["ciclo_itens"];

export function useCicloItens() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<CicloItem[]> => {
      const { data, error } = await supabase
        .from("ciclo_itens")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });
}

/** Cria o ciclo do concurso a partir de uma lista de matérias já ordenada. */
export function useGerarCiclo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { concursoId: string; materiaIds: string[] }) => {
      const linhas = input.materiaIds.map((materia_id, i) => ({
        concurso_id: input.concursoId,
        materia_id,
        ordem: i,
      }));
      const { error } = await supabase
        .from("ciclo_itens")
        .upsert(linhas, { onConflict: "concurso_id,materia_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Marca/desmarca uma matéria como concluída na volta atual (ajusta o contador de voltas). */
export function useSetItemConcluido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item, concluido }: { item: CicloItem; concluido: boolean }) => {
      const { error } = await supabase
        .from("ciclo_itens")
        .update({
          concluido,
          concluido_at: concluido ? new Date().toISOString() : null,
          voltas: concluido ? item.voltas + 1 : Math.max(0, item.voltas - 1),
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    // update otimista: a matéria muda de estado na hora
    onMutate: async ({ item, concluido }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<CicloItem[]>(KEY);
      qc.setQueryData<CicloItem[]>(KEY, (old) =>
        old?.map((c) =>
          c.id === item.id
            ? {
                ...c,
                concluido,
                voltas: concluido ? c.voltas + 1 : Math.max(0, c.voltas - 1),
              }
            : c
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Inicia uma nova volta: zera o "concluído" de todas as matérias do concurso. */
export function useReiniciarVolta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (concursoId: string) => {
      const { error } = await supabase
        .from("ciclo_itens")
        .update({ concluido: false, concluido_at: null })
        .eq("concurso_id", concursoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Reordena o ciclo a partir da lista já na nova ordem (arrastar-e-soltar).
 * Grava `ordem = índice` apenas nas matérias cuja posição mudou.
 */
export function useReordenarCiclo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itensOrdenados: CicloItem[]) => {
      const linhas = itensOrdenados
        .map((item, i) => ({ item, novaOrdem: i }))
        .filter(({ item, novaOrdem }) => item.ordem !== novaOrdem)
        .map(({ item, novaOrdem }) => ({ ...item, ordem: novaOrdem }));
      if (linhas.length === 0) return;
      const { error } = await supabase.from("ciclo_itens").upsert(linhas);
      if (error) throw error;
    },
    onMutate: async (itensOrdenados) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<CicloItem[]>(KEY);
      const novaOrdemPorId = new Map(itensOrdenados.map((it, i) => [it.id, i]));
      qc.setQueryData<CicloItem[]>(KEY, (old) =>
        old?.map((c) =>
          novaOrdemPorId.has(c.id) ? { ...c, ordem: novaOrdemPorId.get(c.id)! } : c
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Adiciona uma matéria ao final do ciclo. */
export function useAdicionarAoCiclo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { concursoId: string; materiaId: string; ordem: number }) => {
      const { error } = await supabase.from("ciclo_itens").upsert(
        { concurso_id: input.concursoId, materia_id: input.materiaId, ordem: input.ordem },
        { onConflict: "concurso_id,materia_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Remove uma matéria do ciclo (não afeta o edital nem o progresso dos tópicos). */
export function useRemoverDoCiclo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ciclo_itens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
