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

/**
 * Grava o espaço "Estudo" da matéria (como estou estudando / o que fazer agora)
 * e carimba a data. Escreve direto no cache em vez de invalidar: o editor salva
 * sozinho a cada pausa da digitação, e recarregar o catálogo inteiro a cada
 * gravação só faria o texto do servidor brigar com o que está sendo digitado.
 */
export function useSalvarEstudoMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estudo }: { id: string; estudo: string }) => {
      const estudo_em = new Date().toISOString();
      const { error } = await supabase.from("materias").update({ estudo, estudo_em }).eq("id", id);
      if (error) throw error;
      return { id, estudo, estudo_em };
    },
    onSuccess: ({ id, estudo, estudo_em }) => {
      qc.setQueryData<Materia[]>(["materias"], (antigas) =>
        antigas?.map((m) => (m.id === id ? { ...m, estudo, estudo_em } : m))
      );
    },
  });
}

/**
 * Grava QUAIS tópicos da matéria entram neste concurso (recorte do edital), na
 * ordem de exibição. `null` = a matéria inteira. Otimista: a lista de assuntos
 * reage na hora (marcar/desmarcar, arrastar). Serve tanto para o modal de
 * seleção quanto para reordenar dentro do concurso.
 */
export function useSetTopicosIncluidos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      topicos_incluidos,
    }: {
      id: string;
      topicos_incluidos: string[] | null;
    }) => {
      const { error } = await supabase
        .from("concurso_materias")
        .update({ topicos_incluidos })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, topicos_incluidos }) => {
      await qc.cancelQueries({ queryKey: ["concurso_materias"] });
      const prev = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]);
      qc.setQueryData<ConcursoMateria[]>(["concurso_materias"], (old) =>
        old?.map((v) => (v.id === id ? { ...v, topicos_incluidos } : v))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concurso_materias"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}

/**
 * Risca / desrisca a MATÉRIA inteira neste concurso (estratégia: "não vou
 * estudar isso"). Fica visível riscada, mas sai do progresso, do rateio de horas
 * e é pulada no ciclo. É por vínculo (concurso↔matéria), então não afeta os
 * outros concursos que usam a mesma matéria. Otimista.
 */
export function useRiscarMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, riscada }: { id: string; riscada: boolean }) => {
      const { error } = await supabase.from("concurso_materias").update({ riscada }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, riscada }) => {
      await qc.cancelQueries({ queryKey: ["concurso_materias"] });
      const prev = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]);
      qc.setQueryData<ConcursoMateria[]>(["concurso_materias"], (old) =>
        old?.map((v) => (v.id === id ? { ...v, riscada } : v))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concurso_materias"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}

/**
 * Risca / desrisca um ASSUNTO (tópico) da matéria neste concurso. Guarda o id no
 * array `topicos_riscados` do vínculo; o próprio hook lê a lista atual do cache e
 * só liga/desliga o id pedido. Por concurso e otimista, como o riscar da matéria.
 */
export function useRiscarTopico() {
  const qc = useQueryClient();
  const novoArray = (v: ConcursoMateria | undefined, topicoId: string, riscar: boolean) => {
    const base = new Set(v?.topicos_riscados ?? []);
    if (riscar) base.add(topicoId);
    else base.delete(topicoId);
    return [...base];
  };
  return useMutation({
    mutationFn: async ({
      vinculoId,
      topicoId,
      riscar,
    }: {
      vinculoId: string;
      topicoId: string;
      riscar: boolean;
    }) => {
      const atuais = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]) ?? [];
      const topicos_riscados = novoArray(
        atuais.find((v) => v.id === vinculoId),
        topicoId,
        riscar
      );
      const { error } = await supabase
        .from("concurso_materias")
        .update({ topicos_riscados })
        .eq("id", vinculoId);
      if (error) throw error;
    },
    onMutate: async ({ vinculoId, topicoId, riscar }) => {
      await qc.cancelQueries({ queryKey: ["concurso_materias"] });
      const prev = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]);
      qc.setQueryData<ConcursoMateria[]>(["concurso_materias"], (old) =>
        old?.map((v) =>
          v.id === vinculoId ? { ...v, topicos_riscados: novoArray(v, topicoId, riscar) } : v
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concurso_materias"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
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
      horas_alvo?: number;
    }) => {
      const { error } = await supabase.from("concurso_materias").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}
