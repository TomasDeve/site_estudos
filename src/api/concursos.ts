import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Concurso, TablesInsert, TablesUpdate } from "@/types/db";

export function useConcursos() {
  return useQuery({
    queryKey: ["concursos"],
    queryFn: async (): Promise<Concurso[]> => {
      const { data, error } = await supabase
        .from("concursos")
        .select("*")
        .order("ordem")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useConcurso(id: string | undefined) {
  const { data: concursos, ...rest } = useConcursos();
  return { concurso: concursos?.find((c) => c.id === id), concursos, ...rest };
}

export function useCriarConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"concursos">) => {
      const { data, error } = await supabase.from("concursos").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concursos"] }),
  });
}

export function useAtualizarConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"concursos">) => {
      const { error } = await supabase.from("concursos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concursos"] }),
  });
}

/**
 * Grava as horas de planejamento do concurso (conteúdo/revisão). Otimista: o
 * "restante" e o total precisam reagir na hora enquanto se digita.
 */
export function useAtualizarHorasConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      horas_conteudo?: number;
      horas_revisao?: number;
    }) => {
      const { error } = await supabase.from("concursos").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["concursos"] });
      const prev = qc.getQueryData<Concurso[]>(["concursos"]);
      qc.setQueryData<Concurso[]>(["concursos"], (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concursos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["concursos"] }),
  });
}

export function useExcluirConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("concursos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["concursos"] });
      qc.invalidateQueries({ queryKey: ["concurso_materias"] });
    },
  });
}

/** Slug único a partir do nome (para concursos criados pelo usuário). */
export function slugify(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return `${base || "concurso"}_${Math.random().toString(36).slice(2, 6)}`;
}
