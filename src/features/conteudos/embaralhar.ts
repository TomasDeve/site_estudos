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
