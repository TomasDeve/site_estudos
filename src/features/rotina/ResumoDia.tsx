import type { RotinaBloco } from "@/types/db";
import { fmtMinutos } from "@/lib/dates";
import { TIPOS, fmtHora, resumoDoDia } from "./rotinaModelo";

/** Acorda/dorme/sono e quanto do dia vai para estudo, academia… */
export function ResumoDia({ blocos, dia }: { blocos: RotinaBloco[]; dia: number }) {
  const r = resumoDoDia(blocos, dia);
  const chips: string[] = [];
  if (r.acorda !== null) chips.push(`☀️ Acorda ${fmtHora(r.acorda)}`);
  if (r.dorme !== null) chips.push(`🌙 Dorme ${fmtHora(r.dorme)}`);
  if (r.sono !== null) chips.push(`😴 ${fmtMinutos(r.sono)} de sono`);
  for (const t of ["estudo", "academia", "intervalo"] as const) {
    const m = r.porTipo.get(t);
    if (m) chips.push(`${TIPOS[t].emoji} ${fmtMinutos(m)} de ${TIPOS[t].label.toLowerCase()}`);
  }
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span key={c} className="rounded-full border border-line/50 bg-navy-900/60 px-2.5 py-1 text-[11px] text-dim">
          {c}
        </span>
      ))}
    </div>
  );
}
