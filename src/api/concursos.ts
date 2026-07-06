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
      qc.invalidateQueries({ queryKey: ["eventos"] });
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
