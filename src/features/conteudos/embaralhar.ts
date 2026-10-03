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

/**
 * Espalha os grupos (ex.: matérias) proporcionalmente pela lista toda, preservando a
 * ordem recebida DENTRO de cada grupo. Cada item ganha a chave (posição no grupo +
 * sorteio) ÷ tamanho do grupo — assim uma matéria com muitas questões não domina o
 * começo, e uma com poucas não fica toda no fim. Determinístico pela semente.
 */
export function espalharPorChave<T>(
  itens: T[],
  semente: number,
  chaveDe: (item: T) => string | null | undefined
): T[] {
  const total = new Map<string, number>();
  for (const item of itens) {
    const k = chaveDe(item) ?? "";
    total.set(k, (total.get(k) ?? 0) + 1);
  }
  const visto = new Map<string, number>();
  const rnd = mulberry32(semente ^ 0x9e3779b9);
  return itens
    .map((item) => {
      const k = chaveDe(item) ?? "";
      const pos = visto.get(k) ?? 0;
      visto.set(k, pos + 1);
      return { item, chave: (pos + rnd()) / total.get(k)! };
    })
    .sort((x, y) => x.chave - y.chave)
    .map((x) => x.item);
}

/** Anos distintos (decrescente) → posição: o mais recente é 0, o seguinte 1… */
function rankDosAnos(anos: (number | null)[]): Map<number, number> {
  const distintos = [...new Set(anos.filter((a): a is number => a !== null))].sort((a, b) => b - a);
  return new Map(distintos.map((a, i) => [a, i]));
}

/**
 * Ordem do caderno por ano: mais recentes primeiro. Estável (dentro do mesmo ano
 * mantém a ordem recebida) e as sem ano (IA, doutrina…) vão para o fim.
 */
export function ordenarPorAno<T>(itens: T[], anoDe: (item: T) => number | null): T[] {
  return itens
    .map((item, i) => ({ item, i, ano: anoDe(item) }))
    .sort((a, b) => {
      if (a.ano === b.ano) return a.i - b.i;
      if (a.ano === null) return 1;
      if (b.ano === null) return -1;
      return b.ano - a.ano;
    })
    .map((x) => x.item);
}

/**
 * Embaralha mantendo uma ordem aproximada por ano (mais recentes primeiro): cada
 * questão ganha uma chave = posição do seu ano + sorteio em [0, 2). Assim um ano só
 * se mistura com o ano vizinho (2026 com 2025, 2025 com 2024…), nunca com um mais
 * distante. As sem ano ficam espalhadas pela lista toda. Determinístico pela semente.
 */
export function embaralharPorAno<T>(
  itens: T[],
  semente: number,
  anoDe: (item: T) => number | null
): T[] {
  const anos = itens.map(anoDe);
  const rank = rankDosAnos(anos);
  const rnd = mulberry32(semente);
  const faixa = rank.size + 1;
  return itens
    .map((item, i) => {
      const a = anos[i];
      const chave = a === null ? rnd() * faixa : rank.get(a)! + rnd() * 2;
      return { item, chave };
    })
    .sort((x, y) => x.chave - y.chave)
    .map((x) => x.item);
}
