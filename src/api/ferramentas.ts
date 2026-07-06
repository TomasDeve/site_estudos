import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Ferramenta, TablesInsert, TablesUpdate } from "@/types/db";

export function useFerramentas() {
  return useQuery({
    queryKey: ["ferramentas"],
    queryFn: async (): Promise<Ferramenta[]> => {
      const { data, error } = await supabase
        .from("ferramentas")
        .select("*")
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarFerramenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"ferramentas">) => {
      const { error } = await supabase.from("ferramentas").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ferramentas"] }),
  });
}

export function useAtualizarFerramenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"ferramentas">) => {
      const { error } = await supabase.from("ferramentas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ferramentas"] }),
  });
}

export function useExcluirFerramenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ferramentas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ferramentas"] }),
  });
}
