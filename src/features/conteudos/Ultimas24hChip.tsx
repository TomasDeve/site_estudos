import { Clock } from "lucide-react";
import type { QuestaoResumo } from "@/api/topicoQuestoes";
import { corDesempenho } from "./desempenho";
import { acertou, estaResolvida } from "./questaoModelo";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Acertos/total das questões do site respondidas nas últimas 24 horas. */
export function placar24h(questoes: QuestaoResumo[]) {
  const desde = Date.now() - DIA_MS;
  let total = 0;
  let acertos = 0;
  for (const q of questoes) {
    if (!q.respondida_em || !estaResolvida(q)) continue;
    if (new Date(q.respondida_em).getTime() < desde) continue;
    total++;
    if (acertou(q)) acertos++;
  }
  return { total, acertos };
}

/**
 * Chip "Últimas 24h (8/10) 80%": as questões do site respondidas nas últimas 24
 * horas (pelo `respondida_em`, hora exata — os registros de questão_logs são
 * agregados por dia e não servem para uma janela de horas). Some sem nenhuma.
 */
export function Ultimas24hChip({
  questoes,
  className = "",
}: {
  questoes: QuestaoResumo[];
  className?: string;
}) {
  const { total, acertos } = placar24h(questoes);
  if (total === 0) return null;

  const pct = Math.round((acertos / total) * 100);
  const cor = corDesempenho(pct);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${cor.texto} ${cor.fundo} ${className}`}
      title={`Questões do site respondidas nas últimas 24 horas: ${acertos} certas de ${total}`}
    >
      <Clock className="size-3.5" aria-hidden />
      Últimas 24h
      <span className="font-normal text-mut">
        ({acertos}/{total})
      </span>
      {pct}%
    </span>
  );
}
