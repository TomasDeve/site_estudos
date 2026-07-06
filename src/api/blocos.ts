import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { BlocoDia, TablesInsert, TablesUpdate } from "@/types/db";

export function useBlocosDia(dataISO: string) {
  return useQuery({
    queryKey: ["blocos", dataISO],
    queryFn: async (): Promise<BlocoDia[]> => {
      const { data, error } = await supabase
        .from("blocos_dia")
        .select("*")
        .eq("data", dataISO)
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"blocos_dia">) => {
      const { error } = await supabase.from("blocos_dia").insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["blocos", v.data] }),
  });
}

export function useAtualizarBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"blocos_dia">) => {
      const { error } = await supabase.from("blocos_dia").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blocos"] }),
  });
}

export function useExcluirBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bloco: BlocoDia) => {
      // limpa a sessão gerada, se houver
      await supabase.from("sessoes_estudo").delete().eq("bloco_id", bloco.id);
      const { error } = await supabase.from("blocos_dia").delete().eq("id", bloco.id);
      if (error) throw error;
    },
    onSuccess: (_d, bloco) => {
      qc.invalidateQueries({ queryKey: ["blocos", bloco.data] });
      qc.invalidateQueries({ queryKey: ["sessoes"] });
    },
  });
}

/**
 * Marcar bloco como feito registra automaticamente uma sessão de estudo
 * (alimenta o gráfico da semana); desmarcar remove a sessão.
 */
export function useToggleBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bloco: BlocoDia) => {
      const concluido = !bloco.concluido;
      const { error } = await supabase
        .from("blocos_dia")
        .update({ concluido, concluido_at: concluido ? new Date().toISOString() : null })
        .eq("id", bloco.id);
      if (error) throw error;
      if (concluido) {
        const { error: e2 } = await supabase.from("sessoes_estudo").insert({
          data: bloco.data,
          minutos: bloco.duracao_min,
          materia_id: bloco.materia_id,
          concurso_id: bloco.concurso_id,
          origem: "bloco",
          bloco_id: bloco.id,
        });
        if (e2) throw e2;
      } else {
        const { error: e2 } = await supabase
          .from("sessoes_estudo")
          .delete()
          .eq("bloco_id", bloco.id);
        if (e2) throw e2;
      }
    },
    // otimista na lista do dia
    onMutate: async (bloco) => {
      await qc.cancelQueries({ queryKey: ["blocos", bloco.data] });
      const prev = qc.getQueryData<BlocoDia[]>(["blocos", bloco.data]);
      qc.setQueryData<BlocoDia[]>(["blocos", bloco.data], (old) =>
        old?.map((b) => (b.id === bloco.id ? { ...b, concluido: !b.concluido } : b))
      );
      return { prev, data: bloco.data };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["blocos", ctx.data], ctx.prev);
    },
    onSettled: (_d, _e, bloco) => {
      qc.invalidateQueries({ queryKey: ["blocos", bloco.data] });
      qc.invalidateQueries({ queryKey: ["sessoes"] });
    },
  });
}

/** Copia os blocos de uma data para outra (desmarcados). */
export function useCopiarBlocos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ de, para }: { de: string; para: string }) => {
      const { data, error } = await supabase
        .from("blocos_dia")
        .select("titulo, duracao_min, materia_id, concurso_id, ordem")
        .eq("data", de)
        .order("ordem");
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      const { error: e2 } = await supabase
        .from("blocos_dia")
        .insert(data.map((b) => ({ ...b, data: para })));
      if (e2) throw e2;
      return data.length;
    },
    onSuccess: (_n, v) => qc.invalidateQueries({ queryKey: ["blocos", v.para] }),
  });
}
