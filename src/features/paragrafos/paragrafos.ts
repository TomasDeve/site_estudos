import temasJson from "./temas.json";

/** Um tema do banco (gerado por tools/paragrafos-temas.py a partir do PDF de Atualidades). */
export interface TemaParagrafo {
  id: string;
  bloco: string;
  tema: string;
  textos: { texto: string; fonte: string }[];
  aspectos: { texto: string; valor: string }[];
  /** "Para decorar" do bloco (lei, exemplo, número, frase) ou "O essencial" do extra. */
  decorar: { tipo: string; titulo: string; texto: string }[];
  esqueleto: {
    abre: string[];
    anuncia: string[];
    p1: string[];
    p2: string[];
    fim: string[];
    pronta: string;
  };
}

export const TEMAS = temasJson as TemaParagrafo[];

export type TipoParagrafo = "introducao" | "desenvolvimento" | "conclusao";

export const TIPOS: Record<
  TipoParagrafo,
  { nome: string; meta: [number, number]; abertura: string; descricao: string }
> = {
  introducao: {
    nome: "Introdução",
    meta: [4, 5],
    abertura: "Um fato com fonte + “Nesse sentido, vale citar…, expor… e…”",
    descricao: "Apresenta o tema e anuncia os 3 aspectos",
  },
  desenvolvimento: {
    nome: "Desenvolvimento",
    meta: [8, 9],
    abertura: "“Inicialmente, cabe destacar que…” / “Posteriormente, vale dissertar sobre…”",
    descricao: "Responde ao 1º ou ao 2º aspecto com 2 pontos",
  },
  conclusao: {
    nome: "Conclusão",
    meta: [7, 8],
    abertura: "“Por fim, é preciso…” + frase de síntese",
    descricao: "Responde ao 3º aspecto e fecha o texto",
  },
};

/**
 * Caracteres que cabem numa linha manuscrita da folha da Cebraspe (184 mm de escrita).
 * É estimativa: letra pequena cabe mais, letra grande cabe menos.
 */
export const CARACTERES_POR_LINHA = 70;
/** O recuo do parágrafo come uns 3 caracteres da 1ª linha. */
const RECUO = 3;

/** Linhas que o parágrafo ocuparia na folha (0 se vazio). */
export function linhasNaFolha(texto: string): number {
  const t = texto.replace(/\s+/g, " ").trim();
  if (!t) return 0;
  return Math.ceil((t.length + RECUO) / CARACTERES_POR_LINHA);
}

/** Qual aspecto o parágrafo responde: null na introdução, 2 na conclusão. */
export function aspectoDoParagrafo(tipo: TipoParagrafo, aspecto: number | null): number | null {
  if (tipo === "introducao") return null;
  if (tipo === "conclusao") return 2;
  return aspecto === 1 ? 1 : 0;
}

/** A abertura do esqueleto dele para aquele parágrafo. */
export function aberturaDoParagrafo(tipo: TipoParagrafo, aspecto: number | null): string {
  if (tipo !== "desenvolvimento") return TIPOS[tipo].abertura;
  return aspecto === 1 ? "“Posteriormente, vale dissertar sobre…”" : "“Inicialmente, cabe destacar que…”";
}

/** Pontos do esqueleto que servem para aquele parágrafo. */
export function pontosDoParagrafo(tema: TemaParagrafo, tipo: TipoParagrafo, aspecto: number | null): string[] {
  const e = tema.esqueleto;
  if (tipo === "introducao") return e.abre;
  if (tipo === "conclusao") return e.fim;
  return aspecto === 1 ? e.p2 : e.p1;
}

export interface Sorteio {
  tema: TemaParagrafo;
  tipo: TipoParagrafo;
  aspecto: number | null;
}

/**
 * Sorteia tema (e, no desenvolvimento, o 1º ou o 2º aspecto) evitando o que já saiu
 * nas tentativas recentes do mesmo tipo. Quando tudo já saiu, volta a valer qualquer um.
 */
export function sortear(
  tipo: TipoParagrafo,
  recentes: { tipo: string; tema_id: string; aspecto: number | null }[],
  aleatorio: () => number = Math.random
): Sorteio {
  const opcoes: { tema: TemaParagrafo; aspecto: number | null }[] = [];
  for (const tema of TEMAS) {
    if (tipo === "desenvolvimento") opcoes.push({ tema, aspecto: 0 }, { tema, aspecto: 1 });
    else opcoes.push({ tema, aspecto: tipo === "conclusao" ? 2 : null });
  }
  const feitas = new Set(
    recentes.filter((r) => r.tipo === tipo).map((r) => `${r.tema_id}:${r.aspecto ?? ""}`)
  );
  const livres = opcoes.filter((o) => !feitas.has(`${o.tema.id}:${o.aspecto ?? ""}`));
  const pool = livres.length ? livres : opcoes;
  const escolha = pool[Math.floor(aleatorio() * pool.length)];
  return { tipo, ...escolha };
}

/**
 * Nota final do parágrafo, de 0 a 10: a conta da Cebraspe (NC − 6·NE/TL, com NC de 0 a 30)
 * trazida para a escala 10, ou seja, conteúdo − 2 × erros ÷ linhas.
 */
export function notaFinal(notaConteudo: number, erros: number, linhas: number): number {
  const nota = notaConteudo - (2 * erros) / Math.max(1, linhas);
  return Math.round(Math.min(10, Math.max(0, nota)) * 100) / 100;
}

/** Soma dos critérios da IA, limitada a 0–10 (a IA às vezes passa do máximo). */
export function notaConteudo(criterios: { pontos: number; max: number }[]): number {
  const soma = criterios.reduce((s, c) => s + Math.min(Math.max(0, c.pontos), c.max), 0);
  return Math.round(Math.min(10, soma) * 100) / 100;
}
