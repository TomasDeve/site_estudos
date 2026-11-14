import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { RevisaoSemanalItem } from "@/types/db";

/**
 * Revisão semanal: premissas Certo/Errado sobre o que o aluno errou ou ficou em dúvida
 * nos cadernos da semana. Quem cria é a skill revisao-semanal (pelo chat, com a service
 * key); aqui o site lista por semana e matéria, responde e zera para refazer.
 */
const KEY = ["revisao_semanal_itens"];

export function useItensRevisao() {
  return useQuery({
    queryKey: KEY,
    staleTime: 0,
    queryFn: () =>
      fetchAll<RevisaoSemanalItem>((f, t) =>
        supabase
          .from("revisao_semanal_itens")
          .select("*")
          .order("semana", { ascending: false })
          .order("ordem")
          .order("id")
          .range(f, t)
      ),
  });
}

/** Quantas premissas ainda não foram respondidas (o numerozinho do menu). */
export function useRevisaoPendentes() {
  return useQuery({
    queryKey: [...KEY, "pendentes"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("revisao_semanal_itens")
        .select("id", { count: "exact", head: true })
        .is("resposta", null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function patchLista(
  lista: RevisaoSemanalItem[] | undefined,
  alvo: (i: RevisaoSemanalItem) => boolean,
  campos: Partial<RevisaoSemanalItem>
) {
  return lista?.map((i) => (alvo(i) ? { ...i, ...campos } : i));
}

/** Responde uma premissa (`resposta: null` = apagar a resposta). Atualiza na hora. */
export function useResponderRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resposta }: { id: string; resposta: boolean | null }) => {
      const { error } = await supabase
        .from("revisao_semanal_itens")
        .update({ resposta, respondida_em: resposta === null ? null : new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, resposta }) => {
      await qc.cancelQueries({ queryKey: KEY, exact: true });
      const antes = qc.getQueryData<RevisaoSemanalItem[]>(KEY);
      qc.setQueryData<RevisaoSemanalItem[]>(KEY, (l) =>
        patchLista(l, (i) => i.id === id, {
          resposta,
          respondida_em: resposta === null ? null : new Date().toISOString(),
        })
      );
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(KEY, ctx.antes);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [...KEY, "pendentes"] }),
  });
}

/** Apaga as respostas das premissas indicadas, para refazer. */
export function useZerarRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("revisao_semanal_itens")
        .update({ resposta: null, respondida_em: null })
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: KEY, exact: true });
      const antes = qc.getQueryData<RevisaoSemanalItem[]>(KEY);
      const set = new Set(ids);
      qc.setQueryData<RevisaoSemanalItem[]>(KEY, (l) =>
        patchLista(l, (i) => set.has(i.id), { resposta: null, respondida_em: null })
      );
      return { antes };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.antes) qc.setQueryData(KEY, ctx.antes);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
