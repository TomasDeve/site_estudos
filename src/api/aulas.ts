import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Aula, TablesInsert, TablesUpdate } from "@/types/db";

const CHAVE = ["aulas"];

/** Todas as aulas guardadas (para assistir e concluídas). */
export function useAulas() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async (): Promise<Aula[]> => {
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarAula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"aulas">): Promise<Aula> => {
      const { data, error } = await supabase.from("aulas").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/**
 * Atualiza uma aula (título, link, matéria, onde parou, concluída). Remenda o cache
 * na hora para o campo "Parei em" e a caixinha de concluída responderem sem esperar.
 */
export function useAtualizarAula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"aulas">) => {
      const { error } = await supabase.from("aulas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<Aula[]>(CHAVE);
      qc.setQueryData<Aula[]>(CHAVE, (old) => old?.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirAula() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("aulas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
