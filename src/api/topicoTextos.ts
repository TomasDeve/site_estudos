import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { TablesInsert, TopicoTexto } from "@/types/db";

export function useTopicoTextos() {
  return useQuery({
    queryKey: ["topico_textos"],
    queryFn: () =>
      fetchAll<TopicoTexto>((f, t) =>
        supabase
          .from("topico_textos")
          .select("*")
          .order("topico_id")
          .order("ordem")
          .order("created_at")
          .range(f, t)
      ),
  });
}

/** Título fixo do resumo criado pelo bloco flutuante das páginas de questões. */
export const TITULO_RESUMO_QUESTOES = "Resumo das questões";

/**
 * Busca só o resumo rápido de um destino (assunto ou matéria), sem baixar
 * todos os textos — os textos de lei são pesados demais para a página de questões.
 */
export function useResumoQuestoes(destino: { topicoId?: string; materiaId?: string }) {
  return useQuery({
    queryKey: ["topico_textos", "resumo-questoes", destino.topicoId ?? null, destino.materiaId ?? null],
    enabled: !!destino.topicoId || !!destino.materiaId,
    queryFn: async (): Promise<TopicoTexto | null> => {
      let q = supabase.from("topico_textos").select("*").eq("titulo", TITULO_RESUMO_QUESTOES);
      q = destino.topicoId
        ? q.eq("topico_id", destino.topicoId)
        : q.eq("materia_id", destino.materiaId!).is("topico_id", null);
      const { data, error } = await q.order("created_at").limit(1);
      if (error) throw error;
      return data[0] ?? null;
    },
  });
}

export function useCriarTopicoTexto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"topico_textos">) => {
      const { data, error } = await supabase
        .from("topico_textos")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as TopicoTexto;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_textos"] }),
  });
}

export function useAtualizarTopicoTexto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...campos
    }: { id: string } & Partial<Pick<TopicoTexto, "titulo" | "conteudo" | "marcador">>) => {
      const { error } = await supabase.from("topico_textos").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_textos"] }),
  });
}

/** Grava o "onde parei" (índice do bloco). Separado para não misturar com o salvar. */
export function useAtualizarMarcador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, marcador }: { id: string; marcador: string | null }) => {
      const { error } = await supabase.from("topico_textos").update({ marcador }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_textos"] }),
  });
}

/** Marca +1 leitura. O valor atual já está em mãos no leitor (app single-user). */
export function useRegistrarLeitura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, leituras }: { id: string; leituras: number }) => {
      const { error } = await supabase
        .from("topico_textos")
        .update({ leituras: leituras + 1 })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_textos"] }),
  });
}

export function useExcluirTopicoTexto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topico_textos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_textos"] }),
  });
}
