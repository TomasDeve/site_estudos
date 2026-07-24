import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { Topico, TopicoStatus } from "@/types/db";

export function useTopicos() {
  return useQuery({
    queryKey: ["topicos"],
    queryFn: () =>
      fetchAll<Topico>((f, t) =>
        supabase.from("topicos").select("*").order("materia_id").order("ordem").range(f, t)
      ),
  });
}

/** Próximo status no ciclo de clique. */
export const CICLO_STATUS: Record<TopicoStatus, TopicoStatus> = {
  nao_estudado: "estudando",
  estudando: "concluido",
  concluido: "revisar",
  revisar: "nao_estudado",
};

export function useSetTopicoStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TopicoStatus }) => {
      const { error } = await supabase.from("topicos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    // update otimista: a bolinha muda na hora
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["topicos"] });
      const prev = qc.getQueryData<Topico[]>(["topicos"]);
      qc.setQueryData<Topico[]>(["topicos"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["topicos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["topicos"] }),
  });
}

export function useSetTopicoSeparador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, separador_apos }: { id: string; separador_apos: boolean }) => {
      const { error } = await supabase.from("topicos").update({ separador_apos }).eq("id", id);
      if (error) throw error;
    },
    // update otimista: a linha aparece/some na hora
    onMutate: async ({ id, separador_apos }) => {
      await qc.cancelQueries({ queryKey: ["topicos"] });
      const prev = qc.getQueryData<Topico[]>(["topicos"]);
      qc.setQueryData<Topico[]>(["topicos"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, separador_apos } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["topicos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["topicos"] }),
  });
}

/**
 * Reordena os tópicos de uma matéria a partir da lista já na nova ordem
 * (arrastar-e-soltar). Grava `ordem = índice` apenas nas linhas que mudaram.
 */
export function useReordenarTopicos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicosOrdenados: Topico[]) => {
      const linhas = topicosOrdenados
        .map((topico, i) => ({ topico, novaOrdem: i }))
        .filter(({ topico, novaOrdem }) => topico.ordem !== novaOrdem)
        .map(({ topico, novaOrdem }) => ({ ...topico, ordem: novaOrdem }));
      if (linhas.length === 0) return;
      const { error } = await supabase.from("topicos").upsert(linhas);
      if (error) throw error;
    },
    // update otimista: a lista reordena na hora (só mexe nos tópicos da matéria)
    onMutate: async (topicosOrdenados) => {
      await qc.cancelQueries({ queryKey: ["topicos"] });
      const prev = qc.getQueryData<Topico[]>(["topicos"]);
      const novaOrdemPorId = new Map(topicosOrdenados.map((t, i) => [t.id, i]));
      qc.setQueryData<Topico[]>(["topicos"], (old) =>
        old?.map((t) =>
          novaOrdemPorId.has(t.id) ? { ...t, ordem: novaOrdemPorId.get(t.id)! } : t
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["topicos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["topicos"] }),
  });
}

export function useCriarTopico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { materia_id: string; titulo: string; ordem: number }) => {
      const { error } = await supabase.from("topicos").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topicos"] }),
  });
}

export function useAtualizarTopico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, titulo }: { id: string; titulo: string }) => {
      const { error } = await supabase.from("topicos").update({ titulo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topicos"] }),
  });
}

export function useExcluirTopico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["topicos"] });
      qc.invalidateQueries({ queryKey: ["topico_links"] });
    },
  });
}
