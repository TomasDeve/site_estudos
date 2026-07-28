import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { QuestaoLog } from "@/types/db";
import { corDesempenho, desempenhoRecente } from "./desempenho";

/**
 * Chip do desempenho nas últimas N questões, com uma seta de tendência
 * (evoluindo / caindo / estável) medida contra as questões feitas antes da
 * janela — o "estou melhorando?" ao lado do desempenho geral.
 *
 * Não renderiza nada enquanto não houver questões além da janela: aí ela seria
 * igual ao geral e não diria nada novo.
 */
export function DesempenhoRecenteChip({
  logs,
  className = "",
}: {
  logs: QuestaoLog[];
  className?: string;
}) {
  const r = desempenhoRecente(logs);
  if (!r.vale || r.pct === null) return null;

  const cor = corDesempenho(r.pct);
  const t = r.tendencia ?? 0;
  const Seta = t > 0 ? TrendingUp : t < 0 ? TrendingDown : Minus;
  const corSeta = t > 0 ? "text-green" : t < 0 ? "text-red" : "text-mut";
  const tendenciaTexto =
    t > 0
      ? `subindo ${t} p.p. desde as ${r.anteriorPct}% anteriores — evoluindo`
      : t < 0
        ? `caindo ${-t} p.p. desde as ${r.anteriorPct}% anteriores`
        : `no mesmo nível das ${r.anteriorPct}% anteriores`;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${cor.texto} ${cor.fundo} ${className}`}
      title={`Últimas ${r.total} questões: ${r.acertos}/${r.total} · ${r.pct}% de acerto (${tendenciaTexto})`}
    >
      Últimas {r.janela}: {r.pct}%
      <Seta className={`size-3.5 ${corSeta}`} aria-hidden />
    </span>
  );
}
