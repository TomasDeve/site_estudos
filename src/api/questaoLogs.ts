import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { QuestaoLog, TablesInsert } from "@/types/db";

export const PAGINA_HISTORICO = 25;

/** Todos os registros vinculados a um tópico (assunto) — para o desempenho no edital. */
export function useQuestaoLogsPorTopico() {
  return useQuery({
    queryKey: ["questao_logs", "por_topico"],
    queryFn: () =>
      fetchAll<QuestaoLog>((f, t) =>
        supabase
          .from("questao_logs")
          .select("*")
          .not("topico_id", "is", null)
          .order("data", { ascending: false })
          .order("created_at", { ascending: false })
          .range(f, t)
      ),
  });
}

/** Logs numa janela de datas (gráficos, "hoje"). */
export function useQuestaoLogsJanela(inicioISO: string, fimISO: string) {
  return useQuery({
    queryKey: ["questao_logs", "janela", inicioISO, fimISO],
    queryFn: async (): Promise<QuestaoLog[]> => {
      const { data, error } = await supabase
        .from("questao_logs")
        .select("*")
        .gte("data", inicioISO)
        .lte("data", fimISO)
        .order("data");
      if (error) throw error;
      return data;
    },
  });
}

/** Histórico completo paginado (.range) com contagem total. */
export function useQuestaoLogsHistorico(pagina: number) {
  return useQuery({
    queryKey: ["questao_logs", "historico", pagina],
    queryFn: async (): Promise<{ rows: QuestaoLog[]; total: number }> => {
      const de = pagina * PAGINA_HISTORICO;
      const { data, error, count } = await supabase
        .from("questao_logs")
        .select("*", { count: "exact" })
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .range(de, de + PAGINA_HISTORICO - 1);
      if (error) throw error;
      return { rows: data, total: count ?? 0 };
    },
  });
}

export function useCriarQuestaoLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"questao_logs">) => {
      const { error } = await supabase.from("questao_logs").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questao_logs"] }),
  });
}

export function useCriarQuestaoLogsEmLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: TablesInsert<"questao_logs">[]) => {
      const { error } = await supabase.from("questao_logs").insert(inputs);
      if (error) throw error;
      return inputs.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questao_logs"] }),
  });
}

export function useExcluirQuestaoLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questao_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questao_logs"] }),
  });
}
