import { useSessoesJanela } from "@/api/sessoes";
import { fmtMinutos, hojeISO } from "@/lib/dates";

/** Pílula com o tempo estudado hoje — irmã do StreakBadge, para a barra lateral. */
export function HojeBadge() {
  const hoje = hojeISO();
  const { data: sessoes } = useSessoesJanela(hoje, hoje);
  const minutos = (sessoes ?? []).reduce((s, x) => s + x.minutos, 0);
  const tem = minutos > 0;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 ${
        tem ? "border-blue/40 bg-blue/10" : "border-line bg-navy-800"
      }`}
      title={tem ? `${fmtMinutos(minutos)} estudados hoje` : "Nenhum estudo registrado hoje"}
    >
      <span className={`text-lg ${tem ? "" : "opacity-40 grayscale"}`}>⏱️</span>
      <span className="text-sm font-bold tabular-nums text-txt">
        {tem ? fmtMinutos(minutos) : "0min"}
        <span className="ml-1 text-[11px] font-medium text-dim">hoje</span>
      </span>
    </div>
  );
}
