import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { PLANO_PADRAO } from "@/features/conteudos/metasTopico";
import type { TablesInsert, TablesUpdate, TopicoMeta } from "@/types/db";

const CHAVE = ["topico_metas"];

/** Todas as metas de assunto — a lista é pequena e serve várias telas. */
export function useTopicoMetas() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () =>
      fetchAll<TopicoMeta>((f, t) =>
        supabase.from("topico_metas").select("*").order("topico_id").order("ordem").range(f, t)
      ),
  });
}

/** Agrupa por assunto — o formato que as telas consomem. */
export function metasPorTopico(metas: TopicoMeta[] | undefined): Map<string, TopicoMeta[]> {
  const mapa = new Map<string, TopicoMeta[]>();
  for (const m of metas ?? []) {
    const arr = mapa.get(m.topico_id) ?? [];
    arr.push(m);
    mapa.set(m.topico_id, arr);
  }
  return mapa;
}

/**
 * Cria as 5 metas do plano padrão nos assuntos indicados.
 *
 * Reaplicar é inofensivo: a chave única (assunto + chave) faz o banco ignorar o
 * que já existe, então dá para jogar numa matéria inteira sem medo de duplicar.
 */
export function useAplicarPlanoPadrao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicoIds: string[]) => {
      const linhas: TablesInsert<"topico_metas">[] = topicoIds.flatMap((topico_id) =>
        PLANO_PADRAO.map((p, i) => ({
          topico_id,
          chave: p.chave,
          titulo: p.titulo,
          tipo: p.tipo,
          alvo: p.alvo,
          janela: p.janela,
          dias: p.dias,
          ordem: i,
        }))
      );
      if (linhas.length === 0) return 0;
      const { error } = await supabase
        .from("topico_metas")
        .upsert(linhas, { onConflict: "user_id,topico_id,chave", ignoreDuplicates: true });
      if (error) throw error;
      return topicoIds.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useCriarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"topico_metas">) => {
      const { error } = await supabase.from("topico_metas").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Marca/desmarca. Nas automáticas, marcar é "dar por cumprida" na marra. */
export function useToggleMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, concluida }: { id: string; concluida: boolean }) => {
      const { error } = await supabase
        .from("topico_metas")
        .update({ concluida, concluida_at: concluida ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    // update otimista: o check responde na hora
    onMutate: async ({ id, concluida }) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<TopicoMeta[]>(CHAVE);
      qc.setQueryData<TopicoMeta[]>(CHAVE, (old) =>
        old?.map((m) => (m.id === id ? { ...m, concluida } : m))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useAtualizarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"topico_metas">) => {
      const { error } = await supabase.from("topico_metas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topico_metas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
