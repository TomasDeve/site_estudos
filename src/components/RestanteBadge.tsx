import { fmtHoras } from "@/lib/dates";
import { restante, statusRestante } from "@/lib/horas";

/** Placar "resta Xh / tudo distribuído / estourou Xh", colorido pelo estado. */
export function RestanteBadge({
  total,
  distribuido,
  className = "",
}: {
  total: number;
  distribuido: number;
  className?: string;
}) {
  const r = restante(total, distribuido);
  const st = statusRestante(r);
  const cor = st === "zerado" ? "text-green" : st === "sobra" ? "text-gold" : "text-red";
  const label =
    st === "estouro"
      ? `estourou ${fmtHoras(-r)}`
      : st === "sobra"
        ? `resta ${fmtHoras(r)}`
        : "tudo distribuído";
  return (
    <span
      className={`font-semibold tabular-nums ${cor} ${className}`}
      title={`Distribuído ${fmtHoras(distribuido)} de ${fmtHoras(total)}`}
    >
      {label}
    </span>
  );
}
