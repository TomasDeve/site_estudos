import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Audio, TablesInsert, TablesUpdate } from "@/types/db";

export function useAudios() {
  return useQuery({
    queryKey: ["audios"],
    queryFn: async (): Promise<Audio[]> => {
      const { data, error } = await supabase
        .from("audios")
        .select("*")
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"audios">): Promise<Audio> => {
      const { data, error } = await supabase.from("audios").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}

export function useAtualizarAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"audios">) => {
      const { error } = await supabase.from("audios").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}

export function useExcluirAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("audios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}

/**
 * Reordena os áudios de UM grupo (matéria): recebe os áudios daquele grupo na
 * nova ordem e grava `ordem` = 0..n. Não mexe nos outros grupos.
 */
export function useReordenarAudios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordenados: Audio[]) => {
      const linhas = ordenados
        .map((audio, i) => ({ audio, novaOrdem: i }))
        .filter(({ audio, novaOrdem }) => audio.ordem !== novaOrdem)
        .map(({ audio, novaOrdem }) => ({ ...audio, ordem: novaOrdem }));
      if (linhas.length === 0) return;
      const { error } = await supabase.from("audios").upsert(linhas);
      if (error) throw error;
    },
    // update otimista: só troca a `ordem` dos ids afetados. Quem ordena/agrupa
    // é a página (por matéria e depois por ordem), então não reordeno aqui.
    onMutate: async (ordenados) => {
      await qc.cancelQueries({ queryKey: ["audios"] });
      const prev = qc.getQueryData<Audio[]>(["audios"]);
      const novaOrdemPorId = new Map(ordenados.map((a, i) => [a.id, i]));
      qc.setQueryData<Audio[]>(["audios"], (old) =>
        old?.map((a) => (novaOrdemPorId.has(a.id) ? { ...a, ordem: novaOrdemPorId.get(a.id)! } : a))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["audios"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["audios"] }),
  });
}

/**
 * Grava "onde parei" (posição/duração) enquanto o vídeo toca. Não invalida a
 * query — só remenda o cache — senão a lista recarregaria e o player reiniciaria
 * a cada gravação.
 */
export function useSalvarPosicaoAudio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      posicao_seg,
      duracao_seg,
    }: {
      id: string;
      posicao_seg: number;
      duracao_seg: number;
    }) => {
      const { error } = await supabase
        .from("audios")
        .update({ posicao_seg, duracao_seg })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, { id, posicao_seg, duracao_seg }) => {
      qc.setQueryData<Audio[]>(["audios"], (old) =>
        old?.map((a) => (a.id === id ? { ...a, posicao_seg, duracao_seg } : a))
      );
    },
  });
}
