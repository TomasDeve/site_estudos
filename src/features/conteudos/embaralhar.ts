/**
 * Embaralhamento determinístico compartilhado pelos cadernos de questões.
 * A mesma semente reproduz sempre a mesma ordem — assim os refetches disparados
 * ao responder não remexem a lista no meio da resolução.
 */

/** Semente nova e aleatória para um embaralhamento. */
export function gerarSemente() {
  return Math.floor(Math.random() * 2 ** 31);
}

/** RNG determinístico (mulberry32): mesma semente → mesma sequência. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates guiado pela semente — devolve um novo array, sem alterar o recebido. */
export function embaralhar<T>(itens: T[], semente: number): T[] {
  const arr = [...itens];
  const rnd = mulberry32(semente);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Mantém juntas as questões que compartilham o mesmo texto (ex.: o "Texto associado"),
 * SEM desfazer o embaralho: preserva a ordem recebida, mas quando um grupo aparece pela
 * primeira vez, puxa todas as questões daquele texto pra logo em seguida. Assim o aluno
 * lê o texto uma vez e responde todas as questões dele em sequência, e o resto continua
 * embaralhado (variedade preservada). Itens sem chave ficam onde estão.
 *
 * `chaveDe` devolve a chave do grupo (o texto) ou null/"" pra "não agrupar". Estável e O(n).
 */
export function agruparPorChave<T>(itens: T[], chaveDe: (item: T) => string | null | undefined): T[] {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const k = chaveDe(item);
    if (!k) continue;
    const g = grupos.get(k);
    if (g) g.push(item);
    else grupos.set(k, [item]);
  }
  const emitido = new Set<string>();
  const out: T[] = [];
  for (const item of itens) {
    const k = chaveDe(item);
    if (!k) {
      out.push(item);
      continue;
    }
    if (emitido.has(k)) continue; // grupo já saiu inteiro na 1ª aparição
    emitido.add(k);
    out.push(...grupos.get(k)!);
  }
  return out;
}
