import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type {
  QuestaoStatus,
  TablesInsert,
  TopicoQuestao,
} from "@/types/db";

/** Colunas leves o bastante para carregar as questões de todos os assuntos de uma vez. */
export type QuestaoResumo = Pick<
  TopicoQuestao,
  "id" | "topico_id" | "status" | "resposta" | "resposta_letra" | "tipo"
>;

/** Contadores por assunto na lista do edital — sem trazer enunciado nem comentário. */
export function useQuestoesResumo() {
  return useQuery({
    queryKey: ["topico_questoes", "resumo"],
    queryFn: () =>
      fetchAll<QuestaoResumo>((f, t) =>
        supabase
          .from("topico_questoes")
          .select("id,topico_id,status,resposta,resposta_letra,tipo")
          .order("topico_id")
          .range(f, t)
      ),
  });
}

/** Todas as questões de todos os assuntos — alimentam o modo misturado. */
export function useTodasQuestoes() {
  return useQuery({
    queryKey: ["topico_questoes", "todas"],
    queryFn: () =>
      fetchAll<TopicoQuestao>((f, t) =>
        supabase.from("topico_questoes").select("*").order("id").range(f, t)
      ),
  });
}

/** Questões completas de um assunto — só busca quando o painel está aberto. */
export function useTopicoQuestoes(topicoId: string | null) {
  return useQuery({
    queryKey: ["topico_questoes", "topico", topicoId],
    enabled: !!topicoId,
    queryFn: () =>
      fetchAll<TopicoQuestao>((f, t) =>
        supabase
          .from("topico_questoes")
          .select("*")
          .eq("topico_id", topicoId!)
          .order("ordem")
          .order("created_at")
          .range(f, t)
      ),
  });
}

/**
 * Grava a resposta do aluno. C/E usa `resposta` (boolean); múltipla usa
 * `respostaLetra` (a letra marcada). Ambos nulos = "refazer": devolve a questão
 * ao estado não resolvido, escondendo gabarito e comentário de novo.
 */
export function useResponderQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      resposta = null,
      respostaLetra = null,
    }: {
      id: string;
      resposta?: boolean | null;
      respostaLetra?: string | null;
    }) => {
      const resolvida = resposta !== null || respostaLetra !== null;
      const { error } = await supabase
        .from("topico_questoes")
        .update({
          resposta,
          resposta_letra: respostaLetra,
          respondida_em: resolvida ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_questoes"] }),
  });
}

export function useSetQuestaoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuestaoStatus }) => {
      const { error } = await supabase.from("topico_questoes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_questoes"] }),
  });
}

/**
 * Marca/desmarca a questão para ser reformulada futuramente pela IA. Marcar não
 * muda nada visível pro aluno agora: entra numa fila que a IA reformula depois,
 * gerando uma questão nova a partir do núcleo desta.
 */
export function useMarcarRefazer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, refazer }: { id: string; refazer: boolean }) => {
      const { error } = await supabase
        .from("topico_questoes")
        .update({ refazer })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_questoes"] }),
  });
}

export function useExcluirQuestao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topico_questoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_questoes"] }),
  });
}

/** Entrada das questões geradas pela IA (uma leva de cada vez). */
export function useCriarQuestoesEmLote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inputs: TablesInsert<"topico_questoes">[]) => {
      const { error } = await supabase.from("topico_questoes").insert(inputs);
      if (error) throw error;
      return inputs.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_questoes"] }),
  });
}
