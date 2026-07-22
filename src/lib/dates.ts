import { format, parseISO, differenceInCalendarDays, startOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Data de hoje no fuso local como "YYYY-MM-DD" (não usar toISOString: vira UTC). */
export function hojeISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function isoParaData(iso: string): Date {
  return parseISO(iso);
}

/** "2026-07-19" → "19/07/2026" */
export function fmtData(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(parseISO(iso), "dd/MM/yyyy");
}

/** "2026-07-19" → "dom, 19 jul" */
export function fmtDataCurta(iso: string): string {
  return format(parseISO(iso), "EEE, dd MMM", { locale: ptBR });
}

/** "2026-07-19" → "19 de julho de 2026" */
export function fmtDataLonga(iso: string): string {
  return format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Dias de hoje até a data (negativo se já passou). */
export function diasAte(iso: string): number {
  return differenceInCalendarDays(parseISO(iso), new Date());
}

/** Dias de "a" até "b" (positivo quando b vem depois). */
export function diasEntre(aISO: string, bISO: string): number {
  return differenceInCalendarDays(parseISO(bISO), parseISO(aISO));
}

/** Os 7 dias da semana atual (segunda a domingo) como ISO. */
export function semanaAtualISO(): string[] {
  const seg = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => format(addDays(seg, i), "yyyy-MM-dd"));
}

/** ISO de N dias atrás. */
export function diasAtrasISO(n: number): string {
  return format(addDays(new Date(), -n), "yyyy-MM-dd");
}

/** Minutos → "2h30" / "45min". */
export function fmtMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}
