import type { QuestaoLog } from "@/types/db";

/** Classe de cor da taxa de acerto: ciano excelente, verde forte, amarelo mediano, vermelho fraco. */
export function corDesempenho(pct: number) {
  if (pct >= 81) return { texto: "text-cyan", fundo: "bg-cyan/10 hover:bg-cyan/20" };
  if (pct >= 70) return { texto: "text-green", fundo: "bg-green/10 hover:bg-green/20" };
  if (pct >= 50) return { texto: "text-amber", fundo: "bg-amber/10 hover:bg-amber/20" };
  return { texto: "text-red", fundo: "bg-red/10 hover:bg-red/20" };
}

/**
 * As N questões mais recentes (do registro mais novo para o mais antigo).
 *
 * Os registros são diários (um por dia/assunto), então quando o dia mais antigo
 * estoura a janela ele entra proporcional — 20 de um dia de 30 questões com 24
 * acertos contam como 16 acertos. Aproximação consciente: sem guardar questão a
 * questão, é o mais perto que dá da "janela móvel" de verdade.
 */
export function ultimasQuestoes(logs: QuestaoLog[], n: number) {
  const recentes = [...logs].sort(
    (a, b) => b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at)
  );
  let total = 0;
  let acertos = 0;
  for (const l of recentes) {
    if (total >= n) break;
    if (l.total <= 0) continue;
    const cabe = Math.min(l.total, n - total);
    acertos += cabe === l.total ? l.acertos : Math.round(l.acertos * (cabe / l.total));
    total += cabe;
  }
  return { total, acertos, pct: total === 0 ? 0 : Math.round((acertos / total) * 100) };
}

/** Janela móvel das "questões recentes": as últimas 30. */
export const JANELA_RECENTE = 30;

export interface Placar {
  total: number;
  acertos: number;
  /** `null` enquanto não houver nenhuma questão. */
  pct: number | null;
}

/** Desempenho acumulado: a soma de todos os registros. */
export function desempenhoGeral(logs: QuestaoLog[]): Placar {
  let total = 0;
  let acertos = 0;
  for (const l of logs) {
    total += l.total;
    acertos += l.acertos;
  }
  return { total, acertos, pct: total > 0 ? Math.round((acertos / total) * 100) : null };
}

export interface DesempenhoRecente extends Placar {
  janela: number;
  /**
   * Diferença em pontos percentuais entre a janela recente e as questões feitas
   * antes dela (recente − anterior): positivo = evoluindo, negativo = caindo.
   * `null` quando não há questões fora da janela para comparar.
   */
  tendencia: number | null;
  /** Taxa das questões anteriores à janela — a base da comparação. `null` sem base. */
  anteriorPct: number | null;
  /** Só vale destacar a janela quando há questões além dela (senão é igual ao geral). */
  vale: boolean;
}

/**
 * Desempenho nas últimas N questões (janela móvel) e se está evoluindo. A
 * tendência compara a janela com as questões feitas antes dela — é o "estou
 * melhorando?" em pontos percentuais. Como o histórico é agregado por dia,
 * reaproveita `ultimasQuestoes`, que corta o registro que estoura a janela de
 * forma proporcional.
 */
export function desempenhoRecente(
  logs: QuestaoLog[],
  janela = JANELA_RECENTE
): DesempenhoRecente {
  const recente = ultimasQuestoes(logs, janela);
  const geral = desempenhoGeral(logs);
  const anterioresTotal = geral.total - recente.total;
  const anterioresAcertos = geral.acertos - recente.acertos;
  const anteriorPct =
    anterioresTotal > 0 ? Math.round((anterioresAcertos / anterioresTotal) * 100) : null;
  return {
    total: recente.total,
    acertos: recente.acertos,
    pct: recente.total > 0 ? recente.pct : null,
    janela,
    tendencia: anteriorPct === null ? null : recente.pct - anteriorPct,
    anteriorPct,
    vale: anterioresTotal > 0,
  };
}
