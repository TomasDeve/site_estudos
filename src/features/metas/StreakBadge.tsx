import { calcStreak, useDiasConcluidos } from "@/api/diasConcluidos";
import { hojeISO } from "@/lib/dates";

export function StreakBadge() {
  const { data: dias } = useDiasConcluidos();
  const streak = calcStreak(dias, hojeISO());

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 ${
        streak > 0 ? "border-gold/40 bg-gold/10" : "border-line bg-navy-800"
      }`}
      title={streak > 0 ? `${streak} dias seguidos de estudo concluído` : "Conclua o dia de hoje para começar uma sequência"}
    >
      <span className={`text-lg ${streak > 0 ? "streak-glow" : "opacity-40 grayscale"}`}>🔥</span>
      <span className="text-sm font-bold tabular-nums text-txt">
        {streak}
        <span className="ml-1 text-[11px] font-medium text-dim">
          {streak === 1 ? "dia" : "dias"}
        </span>
      </span>
    </div>
  );
}
