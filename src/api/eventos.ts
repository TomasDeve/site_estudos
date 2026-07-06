import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Evento, TablesInsert, TablesUpdate } from "@/types/db";

export function useEventos() {
  return useQuery({
    queryKey: ["eventos"],
    queryFn: async (): Promise<Evento[]> => {
      const { data, error } = await supabase.from("eventos").select("*").order("data");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"eventos">) => {
      const { error } = await supabase.from("eventos").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}

export function useAtualizarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"eventos">) => {
      const { error } = await supabase.from("eventos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}

export function useExcluirEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}
