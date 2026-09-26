import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fmtMinutos } from "@/lib/dates";

/** Quantos dias o plano mostra de uma vez (3 em cima, 3 embaixo). */
export const DIAS_NO_PLANO = 6;
/** Cada linha do dia é um bloco de meia hora. */
export const MINUTOS_POR_BLOCO = 30;
/** Todo dia começa com 6 blocos (3h). */
export const BLOCOS_INICIAIS = 6;
/** Teto de blocos por dia (8h) — casa com o CHECK da migração 0034. */
export const MAX_BLOCOS = 16;

export type AtividadeChave = "teoria" | "questoes" | "revisao" | "lei_seca" | "simulado";

export interface Atividade {
  chave: AtividadeChave;
  label: string;
  icone: string;
  /** Cor do chip e da barrinha à esquerda da linha. */
  texto: string;
  fundo: string;
  barra: string;
}

export const ATIVIDADES: Atividade[] = [
  { chave: "teoria", label: "Teoria", icone: "📖", texto: "text-blue", fundo: "bg-blue/15", barra: "bg-blue" },
  { chave: "questoes", label: "Questões", icone: "✍️", texto: "text-gold", fundo: "bg-gold/15", barra: "bg-gold" },
  {
    chave: "revisao",
    label: "Revisão / Anki",
    icone: "🔁",
    texto: "text-[#b3a7e6]",
    fundo: "bg-[#8b7bd8]/20",
    barra: "bg-[#8b7bd8]",
  },
  { chave: "lei_seca", label: "Lei seca", icone: "📜", texto: "text-cyan", fundo: "bg-cyan/15", barra: "bg-cyan" },
  { chave: "simulado", label: "Simulado", icone: "🏁", texto: "text-green", fundo: "bg-green/15", barra: "bg-green" },
];

export function atividadeDe(chave: string): Atividade {
  return ATIVIDADES.find((a) => a.chave === chave) ?? ATIVIDADES[0];
}

/**
 * Quantas linhas o dia mostra: os 6 blocos iniciais mais os que você acrescentou
 * (`extras`), nunca escondendo um bloco já preenchido, e no máximo 16.
 */
export function blocosVisiveis(extras: number, maiorPreenchido: number): number {
  return Math.min(MAX_BLOCOS, Math.max(BLOCOS_INICIAIS + extras, maiorPreenchido));
}

/** Tempo somado de N blocos: 0 → "0", 3 → "1h30", 1 → "30min". */
export function tempoDosBlocos(n: number): string {
  return n === 0 ? "0" : fmtMinutos(n * MINUTOS_POR_BLOCO);
}

/** Rótulo de cada linha: a duração do bloco ("30min"), igual em todas. */
export const ROTULO_BLOCO = fmtMinutos(MINUTOS_POR_BLOCO);

/** Os N dias seguidos a partir de `inicio` (inclusive), como "YYYY-MM-DD". */
export function diasDoPlano(inicio: string, n = DIAS_NO_PLANO): string[] {
  const base = parseISO(inicio);
  return Array.from({ length: n }, (_, i) => format(addDays(base, i), "yyyy-MM-dd"));
}

/** Soma dias a uma data ISO. */
export function somarDias(iso: string, n: number): string {
  return format(addDays(parseISO(iso), n), "yyyy-MM-dd");
}

/** Cabeçalho da caixinha: "Hoje" / "Amanhã" / "Sábado", mais a data "27/09". */
export function rotuloDoDia(iso: string, hoje: string): { nome: string; data: string } {
  const data = format(parseISO(iso), "dd/MM");
  if (iso === hoje) return { nome: "Hoje", data };
  if (iso === somarDias(hoje, 1)) return { nome: "Amanhã", data };
  if (iso === somarDias(hoje, -1)) return { nome: "Ontem", data };
  const semana = format(parseISO(iso), "EEEE", { locale: ptBR }).replace("-feira", "");
  return { nome: semana.charAt(0).toUpperCase() + semana.slice(1), data };
}
