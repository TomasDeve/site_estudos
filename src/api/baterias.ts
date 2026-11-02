import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { Bateria, TopicoQuestao } from "@/types/db";
import type { QuestaoResumo } from "./topicoQuestoes";

/**
 * Baterias de questões: uma prova (ou parte dela) separada para resolver de uma vez,
 * com as questões numeradas na ordem da prova (`bateria_numero`). Quem cria é a
 * importação do QConcursos (`--bateria`); aqui o site lista, corrige e apaga.
 */
export function useBaterias() {
  return useQuery({
    queryKey: ["baterias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baterias")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Bateria[];
    },
  });
}

export type QuestaoDeBateria = QuestaoResumo & Pick<TopicoQuestao, "bateria_id">;

/**
 * Só a situação das questões que estão em alguma bateria (sem enunciado) — o placar
 * de cada bateria na lista. Fica sob "topico_questoes" para a resposta dada em
 * outra tela (patch otimista) já contar aqui.
 */
export function useSituacaoBaterias() {
  return useQuery({
    queryKey: ["topico_questoes", "baterias-situacao"],
    staleTime: 0,
    queryFn: () =>
      fetchAll<QuestaoDeBateria>((f, t) =>
        supabase
          .from("topico_questoes")
          .select("id,topico_id,status,resposta,resposta_letra,tipo,gabarito,gabarito_letra,respondida_em,bateria_id")
          .not("bateria_id", "is", null)
          .order("id")
          .range(f, t)
      ),
  });
}

/** As questões de uma bateria, completas, na ordem da prova. */
export function useQuestoesDaBateria(bateriaId: string | undefined) {
  return useQuery({
    queryKey: ["topico_questoes", "bateria", bateriaId],
    enabled: !!bateriaId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topico_questoes")
        .select("*")
        .eq("bateria_id", bateriaId!)
        .order("bateria_numero");
      if (error) throw error;
      return data as TopicoQuestao[];
    },
  });
}

/** Limpa as respostas de toda a bateria, para resolver a prova de novo. */
export function useZerarBateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bateriaId: string) => {
      const { error } = await supabase
        .from("topico_questoes")
        .update({ resposta: null, resposta_letra: null, respondida_em: null })
        .eq("bateria_id", bateriaId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_questoes"] }),
  });
}

/** Apaga a bateria. As questões continuam no caderno do assunto, só perdem o número. */
export function useExcluirBateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bateriaId: string) => {
      const solta = await supabase
        .from("topico_questoes")
        .update({ bateria_id: null, bateria_numero: null })
        .eq("bateria_id", bateriaId);
      if (solta.error) throw solta.error;
      const { error } = await supabase.from("baterias").delete().eq("id", bateriaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["baterias"] });
      qc.invalidateQueries({ queryKey: ["topico_questoes"] });
    },
  });
}
