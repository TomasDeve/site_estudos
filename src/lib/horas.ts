// Distribuição de um orçamento de horas entre partes (matérias ou assuntos).
// Trabalha em passos de meia-hora para dar números "humanos" (5h, 6h30) e soma
// exata: o total repartido é sempre igual ao total pedido (arredondado a 0,5h).

/** Soma de horas, protegida contra null/NaN. */
export function somaHoras(valores: Array<number | null | undefined>): number {
  return valores.reduce<number>((s, v) => s + (Number(v) || 0), 0);
}

/**
 * Horas decimais → "H:MM" para os CAMPOS que a pessoa digita/edita (relógio):
 * 1,5 → "1:30", 0 → "0:00", 2 → "2:00". Evita o número quebrado ("1,5") nesses
 * campos. Os rótulos de progresso continuam no estilo "1h30"/"45min" (fmtHoras).
 */
export function horasParaHM(horas: number): string {
  const min = Math.max(0, Math.round((Number(horas) || 0) * 60));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

/**
 * Lê um tempo digitado e devolve horas decimais. Aceita o formato de relógio
 * ("1:30", "1h30", "1h") e também o decimal antigo ("1,5", "1.5") e o número
 * puro ("2" = 2h), para não quebrar a memória de digitação. Devolve null quando
 * o campo está vazio ou ilegível — quem chama decide o que fazer (manter valor).
 */
export function hmParaHoras(entrada: string): number | null {
  const s = String(entrada).trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;
  // "h:mm" / "h:m" / "1h30" / "1h" (minutos opcionais, 0–59)
  const m = s.match(/^(\d+)[:h](\d{0,2})$/);
  if (m) {
    const h = Number(m[1]) || 0;
    const min = m[2] ? Number(m[2]) : 0;
    if (min > 59) return null;
    return h + min / 60;
  }
  // decimal "1,5" / "1.5" ou número puro "2"
  const dec = Number(s.replace(",", "."));
  return Number.isFinite(dec) ? dec : null;
}

/** Horas que ainda faltam distribuir (negativo = estourou o orçamento). */
export function restante(total: number, distribuido: number): number {
  return Math.round((total - distribuido) * 2) / 2;
}

/**
 * Horas que ainda faltam ESTUDAR de um assunto/matéria (plano − estudado), em
 * passos de meia-hora e nunca negativo. É o número que o campo de horas mostra
 * descendo a cada estudo registrado. Arredonda a 0,5h para casar com o passo do
 * HoraInput — assim focar e sair do campo (sem digitar) não regrava o plano.
 */
export function horasRestantes(alvo: number, estudado: number): number {
  return Math.max(0, Math.round(((Number(alvo) || 0) - (Number(estudado) || 0)) * 2) / 2);
}

/** Classifica o restante para colorir o placar (verde / âmbar / vermelho). */
export function statusRestante(r: number): "zerado" | "sobra" | "estouro" {
  if (Math.abs(r) < 0.25) return "zerado";
  return r > 0 ? "sobra" : "estouro";
}

/**
 * Reparte um total INTEIRO (ex.: minutos) em `n` partes ~iguais, pelo método do
 * maior resto: as primeiras partes ganham 1 a mais até fechar a soma exata.
 * Usado ao lançar o tempo estudado igualmente entre os assuntos selecionados
 * (ex.: 30 min em 3 assuntos → [10, 10, 10]; 25 em 3 → [9, 8, 8]).
 */
export function distribuirInteiro(total: number, n: number): number[] {
  if (n <= 0) return [];
  const t = Math.max(0, Math.round(total));
  const base = Math.floor(t / n);
  const resto = t - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

/** `total` horas repartidas em `n` partes ~iguais, em passos de 0,5h. */
export function distribuirIgual(total: number, n: number): number[] {
  if (n <= 0) return [];
  const passos = Math.max(0, Math.round(total * 2)); // total em meias-horas
  const base = Math.floor(passos / n);
  const resto = passos - base * n;
  // As primeiras `resto` partes ganham meia-hora a mais, para fechar a conta.
  return Array.from({ length: n }, (_, i) => (base + (i < resto ? 1 : 0)) / 2);
}

/**
 * `total` horas repartidas proporcionalmente aos `pesos` (≥ 0), em passos de
 * 0,5h, pelo método do maior resto (a sobra vai para quem tem maior fração).
 * Se a soma dos pesos for 0, cai para a distribuição igual.
 */
export function distribuirPorPeso(total: number, pesos: number[]): number[] {
  const n = pesos.length;
  if (n === 0) return [];
  const somaPeso = pesos.reduce((s, p) => s + Math.max(0, p || 0), 0);
  if (somaPeso <= 0) return distribuirIgual(total, n);

  const passos = Math.max(0, Math.round(total * 2));
  const ideais = pesos.map((p) => (passos * Math.max(0, p || 0)) / somaPeso);
  const base = ideais.map(Math.floor);
  let sobra = passos - base.reduce((a, b) => a + b, 0);

  const porFracao = ideais
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < sobra && k < n; k++) base[porFracao[k].i] += 1;

  return base.map((s) => s / 2);
}
