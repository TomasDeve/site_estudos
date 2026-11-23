/** Fuso em que os horários do Fingerbot valem (o mesmo do agendador no banco). */
export const FUSO = "America/Recife";

/** 0 = domingo … 6 = sábado, igual ao `extract(dow)` do Postgres. */
export const DIAS_CURTOS = ["D", "S", "T", "Q", "Q", "S", "S"];
export const DIAS_NOMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export interface HorarioAgenda {
  hora: string; // "HH:MM" ou "HH:MM:SS"
  dias: number[];
  ativo: boolean;
}

/** Dia da semana e minuto do dia "agora" no fuso de Recife. */
export function agoraNoFuso(agora: Date = new Date()): { dow: number; minuto: number } {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dow, minuto: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function minutoDaHora(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** "07:30:00" → "07:30" */
export function hhmm(hora: string): string {
  return hora.slice(0, 5);
}

/**
 * Próximo aperto entre os horários ligados: quantos dias à frente (0 = hoje) e a hora.
 * Um horário exatamente no minuto atual conta como "agora" (o agendador ainda vai rodar).
 */
export function proximoAperto(
  horarios: HorarioAgenda[],
  agora: Date = new Date()
): { emDias: number; hora: string; dow: number } | null {
  const { dow, minuto } = agoraNoFuso(agora);
  let melhor: { emDias: number; hora: string; dow: number; chave: number } | null = null;
  for (const h of horarios) {
    if (!h.ativo || !h.dias.length) continue;
    const m = minutoDaHora(h.hora);
    for (let d = 0; d < 8; d++) {
      const dia = (dow + d) % 7;
      if (!h.dias.includes(dia)) continue;
      if (d === 0 && m < minuto) continue;
      const chave = d * 1440 + m;
      if (!melhor || chave < melhor.chave) melhor = { emDias: d, hora: hhmm(h.hora), dow: dia, chave };
      break;
    }
  }
  return melhor && { emDias: melhor.emDias, hora: melhor.hora, dow: melhor.dow };
}

/** Texto curto dos dias: "Todo dia", "Seg a sex", "Fim de semana" ou "Seg, Qua, Sex". */
export function descreverDias(dias: number[]): string {
  const s = [...new Set(dias)].sort((a, b) => a - b);
  if (s.length === 7) return "Todo dia";
  if (s.join() === "1,2,3,4,5") return "Seg a sex";
  if (s.join() === "0,6") return "Fim de semana";
  const abrev = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return s.map((d) => abrev[d]).join(", ");
}
