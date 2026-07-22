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

/**
 * Só o índice (id/título) dos textos de um assunto — sem o `conteudo`, que num
 * texto de lei inteiro passa de 700 KB. Deixa o "Conferir na lei" escolher qual
 * texto abrir antes de baixar qualquer coisa pesada.
 */
export function useIndiceTextosDoTopico(topicoId: string | undefined) {
  return useQuery({
    queryKey: ["topico_textos", "indice", topicoId ?? null],
    enabled: !!topicoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topico_textos")
        .select("id, titulo, ordem")
        .eq("topico_id", topicoId!)
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

/** Assuntos com ao menos um texto salvo — decide se o "Conferir na lei" aparece. */
export function useTopicosComLei() {
  return useQuery({
    queryKey: ["topico_textos", "com-lei"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topico_textos")
        .select("topico_id")
        .not("topico_id", "is", null);
      if (error) throw error;
      return new Set(data.map((t) => t.topico_id as string));
    },
  });
}

/**
 * Um texto inteiro, com o conteúdo. Fica fora da chave que o salvamento
 * automático do leitor invalida — assim digitar não rebaixa centenas de KB a
 * cada gravação.
 *
 * `gcTime: 0` é o que impede perder marcação: sem cache guardado, reabrir o
 * leitor sempre espera a versão do banco. Servir uma cópia velha faria o editor
 * carregar o HTML de antes e o salvamento seguinte regravaria por cima do que
 * você tinha acabado de marcar.
 */
export function useTexto(id: string | undefined) {
  return useQuery({
    queryKey: ["texto-lei", id ?? null],
    enabled: !!id,
    gcTime: 0,
    staleTime: 0,
    // Com o leitor aberto o dono do conteúdo é o editor: rebaixar o texto ao
    // voltar para a janela só gastaria banda.
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<TopicoTexto> => {
      const { data, error } = await supabase
        .from("topico_textos")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as TopicoTexto;
    },
  });
}

/**
 * Anexa um trecho (HTML) ao fim do resumo rápido de um destino, criando a
 * linha se ainda não existir. Usado pelo "Adicionar ao resumo" das questões
 * quando o bloco de resumo não está aberto na tela.
 */
export function useAnexarResumoQuestoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      topicoId,
      materiaId,
      html,
    }: {
      topicoId?: string;
      materiaId?: string;
      html: string;
    }) => {
      let q = supabase.from("topico_textos").select("*").eq("titulo", TITULO_RESUMO_QUESTOES);
      q = topicoId
        ? q.eq("topico_id", topicoId)
        : q.eq("materia_id", materiaId!).is("topico_id", null);
      const { data, error } = await q.order("created_at").limit(1);
      if (error) throw error;

      const existente = data[0] as TopicoTexto | undefined;
      if (existente) {
        const { error: errAtualizar } = await supabase
          .from("topico_textos")
          .update({ conteudo: existente.conteudo + html })
          .eq("id", existente.id);
        if (errAtualizar) throw errAtualizar;
      } else {
        const { error: errCriar } = await supabase.from("topico_textos").insert({
          titulo: TITULO_RESUMO_QUESTOES,
          ordem: 999,
          conteudo: html,
          ...(topicoId ? { topico_id: topicoId } : { materia_id: materiaId }),
        });
        if (errCriar) throw errCriar;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_textos"] }),
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
