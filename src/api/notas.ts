import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Nota, TablesUpdate } from "@/types/db";

export function useNotas() {
  return useQuery({
    queryKey: ["notas"],
    queryFn: async (): Promise<Nota[]> => {
      const { data, error } = await supabase
        .from("notas")
        .select("*")
        .order("fixada", { ascending: false })
        .order("atualizado_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<Nota> => {
      const { data, error } = await supabase.from("notas").insert({}).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas"] }),
  });
}

export function useAtualizarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"notas">) => {
      const { error } = await supabase.from("notas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas"] }),
  });
}

export function useExcluirNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notas"] }),
  });
}
