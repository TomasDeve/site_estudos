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

interface PatchMateria {
  id: string;
  nome?: string;
  icone?: string;
  tipo?: string;
  /** Blocos que a página da matéria mostra (Configurações da matéria). */
  mostrar_questoes_geral?: boolean;
  mostrar_resumos_geral?: boolean;
}

/**
 * O cache é atualizado antes da ida ao servidor: as configurações são caixas de
 * marcação controladas pelo próprio cache, e esperar a resposta faria a marca
 * voltar sozinha por um instante antes de assentar. Dando erro, desfaz.
 */
export function useAtualizarMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: PatchMateria) => {
      const { error } = await supabase.from("materias").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }: PatchMateria) => {
      await qc.cancelQueries({ queryKey: ["materias"] });
      const anteriores = qc.getQueryData<Materia[]>(["materias"]);
      qc.setQueryData<Materia[]>(["materias"], (antigas) =>
        antigas?.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
      return { anteriores };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.anteriores) qc.setQueryData(["materias"], ctx.anteriores);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["materias"] }),
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

/** Grava as horas alocadas para uma matéria do concurso, otimista. */
export function useAtualizarHorasMateria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, horas_alvo }: { id: string; horas_alvo: number }) => {
      const { error } = await supabase
        .from("concurso_materias")
        .update({ horas_alvo })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, horas_alvo }) => {
      await qc.cancelQueries({ queryKey: ["concurso_materias"] });
      const prev = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]);
      qc.setQueryData<ConcursoMateria[]>(["concurso_materias"], (old) =>
        old?.map((v) => (v.id === id ? { ...v, horas_alvo } : v))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concurso_materias"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}

/** Grava as horas de vários vínculos de uma vez (botão Distribuir), otimista. */
export function useDistribuirHorasMaterias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itens: { id: string; horas_alvo: number }[]) => {
      if (itens.length === 0) return;
      // upsert em lote pela PK: reaproveita a linha do cache trocando só as horas.
      const atuais = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]) ?? [];
      const porId = new Map(atuais.map((v) => [v.id, v]));
      const linhas = itens
        .map((it) => {
          const base = porId.get(it.id);
          return base ? { ...base, horas_alvo: it.horas_alvo } : null;
        })
        .filter((x): x is ConcursoMateria => x !== null);
      if (linhas.length === 0) return;
      const { error } = await supabase.from("concurso_materias").upsert(linhas);
      if (error) throw error;
    },
    onMutate: async (itens) => {
      await qc.cancelQueries({ queryKey: ["concurso_materias"] });
      const prev = qc.getQueryData<ConcursoMateria[]>(["concurso_materias"]);
      const mapa = new Map(itens.map((it) => [it.id, it.horas_alvo]));
      qc.setQueryData<ConcursoMateria[]>(["concurso_materias"], (old) =>
        old?.map((v) => (mapa.has(v.id) ? { ...v, horas_alvo: mapa.get(v.id)! } : v))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concurso_materias"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["concurso_materias"] }),
  });
}
