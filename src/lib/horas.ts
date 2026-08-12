// Distribuição de um orçamento de horas entre partes (matérias ou assuntos).
// Trabalha em passos de meia-hora para dar números "humanos" (5h, 6h30) e soma
// exata: o total repartido é sempre igual ao total pedido (arredondado a 0,5h).

/** Soma de horas, protegida contra null/NaN. */
export function somaHoras(valores: Array<number | null | undefined>): number {
  return valores.reduce<number>((s, v) => s + (Number(v) || 0), 0);
}

/** Horas que ainda faltam distribuir (negativo = estourou o orçamento). */
export function restante(total: number, distribuido: number): number {
  return Math.round((total - distribuido) * 2) / 2;
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
