import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AudioGrupo } from "@/types/db";

export function useAudioGrupos() {
  return useQuery({
    queryKey: ["audio_grupos"],
    queryFn: async (): Promise<AudioGrupo[]> => {
      const { data, error } = await supabase.from("audio_grupos").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });
}

/** update-or-insert de um grupo (não uso upsert por causa do materia_id nulo). */
async function upsertGrupo(materiaId: string | null, patch: { ordem?: number; aberto?: boolean }) {
  let upd = supabase.from("audio_grupos").update(patch).select("id");
  upd = materiaId ? upd.eq("materia_id", materiaId) : upd.is("materia_id", null);
  const { data, error } = await upd;
  if (error) throw error;
  if (!data || data.length === 0) {
    const { error: errIns } = await supabase
      .from("audio_grupos")
      .insert({ materia_id: materiaId, ...patch });
    if (errIns) throw errIns;
  }
}

/** Salva a nova ordem das seções (uma linha por matéria, na ordem da tela). */
export function useSalvarOrdemGrupos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordem: { materiaId: string | null; ordem: number }[]) => {
      for (const g of ordem) await upsertGrupo(g.materiaId, { ordem: g.ordem });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audio_grupos"] }),
  });
}

/** Abre/fecha a seção de uma matéria (persistente). */
export function useToggleGrupoAberto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ materiaId, aberto }: { materiaId: string | null; aberto: boolean }) => {
      await upsertGrupo(materiaId, { aberto });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audio_grupos"] }),
  });
}
