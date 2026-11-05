import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RedacaoSemana } from "@/types/db";

const CHAVE = ["redacao_semanas"] as const;

/** As semanas de redação já escolhidas (a mais recente primeiro). */
export function useSemanasRedacao() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redacao_semanas")
        .select("*")
        .order("semana", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data as RedacaoSemana[];
    },
  });
}

/** Escolhe (ou troca) o tema da semana; trocar zera os dias marcados à mão. */
export function useEscolherTemaSemana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ semana, temaId }: { semana: string; temaId: string }) => {
      const { error } = await supabase
        .from("redacao_semanas")
        .upsert({ semana, tema_id: temaId, feitos: [] }, { onConflict: "user_id,semana" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Marca ou desmarca um dia feito à mão (segunda = estudo, domingo = redação). */
export function useMarcarDiaSemana() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, feitos }: { id: string; feitos: string[] }) => {
      const { error } = await supabase.from("redacao_semanas").update({ feitos }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, feitos }) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      qc.setQueryData<RedacaoSemana[]>(CHAVE, (antes) => antes?.map((s) => (s.id === id ? { ...s, feitos } : s)));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
