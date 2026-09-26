import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fmtMinutos } from "@/lib/dates";

/** Quantos dias o plano pode mostrar de uma vez (3 por linha). */
export const OPCOES_DIAS = [3, 6, 9] as const;
export type QuantosDias = (typeof OPCOES_DIAS)[number];
/** Padrão: uma linha de 3 dias. */
export const DIAS_PADRAO: QuantosDias = 3;

/** Lê a escolha salva ("3", "6", "9"); qualquer outra coisa cai no padrão. */
export function lerQuantosDias(valor: string | null | undefined): QuantosDias {
  const n = Number(valor);
  return (OPCOES_DIAS as readonly number[]).includes(n) ? (n as QuantosDias) : DIAS_PADRAO;
}
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

/**
 * Replicar o bloco da posição `h` para baixo: a cópia entra em `h + 1` e os blocos
 * preenchidos logo abaixo (a sequência contínua, até o primeiro livre) descem uma
 * posição. Devolve essas posições de baixo para cima — a ordem segura de mover sem
 * esbarrar na posição ocupada — ou `null` se não cabe (passaria de 16 blocos).
 */
export function blocosQueDescem(preenchidos: number[], h: number, max = MAX_BLOCOS): number[] | null {
  const ocupados = new Set(preenchidos);
  const descem: number[] = [];
  let livre = h + 1;
  while (ocupados.has(livre)) descem.push(livre++);
  if (livre > max) return null;
  return descem.reverse();
}

/** Primeira posição livre do dia (1 a 16), ou null se o dia está cheio. */
export function primeiraLivre(ocupadas: number[], max = MAX_BLOCOS): number | null {
  const ocupado = new Set(ocupadas);
  for (let h = 1; h <= max; h++) if (!ocupado.has(h)) return h;
  return null;
}

/** Tempo de um bloco: o que você digitou nele, ou 30 min (padrão). */
export function minutosDe(bloco: { minutos?: number | null }): number {
  return bloco.minutos ?? MINUTOS_POR_BLOCO;
}

/** Soma de tempo para os totais: 0 → "0", 90 → "1h30", 45 → "45min". */
export function fmtTempo(minutos: number): string {
  return minutos === 0 ? "0" : fmtMinutos(minutos);
}

/**
 * Lê o tempo digitado num bloco, em minutos. Número puro é minuto ("45",
 * "45min"); com "h" ou ":" é hora ("1h", "1h30", "1:15"). Devolve null quando
 * vazio, ilegível ou fora de 1 min a 10h.
 */
export function lerMinutos(entrada: string): number | null {
  const s = entrada.trim().toLowerCase().replace(/\s+/g, "");
  let min: number | null = null;
  const soMin = s.match(/^(\d+)(?:min|m)?$/);
  const comHora = s.match(/^(\d+)[h:](\d{1,2})?(?:min|m)?$/);
  if (soMin) min = Number(soMin[1]);
  else if (comHora) {
    const m = comHora[2] ? Number(comHora[2]) : 0;
    if (m > 59) return null;
    min = Number(comHora[1]) * 60 + m;
  }
  if (min === null || min < 1 || min > 600) return null;
  return min;
}

/** Rótulo de cada linha: a duração do bloco ("30min"), igual em todas. */
export const ROTULO_BLOCO = fmtMinutos(MINUTOS_POR_BLOCO);

/** Os N dias seguidos a partir de `inicio` (inclusive), como "YYYY-MM-DD". */
export function diasDoPlano(inicio: string, n: number): string[] {
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
