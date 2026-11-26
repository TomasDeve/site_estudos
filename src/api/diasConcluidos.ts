import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { DiaConcluido } from "@/types/db";

/**
 * Dias fechados no antigo botão "Concluir dia" (usado até 06/11/2026). Ficam como
 * histórico da sequência e do ciclo; não se fecha mais dia por aqui.
 * Últimos 180 dias — suficiente para streak e heatmap sem estourar o cap de 1000.
 */
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

/** Chave dos dias com bloco feito: as mutações do plano a recarregam. */
export const KEY_DIAS_COM_BLOCO_FEITO = ["dias_com_bloco_feito"];

/**
 * Dias que contam na sequência 🔥: basta um bloco do plano marcado como feito
 * no dia. Os dias fechados no antigo "Concluir dia" também contam.
 */
export function useDiasDaSequencia(): ReadonlySet<string> | undefined {
  const { data: concluidos } = useDiasConcluidos();
  const { data: feitos } = useQuery({
    queryKey: KEY_DIAS_COM_BLOCO_FEITO,
    queryFn: () => {
      const inicio = format(subDays(new Date(), 180), "yyyy-MM-dd");
      return fetchAll<{ data: string }>((de, ate) =>
        supabase
          .from("plano_horas")
          .select("data")
          .eq("feita", true)
          .gte("data", inicio)
          .order("data")
          .range(de, ate)
      );
    },
  });
  return useMemo(() => {
    if (!concluidos && !feitos) return undefined;
    return new Set([...(concluidos ?? []), ...(feitos ?? [])].map((d) => d.data));
  }, [concluidos, feitos]);
}

/**
 * Streak: dias consecutivos terminando hoje (ou ontem, se hoje ainda não tem
 * nada feito).
 */
export function calcStreak(datas: ReadonlySet<string> | undefined, hojeISO: string): number {
  if (!datas || datas.size === 0) return 0;
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
