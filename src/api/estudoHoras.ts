import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { distribuirInteiro } from "@/lib/horas";
import type { Concurso, Topico } from "@/types/db";

/** Uma parte da distribuição: quanto foi lançado em cada assunto. */
export interface ParteEstudo {
  topicoId: string;
  minutos: number;
}

export interface RegistrarEstudoInput {
  concursoId: string;
  materiaId: string;
  /** Data ISO (YYYY-MM-DD) do estudo. */
  data: string;
  /** Tempo estudado, em minutos. */
  minutos: number;
  /** Assuntos que recebem o tempo. "Todos" = todos os assuntos da matéria no edital. */
  topicoIds: string[];
}

/**
 * Reparte o tempo estudado igualmente entre os assuntos escolhidos (em minutos),
 * abate cada fatia do saldo do assunto (`horas_estudadas`) e grava a sessão de
 * estudo — que alimenta o "Estudo hoje" e o gráfico da semana. A sessão aponta
 * para o assunto quando é um só; com vários ("Todos"), fica no nível da matéria.
 */
export function useRegistrarEstudo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarEstudoInput): Promise<ParteEstudo[]> => {
      const ids = input.topicoIds.filter(Boolean);
      const fatias = distribuirInteiro(input.minutos, ids.length);
      const partes: ParteEstudo[] = ids
        .map((topicoId, i) => ({ topicoId, minutos: fatias[i] ?? 0 }))
        .filter((p) => p.minutos > 0);

      // Abate o tempo do saldo de cada assunto (soma sobre o valor atual). O
      // valor-base vem do banco, não do cache: o update otimista já somou no
      // cache antes daqui, então ler dali contaria o tempo duas vezes.
      if (partes.length > 0) {
        const alvoIds = partes.map((p) => p.topicoId);
        const { data: base, error: e0 } = await supabase
          .from("topicos")
          .select("*")
          .in("id", alvoIds);
        if (e0) throw e0;
        const porId = new Map((base ?? []).map((t) => [t.id, t]));
        const linhas = partes
          .map(({ topicoId, minutos }) => {
            const atual = porId.get(topicoId);
            if (!atual) return null;
            const horas = Math.round((atual.horas_estudadas + minutos / 60) * 10000) / 10000;
            return { ...atual, horas_estudadas: horas };
          })
          .filter((x): x is Topico => x !== null);
        if (linhas.length > 0) {
          const { error } = await supabase.from("topicos").upsert(linhas);
          if (error) throw error;
        }
      }

      // Sessão do dia: aponta para o assunto só quando o tempo foi para um único.
      const { error: e2 } = await supabase.from("sessoes_estudo").insert({
        data: input.data,
        minutos: input.minutos,
        materia_id: input.materiaId,
        concurso_id: input.concursoId,
        topico_id: ids.length === 1 ? ids[0] : null,
        origem: "manual",
      });
      if (e2) throw e2;

      return partes;
    },
    // otimista: o saldo de cada assunto desce na hora
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["topicos"] });
      const prev = qc.getQueryData<Topico[]>(["topicos"]);
      const ids = input.topicoIds.filter(Boolean);
      const fatias = distribuirInteiro(input.minutos, ids.length);
      const somaPorId = new Map<string, number>();
      ids.forEach((id, i) => {
        const min = fatias[i] ?? 0;
        if (min > 0) somaPorId.set(id, (somaPorId.get(id) ?? 0) + min / 60);
      });
      qc.setQueryData<Topico[]>(["topicos"], (old) =>
        old?.map((t) =>
          somaPorId.has(t.id)
            ? {
                ...t,
                horas_estudadas:
                  Math.round((t.horas_estudadas + somaPorId.get(t.id)!) * 10000) / 10000,
              }
            : t
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["topicos"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["topicos"] });
      qc.invalidateQueries({ queryKey: ["sessoes"] });
    },
  });
}

export interface RegistrarRevisaoInput {
  concursoId: string;
  /** Matéria da revisão (opcional — null = revisão geral/Anki sem matéria). */
  materiaId: string | null;
  /** Data ISO (YYYY-MM-DD) da revisão. */
  data: string;
  /** Tempo revisado, em minutos. */
  minutos: number;
}

/**
 * Registra tempo de revisão (Anki) e abate do orçamento de revisão do concurso
 * (`horas_revisao_feita` sobe → o balde "Revisão · Anki" desce). Também grava a
 * sessão do dia (origem `revisao`), que soma no "Estudo hoje" e no gráfico da
 * semana — é tempo de estudo de verdade, só que na trilha de revisão.
 */
export function useRegistrarRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarRevisaoInput) => {
      const horas = input.minutos / 60;

      // Base do banco, não do cache: o update otimista já somou no cache antes
      // daqui, então ler dali contaria o tempo duas vezes.
      const { data: base, error: e0 } = await supabase
        .from("concursos")
        .select("horas_revisao_feita")
        .eq("id", input.concursoId)
        .single();
      if (e0) throw e0;
      const atual = base?.horas_revisao_feita ?? 0;
      const novo = Math.round((atual + horas) * 10000) / 10000;
      const { error: e1 } = await supabase
        .from("concursos")
        .update({ horas_revisao_feita: novo })
        .eq("id", input.concursoId);
      if (e1) throw e1;

      // Sessão do dia: revisão não aponta para assunto (topico_id nulo).
      const { error: e2 } = await supabase.from("sessoes_estudo").insert({
        data: input.data,
        minutos: input.minutos,
        materia_id: input.materiaId,
        concurso_id: input.concursoId,
        topico_id: null,
        origem: "revisao",
      });
      if (e2) throw e2;
    },
    // otimista: o balde de revisão desce na hora
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["concursos"] });
      const prev = qc.getQueryData<Concurso[]>(["concursos"]);
      const horas = input.minutos / 60;
      qc.setQueryData<Concurso[]>(["concursos"], (old) =>
        old?.map((c) =>
          c.id === input.concursoId
            ? {
                ...c,
                horas_revisao_feita:
                  Math.round(((c.horas_revisao_feita ?? 0) + horas) * 10000) / 10000,
              }
            : c
        )
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["concursos"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["concursos"] });
      qc.invalidateQueries({ queryKey: ["sessoes"] });
    },
  });
}

/** Zera o tempo estudado de vários assuntos (recomeçar a matéria), otimista. */
export function useZerarEstudoAssuntos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topicoIds: string[]) => {
      if (topicoIds.length === 0) return;
      const { error } = await supabase
        .from("topicos")
        .update({ horas_estudadas: 0 })
        .in("id", topicoIds);
      if (error) throw error;
    },
    onMutate: async (topicoIds) => {
      await qc.cancelQueries({ queryKey: ["topicos"] });
      const prev = qc.getQueryData<Topico[]>(["topicos"]);
      const alvo = new Set(topicoIds);
      qc.setQueryData<Topico[]>(["topicos"], (old) =>
        old?.map((t) => (alvo.has(t.id) ? { ...t, horas_estudadas: 0 } : t))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["topicos"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["topicos"] }),
  });
}
