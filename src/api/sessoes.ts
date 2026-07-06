import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SessaoEstudo, TablesInsert } from "@/types/db";

/** Sessões numa janela de datas (sempre consultar por janela — cap de 1000 do PostgREST). */
export function useSessoesJanela(inicioISO: string, fimISO: string) {
  return useQuery({
    queryKey: ["sessoes", inicioISO, fimISO],
    queryFn: async (): Promise<SessaoEstudo[]> => {
      const { data, error } = await supabase
        .from("sessoes_estudo")
        .select("*")
        .gte("data", inicioISO)
        .lte("data", fimISO)
        .order("data");
      if (error) throw error;
      return data;
    },
  });
}

export function minutosPorDia(sessoes: SessaoEstudo[] | undefined): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const s of sessoes ?? []) {
    mapa.set(s.data, (mapa.get(s.data) ?? 0) + s.minutos);
  }
  return mapa;
}

export function useRegistrarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"sessoes_estudo">) => {
      const { error } = await supabase.from("sessoes_estudo").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessoes"] }),
  });
}
