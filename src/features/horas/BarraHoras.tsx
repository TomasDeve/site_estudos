import { fmtHoras } from "@/lib/dates";

interface Props {
  /** Horas planejadas para o assunto/matéria. */
  alvo: number;
  /** Horas já estudadas (abatidas do alvo). */
  estudado: number;
  cor?: string;
  className?: string;
  /** Compacto (linha do assunto) vs. normal (cabeçalho da matéria/ciclo). */
  size?: "sm" | "md";
}

/**
 * Placar de horas de um assunto ou matéria: barra de quanto do tempo planejado
 * já foi estudado, com o "resta Xh" em destaque (o número que o aluno vê descer
 * a cada registro). Verde quando o saldo zera — as horas daquele item acabaram.
 */
export function BarraHoras({ alvo, estudado, cor = "#e0a83e", className = "", size = "md" }: Props) {
  const est = Math.max(0, estudado);
  const pct = alvo > 0 ? Math.min(100, Math.round((est / alvo) * 100)) : est > 0 ? 100 : 0;
  const restante = Math.max(0, Math.round((alvo - est) * 100) / 100);
  const batido = alvo > 0 && est >= alvo - 0.001;
  const sm = size === "sm";

  return (
    <div className={`flex items-center gap-2 ${className}`} title={`Estudado ${fmtHoras(est)} de ${fmtHoras(alvo)}`}>
      <div className={`min-w-0 flex-1 overflow-hidden rounded-full bg-navy-700 ${sm ? "h-1" : "h-1.5"}`}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: batido ? "#43b581" : cor }}
        />
      </div>
      <span
        className={`shrink-0 whitespace-nowrap font-semibold tabular-nums ${sm ? "text-[10px]" : "text-[11px]"} ${
          batido ? "text-green" : "text-dim"
        }`}
      >
        {batido ? (
          <>✓ {fmtHoras(est)}</>
        ) : (
          <>
            {fmtHoras(est)} <span className="text-mut">/ {fmtHoras(alvo)}</span>
            {alvo > 0 && <span className="text-gold"> · resta {fmtHoras(restante)}</span>}
          </>
        )}
      </span>
    </div>
  );
}
