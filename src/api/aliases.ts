import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MateriaAlias } from "@/types/db";

export function useAliases() {
  return useQuery({
    queryKey: ["materia_aliases"],
    queryFn: async (): Promise<MateriaAlias[]> => {
      const { data, error } = await supabase.from("materia_aliases").select("*");
      if (error) throw error;
      return data;
    },
  });
}

/** Grava os mapeamentos escolhidos no import — próximos imports auto-mapeiam. */
export function useSalvarAliases() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pares: { alias_normalizado: string; materia_id: string }[]) => {
      if (pares.length === 0) return;
      const { error } = await supabase
        .from("materia_aliases")
        .upsert(pares, { onConflict: "user_id,alias_normalizado" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materia_aliases"] }),
  });
}
