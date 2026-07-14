import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ConcursoMateria, Materia, TablesInsert } from "@/types/db";

export function useMaterias() {
  return useQuery({
    queryKey: ["materias"],
    queryFn: async (): Promise<Materia[]> => {
      const { data, error } = await supabase.from("materias").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useConcursoMaterias() {
  return useQuery({
    queryKey: ["concurso_materias"],
    queryFn: async (): Promise<ConcursoMateria[]> => {
      const { data, error } = await supabase
        .from("concurso_materias")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });
}

/** Cria a matéria (se nova) e vincula ao concurso. */
export function useCriarMateriaNoConcurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      concursoId: string;
      area: string;
      materia: TablesInsert<"materias">;
    }) => {
      const { data: mat, error: e1 } = await supabase
        .from("materias")
        .upsert(input.materia, { onConflict: "user_id,slug" })
        .select()
        .single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("concurso_materias").upsert(
        { concurso_id: input.concursoId, materia_id: mat.id, area: input.area },
        { onConflict: "concurso_id,materia_id" }
      );
      if (e2) throw e2;
      return mat;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["materias"] });
      qc.invalidateQueries({ queryKey: ["concurso_materias"] });
    },
  });
}

/** Vincula matéria já existente do catálogo a um concurso. */
export function useVincularMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { concursoId: string; materiaId: string; area: string }) => {
      const { error } = await supabase.from("concurso_materias").upsert(
        { concurso_id: input.concursoId, materia_id: input.materiaId, area: input.area },
        { onConflict: "concurso_id,materia_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}

/** Remove a matéria DO CONCURSO (a matéria e o progresso continuam no catálogo). */
export function useDesvincularMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (concursoMateriaId: string) => {
      const { error } = await supabase
        .from("concurso_materias")
        .delete()
        .eq("id", concursoMateriaId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}

export function useAtualizarMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      nome?: string;
      icone?: string;
      tipo?: string;
    }) => {
      const { error } = await supabase.from("materias").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materias"] }),
  });
}

/** Atualiza campos do vínculo matéria↔concurso (ex.: a meta de redações). */
export function useAtualizarConcursoMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: {
      id: string;
      area?: string;
      meta?: number | null;
      peso_questoes?: number | null;
    }) => {
      const { error } = await supabase.from("concurso_materias").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}
