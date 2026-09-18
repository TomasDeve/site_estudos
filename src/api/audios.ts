import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Audio, TablesInsert, TablesUpdate } from "@/types/db";

export function useAudios() {
  return useQuery({
    queryKey: ["audios"],
    queryFn: async (): Promise<Audio[]> => {
      const { data, error } = await supabase
        .from("audios")
        .select("*")
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"audios">): Promise<Audio> => {
      const { data, error } = await supabase.from("audios").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}

export function useAtualizarAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"audios">) => {
      const { error } = await supabase.from("audios").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}

export function useExcluirAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("audios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}

/** Reordena a fila: grava a nova posição só nos áudios que mudaram de lugar. */
export function useReordenarAudios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordenados: Audio[]) => {
      const linhas = ordenados
        .map((audio, i) => ({ audio, novaOrdem: i }))
        .filter(({ audio, novaOrdem }) => audio.ordem !== novaOrdem)
        .map(({ audio, novaOrdem }) => ({ ...audio, ordem: novaOrdem }));
      if (linhas.length === 0) return;
      const { error } = await supabase.from("audios").upsert(linhas);
      if (error) throw error;
    },
    // update otimista: a fila reordena na hora, sem esperar o banco.
    onMutate: async (ordenados) => {
      await qc.cancelQueries({ queryKey: ["audios"] });
      const prev = qc.getQueryData<Audio[]>(["audios"]);
      const novaOrdemPorId = new Map(ordenados.map((a, i) => [a.id, i]));
      qc.setQueryData<Audio[]>(["audios"], (old) =>
        old
          ?.map((a) => (novaOrdemPorId.has(a.id) ? { ...a, ordem: novaOrdemPorId.get(a.id)! } : a))
          .sort((a, b) => a.ordem - b.ordem)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["audios"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}
