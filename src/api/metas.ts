import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MetaPeriodo, TablesInsert, TablesUpdate } from "@/types/db";

export function useMetas() {
  return useQuery({
    queryKey: ["metas"],
    queryFn: async (): Promise<MetaPeriodo[]> => {
      const { data, error } = await supabase
        .from("metas_periodo")
        .select("*")
        .order("data_inicio");
      if (error) throw error;
      return data;
    },
  });
}

/** Meta cuja faixa de datas contém o dia (a mais recente vence em caso de sobreposição). */
export function metaVigente(metas: MetaPeriodo[] | undefined, iso: string): MetaPeriodo | null {
  if (!metas) return null;
  const validas = metas.filter((m) => m.data_inicio <= iso && iso <= m.data_fim);
  if (validas.length === 0) return null;
  return validas.reduce((a, b) => (a.created_at > b.created_at ? a : b));
}

export function useCriarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"metas_periodo">) => {
      const { error } = await supabase.from("metas_periodo").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });
}

export function useAtualizarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"metas_periodo">) => {
      const { error } = await supabase.from("metas_periodo").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });
}

export function useExcluirMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("metas_periodo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });
}
