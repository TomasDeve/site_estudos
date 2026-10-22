// Separação silábica para a translineação, como na folha: a caixa de escrita recebe hífens
// invisíveis (U+00AD) entre as sílabas, e o navegador só os mostra quando a palavra não cabe
// no fim da linha. Só marca quebras seguras: nunca entre vogais (hiato × ditongo), nunca
// deixando 1 letra sozinha e nunca em sigla.

export const SHY = "­";

const VOGAIS = "aeiouyáàâãéêíóôõúü";
// consoante + l/r que fica junta na sílaba seguinte (a-bra-ço, en-tre)
const GRUPOS = new Set(["bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "tr", "vr"]);
const DIGRAFOS = new Set(["ch", "lh", "nh"]);
// a-tle-ta ou at-le-ta: há as duas leituras, então não quebra aí
const DUVIDOSOS = new Set(["tl", "dl"]);

const ehVogal = (c: string | undefined) => !!c && VOGAIS.includes(c);

/** Posições (índices na palavra) em que se pode quebrar a linha. */
export function quebras(palavra: string): number[] {
  if (palavra.length < 4 || /\p{Lu}/u.test(palavra.slice(1))) return [];
  const w = palavra.toLocaleLowerCase("pt-BR");

  // unidades: vogal, consoante, ou "qu"/"gu" antes de vogal (que contam como uma consoante)
  const unidades: { ini: number; txt: string; vogal: boolean }[] = [];
  for (let i = 0; i < w.length; i++) {
    if ((w[i] === "q" || w[i] === "g") && (w[i + 1] === "u" || w[i + 1] === "ü") && ehVogal(w[i + 2])) {
      unidades.push({ ini: i, txt: w.slice(i, i + 2), vogal: false });
      i++;
    } else unidades.push({ ini: i, txt: w[i], vogal: ehVogal(w[i]) });
  }

  const pos: number[] = [];
  let i = unidades.findIndex((u) => u.vogal);
  if (i < 0) return [];
  while (i < unidades.length) {
    while (i < unidades.length && unidades[i].vogal) i++; // fim do grupo de vogais
    const ini = i;
    while (i < unidades.length && !unidades[i].vogal) i++; // consoantes até a próxima vogal
    if (i >= unidades.length) break; // consoantes do fim da palavra: não quebra
    const cl = unidades.slice(ini, i);
    let fica = 0; // quantas consoantes ficam na sílaba de cima
    if (cl.length >= 2) {
      const par = cl[cl.length - 2].txt + cl[cl.length - 1].txt;
      if (DUVIDOSOS.has(par)) continue;
      // sub-li-nhar × su-bli-me: o prefixo muda a separação, então não quebra
      if (par.length === 2 && w.startsWith("sub") && cl[0].ini === 2 && /[lr]/.test(par[1])) continue;
      fica = GRUPOS.has(par) || DIGRAFOS.has(par) ? cl.length - 2 : cl.length - 1;
    }
    pos.push(cl[fica].ini);
  }
  return pos.filter((p) => p >= 2 && w.length - p >= 2);
}

/** O texto com hífens invisíveis nas quebras de sílaba de cada palavra. */
export function hifenizar(texto: string): string {
  return texto.replace(/[\p{L}]+/gu, (palavra) => {
    const pos = quebras(palavra);
    if (!pos.length) return palavra;
    let saida = "";
    let de = 0;
    for (const p of pos) {
      saida += palavra.slice(de, p) + SHY;
      de = p;
    }
    return saida + palavra.slice(de);
  });
}

export function semHifens(texto: string): string {
  return texto.split(SHY).join("");
}

/** Quantos caracteres de verdade (sem os hífens invisíveis) há antes de `pos`. */
export function indiceReal(comHifens: string, pos: number): number {
  return semHifens(comHifens.slice(0, pos)).length;
}

/** Posição no texto com hífens que fica logo depois do caractere real nº `real`. */
export function indiceComHifens(comHifens: string, real: number): number {
  let n = 0;
  for (let i = 0; i < comHifens.length; i++) {
    if (n === real) return i;
    if (comHifens[i] !== SHY) n++;
  }
  return comHifens.length;
}
