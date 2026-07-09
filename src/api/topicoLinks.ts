import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { TablesInsert, TablesUpdate, TopicoLink } from "@/types/db";

export function useTopicoLinks() {
  return useQuery({
    queryKey: ["topico_links"],
    queryFn: () =>
      fetchAll<TopicoLink>((f, t) =>
        supabase.from("topico_links").select("*").order("created_at").range(f, t)
      ),
  });
}

export function useCriarTopicoLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"topico_links">) => {
      const { error } = await supabase.from("topico_links").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_links"] }),
  });
}

export function useAtualizarTopicoLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string } & TablesUpdate<"topico_links">) => {
      const { error } = await supabase.from("topico_links").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_links"] }),
  });
}

export function useExcluirTopicoLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topico_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_links"] }),
  });
}
