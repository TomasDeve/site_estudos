import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { distribuirInteiro } from "@/lib/horas";
import type { Concurso, Topico } from "@/types/db";
import { inserirBlocoFeito } from "./planoHoras";

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
  /** Texto do bloco lançado no plano (ex.: o assunto ou "Estudo de conteúdo"). */
  titulo: string;
}

/**
 * Lança no plano do Painel um bloco de teoria já feito, na 1ª posição livre do
 * dia (o tempo entra no "Estudo hoje" e no gráfico pela sessão do bloco), e
 * reparte o tempo igualmente entre os assuntos escolhidos, abatendo cada fatia
 * do saldo do assunto (`horas_estudadas`). Apagar o bloco depois tira o tempo do
 * dia, mas não devolve as horas ao assunto.
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

      // O bloco primeiro: ele valida o tempo e a vaga no dia antes de abater nada.
      await inserirBlocoFeito({
        data: input.data,
        materia_id: input.materiaId,
        atividade: "teoria",
        nota: input.titulo,
        minutos: input.minutos,
      });

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
      qc.invalidateQueries({ queryKey: ["plano_horas"] });
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
  /** Texto do bloco lançado no plano quando não há matéria (ex.: "Revisão · Anki"). */
  titulo: string;
}

/**
 * Registra tempo de revisão (Anki): lança no plano do Painel um bloco de
 * revisão já feito (o tempo soma no "Estudo hoje" e no gráfico — é estudo de
 * verdade, só que na trilha de revisão) e abate do orçamento de revisão do
 * concurso (`horas_revisao_feita` sobe → o balde "Revisão · Anki" desce).
 */
export function useRegistrarRevisao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarRevisaoInput) => {
      const horas = input.minutos / 60;

      // O bloco primeiro: ele valida o tempo e a vaga no dia antes de abater nada.
      // Com matéria, o nome dela já é o título; sem, vale o texto.
      await inserirBlocoFeito({
        data: input.data,
        materia_id: input.materiaId,
        atividade: "revisao",
        nota: input.materiaId ? "" : input.titulo,
        minutos: input.minutos,
      });

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
      qc.invalidateQueries({ queryKey: ["plano_horas"] });
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
