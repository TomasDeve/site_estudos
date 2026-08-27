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
 *
 * A resposta aparece na hora: fazemos um patch OTIMISTA no cache (a questão já
 * tem o resultado final — resposta, letra e `respondida_em` — sem esperar a
 * rede) e NÃO reinvalidamos o assunto. Antes, cada clique aguardava a gravação
 * e depois re-baixava todas as questões do assunto (no modo misturado, as ~3600
 * de uma vez) só pra mostrar "acertou/errou" — daí os ~10s. Como o valor otimista
 * é idêntico ao que o banco grava, não há divergência a corrigir; um refetch
 * natural (trocar de assunto, focar a aba) já re-sincroniza se preciso.
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
    onMutate: async ({ id, resposta = null, respostaLetra = null }) => {
      // Cancela refetches em voo pra não sobrescreverem o patch otimista.
      await qc.cancelQueries({ queryKey: ["topico_questoes"] });
      const anteriores = qc.getQueriesData({ queryKey: ["topico_questoes"] });
      const resolvida = resposta !== null || respostaLetra !== null;
      const respondidaEm = resolvida ? new Date().toISOString() : null;
      // Aplica em TODA lista em cache (resumo, todas, assunto): a mesma questão
      // pode estar em várias; casa pelo id e só troca os campos de resposta.
      qc.setQueriesData<{ id: string }[]>({ queryKey: ["topico_questoes"] }, (lista) => {
        if (!Array.isArray(lista)) return lista;
        let mudou = false;
        const nova = lista.map((row) => {
          if (row?.id !== id) return row;
          mudou = true;
          return { ...row, resposta, resposta_letra: respostaLetra, respondida_em: respondidaEm };
        });
        return mudou ? nova : lista;
      });
      return { anteriores };
    },
    onError: (_err, _vars, ctx) => {
      // Reverte o patch otimista se a gravação falhar.
      ctx?.anteriores?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
  });
}

type GrifosUpdate = { id: string; grifos: Record<string, [number, number][]> | null };

/**
 * Salva os grifos (sublinhados) do aluno. Recebe UMA OU VÁRIAS linhas: o grifo do
 * enunciado é de uma questão só, mas o do "Texto associado" vale para TODAS as questões
 * que compartilham aquele texto (o chamador manda a lista das irmãs). Como a resposta, o
 * patch é OTIMISTA: aparece na hora no cache e NÃO re-baixamos nada. `grifos` guarda um
 * objeto por campo — ex.: `{ texto_associado: [[12,20]], enunciado: [[0,7]] }` — onde
 * cada par é um intervalo de caracteres [início, fim) no texto daquele campo.
 */
export function useSalvarGrifos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ updates }: { updates: GrifosUpdate[] }) => {
      const res = await Promise.all(
        updates.map((u) =>
          supabase.from("topico_questoes").update({ grifos: u.grifos }).eq("id", u.id),
        ),
      );
      const falha = res.find((r) => r.error);
      if (falha?.error) throw falha.error;
    },
    onMutate: async ({ updates }) => {
      await qc.cancelQueries({ queryKey: ["topico_questoes"] });
      const anteriores = qc.getQueriesData({ queryKey: ["topico_questoes"] });
      const porId = new Map(updates.map((u) => [u.id, u.grifos]));
      // A mesma questão pode estar em várias listas em cache (resumo, todas, assunto);
      // casa pelo id e só troca `grifos`.
      qc.setQueriesData<{ id: string }[]>({ queryKey: ["topico_questoes"] }, (lista) => {
        if (!Array.isArray(lista)) return lista;
        let mudou = false;
        const nova = lista.map((row) => {
          if (!row || !porId.has(row.id)) return row;
          mudou = true;
          return { ...row, grifos: porId.get(row.id) };
        });
        return mudou ? nova : lista;
      });
      return { anteriores };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.anteriores?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
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
