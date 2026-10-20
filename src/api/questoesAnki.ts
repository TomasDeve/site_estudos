import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { QuestaoAnki, QuestaoAnkiStatus } from "@/types/db";

/** A marca de uma questão do resumo: já no Anki ou ignorada (sem linha = falta). */
export type MarcaAnki = Pick<QuestaoAnki, "questao_id" | "status" | "origem" | "em">;

const CHAVE = ["questoes_anki"] as const;
/** Fica sob "topico_textos": adicionar ao resumo (que invalida os textos) já recalcula. */
const CHAVE_FALTAM = ["topico_textos", "resumo-anki-faltam"] as const;

/**
 * As marcas de Anki de todas as questões do resumo — uma linha por questão marcada
 * (a importação grava sozinha; o celular do resumo marca à mão). Lista curta.
 * `staleTime: 0` porque a skill de importação grava por fora do site: ao voltar
 * para a aba, as cores já vêm atualizadas.
 */
export function useQuestoesAnki(ativo = true) {
  return useQuery({
    queryKey: CHAVE,
    enabled: ativo,
    staleTime: 0,
    queryFn: () =>
      fetchAll<MarcaAnki>((f, t) =>
        supabase
          .from("questoes_anki")
          .select("questao_id,status,origem,em")
          .order("questao_id")
          .range(f, t)
      ),
  });
}

/**
 * Quantas questões do resumo ainda faltam ir para o Anki (função no banco — não
 * baixa os resumos). É o numerozinho do menu e do botão do celular.
 */
export function useResumoAnkiFaltam(ativo = true) {
  return useQuery({
    queryKey: CHAVE_FALTAM,
    enabled: ativo,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resumo_anki_faltam");
      if (error) throw error;
      return data ?? 0;
    },
  });
}

/**
 * Marca questões do resumo à mão: `no_anki` (já virou card), `ignorada` (não vai
 * para o Anki) ou `null` (volta a faltar — apaga a marca). A cor muda na hora
 * (patch otimista) e volta atrás se o banco recusar.
 */
export function useMarcarAnki() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questaoIds,
      status,
    }: {
      questaoIds: string[];
      status: QuestaoAnkiStatus | null;
    }) => {
      if (questaoIds.length === 0) return;
      if (status === null) {
        const { error } = await supabase.from("questoes_anki").delete().in("questao_id", questaoIds);
        if (error) throw error;
        return;
      }
      const em = new Date().toISOString();
      const { error } = await supabase
        .from("questoes_anki")
        .upsert(
          questaoIds.map((questao_id) => ({ questao_id, status, origem: "site", em })),
          { onConflict: "questao_id" }
        );
      if (error) throw error;
    },
    onMutate: async ({ questaoIds, status }) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const anterior = qc.getQueryData<MarcaAnki[]>(CHAVE);
      const ids = new Set(questaoIds);
      const em = new Date().toISOString();
      qc.setQueryData<MarcaAnki[]>(CHAVE, (lista) => {
        const resto = (lista ?? []).filter((m) => !ids.has(m.questao_id));
        if (status === null) return resto;
        return [...resto, ...questaoIds.map((questao_id) => ({ questao_id, status, origem: "site", em }))];
      });
      return { anterior };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) qc.setQueryData(CHAVE, ctx.anterior);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: CHAVE });
      void qc.invalidateQueries({ queryKey: CHAVE_FALTAM });
    },
  });
}
