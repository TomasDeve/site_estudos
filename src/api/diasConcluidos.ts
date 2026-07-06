import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { DiaConcluido } from "@/types/db";

/** Últimos 180 dias — suficiente para streak e heatmap sem estourar o cap de 1000. */
export function useDiasConcluidos() {
  return useQuery({
    queryKey: ["dias_concluidos"],
    queryFn: async (): Promise<DiaConcluido[]> => {
      const inicio = format(subDays(new Date(), 180), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("dias_concluidos")
        .select("*")
        .gte("data", inicio)
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Streak: dias consecutivos terminando hoje (ou ontem, se hoje ainda não foi fechado).
 */
export function calcStreak(dias: DiaConcluido[] | undefined, hojeISO: string): number {
  if (!dias || dias.length === 0) return 0;
  const datas = new Set(dias.map((d) => d.data));
  const hoje = parseISO(hojeISO);
  let cursor = datas.has(hojeISO) ? hoje : subDays(hoje, 1);
  if (!datas.has(format(cursor, "yyyy-MM-dd"))) return 0;
  let streak = 0;
  while (datas.has(format(cursor, "yyyy-MM-dd"))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function diaEstaConcluido(dias: DiaConcluido[] | undefined, iso: string): boolean {
  return !!dias?.some((d) => d.data === iso);
}

/** Dias entre a primeira e a última conclusão que foram cumpridos (p/ % de constância). */
export function taxaConstancia(dias: DiaConcluido[] | undefined): number | null {
  if (!dias || dias.length < 2) return null;
  const ordenado = [...dias].sort((a, b) => a.data.localeCompare(b.data));
  const span =
    differenceInCalendarDays(parseISO(ordenado[ordenado.length - 1].data), parseISO(ordenado[0].data)) + 1;
  return Math.round((dias.length / span) * 100);
}

export function useConcluirDia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { data: string; horas_estudadas?: number | null }) => {
      const { error } = await supabase.from("dias_concluidos").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dias_concluidos"] }),
  });
}

export function useDesfazerDia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dataISO: string) => {
      const { error } = await supabase.from("dias_concluidos").delete().eq("data", dataISO);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dias_concluidos"] }),
  });
}
