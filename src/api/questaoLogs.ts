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

/**
 * Registra uma questão por clique (+Acerto / +Erro) somando tudo num único
 * registro do dia (origem 'clique'). O incremento é atômico no banco, então
 * toques rápidos não se perdem. Atualiza a janela do dia de forma otimista.
 */
export function useRegistrarClique() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { data: string; materiaId: string | null; acerto: boolean }) => {
      const { data, error } = await supabase.rpc("registrar_clique_questao", {
        p_data: input.data,
        p_materia: input.materiaId,
        p_acerto: input.acerto,
      });
      if (error) throw error;
      return data as QuestaoLog;
    },
    onMutate: async (input) => {
      const key = ["questao_logs", "janela", input.data, input.data];
      await qc.cancelQueries({ queryKey: key });
      const anterior = qc.getQueryData<QuestaoLog[]>(key);
      const inc = input.acerto ? 1 : 0;
      qc.setQueryData<QuestaoLog[]>(key, (old) => {
        const rows = old ? [...old] : [];
        const alvo = (input.materiaId ?? null);
        const idx = rows.findIndex((r) => r.origem === "clique" && r.materia_id === alvo);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], total: rows[idx].total + 1, acertos: rows[idx].acertos + inc };
        } else {
          rows.push({
            id: `otimista-${input.data}-${alvo ?? "geral"}`,
            data: input.data,
            total: 1,
            acertos: inc,
            materia_id: alvo,
            materia_texto: null,
            topico_id: null,
            origem: "clique",
            created_at: new Date().toISOString(),
            user_id: "",
          });
        }
        return rows;
      });
      return { key, anterior };
    },
    onError: (_err, _input, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.anterior);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["questao_logs"] }),
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
