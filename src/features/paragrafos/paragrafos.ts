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
  /** Parágrafo modelo (nota máxima) de cada parte, no esqueleto dele e nos critérios da Cebraspe. */
  modelo: { intro: string; p1: string; p2: string; fim: string };
  /** Dado, lei ou caso concreto (com fonte) de cada ponto de p1, p2 e fim, na mesma ordem. */
  embasamento: { p1: string[]; p2: string[]; fim: string[] };
}

export const TEMAS = temasJson as TemaParagrafo[];

/** Os 3 parágrafos do treino e, opcional no tema da semana, a redação inteira. */
export type TipoParagrafo = "introducao" | "desenvolvimento" | "conclusao" | "redacao";

/** Só os parágrafos (o treino livre e os dias do plano). */
export const TIPOS_DE_PARAGRAFO: TipoParagrafo[] = ["introducao", "desenvolvimento", "conclusao"];

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
    abertura: "“Inicialmente, cabe destacar que…” / “Em seguida, vale dissertar sobre…”",
    descricao: "Responde ao 1º ou ao 2º aspecto com 2 pontos",
  },
  conclusao: {
    nome: "Conclusão",
    meta: [7, 8],
    abertura: "“Por fim, é preciso…” + frase de síntese",
    descricao: "Responde ao 3º aspecto e fecha o texto",
  },
  redacao: {
    nome: "Redação completa",
    meta: [25, 30],
    abertura: "introdução, “Inicialmente…”, “Em seguida…” e “Por fim…”",
    descricao: "Os 4 parágrafos de uma vez, em até 30 linhas",
  },
};

/**
 * Caracteres que cabem numa linha manuscrita da folha da Cebraspe (184 mm de escrita).
 * Define a largura de cada linha da caixa de escrita. Medido nas fotos de 5 redações dele
 * (51 linhas cheias): ~70 na letra menor, ~58 na maior, média 66–67.
 */
export const CARACTERES_POR_LINHA = 66;
/** O recuo do parágrafo come uns 3 caracteres da 1ª linha. */
const RECUO = 3;

/** Linhas que o texto ocuparia na folha (0 se vazio); cada parágrafo começa numa linha nova. */
export function linhasNaFolha(texto: string): number {
  return texto
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .reduce((soma, p) => soma + Math.ceil((p.length + RECUO) / CARACTERES_POR_LINHA), 0);
}

/** Qual aspecto o parágrafo responde: null na introdução, 2 na conclusão. */
export function aspectoDoParagrafo(tipo: TipoParagrafo, aspecto: number | null): number | null {
  if (tipo === "introducao" || tipo === "redacao") return null;
  if (tipo === "conclusao") return 2;
  return aspecto === 1 ? 1 : 0;
}

/** A abertura do esqueleto dele para aquele parágrafo. */
export function aberturaDoParagrafo(tipo: TipoParagrafo, aspecto: number | null): string {
  if (tipo !== "desenvolvimento") return TIPOS[tipo].abertura;
  return aspecto === 1 ? "“Em seguida, vale dissertar sobre…”" : "“Inicialmente, cabe destacar que…”";
}

/** O parágrafo modelo daquela parte da redação. */
export function modeloDoParagrafo(tema: TemaParagrafo, tipo: TipoParagrafo, aspecto: number | null): string {
  if (tipo === "redacao") return [tema.modelo.intro, tema.modelo.p1, tema.modelo.p2, tema.modelo.fim].join("\n\n");
  if (tipo === "introducao") return tema.modelo.intro;
  if (tipo === "conclusao") return tema.modelo.fim;
  return aspecto === 1 ? tema.modelo.p2 : tema.modelo.p1;
}

/** Embasamento de cada ponto daquele parágrafo (a introdução não tem: os fatos já vêm com fonte). */
export function embasamentoDoParagrafo(tema: TemaParagrafo, tipo: TipoParagrafo, aspecto: number | null): string[] {
  if (tipo === "redacao") return [...tema.embasamento.p1, ...tema.embasamento.p2, ...tema.embasamento.fim];
  if (tipo === "introducao") return [];
  if (tipo === "conclusao") return tema.embasamento.fim;
  return aspecto === 1 ? tema.embasamento.p2 : tema.embasamento.p1;
}

/** Pontos do esqueleto que servem para aquele parágrafo. */
export function pontosDoParagrafo(tema: TemaParagrafo, tipo: TipoParagrafo, aspecto: number | null): string[] {
  const e = tema.esqueleto;
  if (tipo === "redacao") return [...e.abre, ...e.p1, ...e.p2, ...e.fim];
  if (tipo === "introducao") return e.abre;
  if (tipo === "conclusao") return e.fim;
  return aspecto === 1 ? e.p2 : e.p1;
}

export interface Sorteio {
  tema: TemaParagrafo;
  tipo: TipoParagrafo;
  aspecto: number | null;
  /** Só na redação completa: os parágrafos que ele vai escrever (padrão: os 4). */
  partes?: ParteRedacao[];
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

/**
 * Nota de conteúdo (0–10) a partir do conceito, como o quesito de cada aspecto da Cebraspe:
 * conceito 3 = nota cheia, 2 = dois terços, 1 = um terço. A banca não tem quesito separado
 * de repertório ou estilo — isso já está dentro do conceito.
 */
export function notaDoConceito(conceito: number): number {
  return notaDoConceitoNaEscala(conceito, 10);
}

function notaDoConceitoNaEscala(conceito: number, valor: number): number {
  const c = Math.min(3, Math.max(0, Math.round(conceito)));
  return Math.round(((c * valor) / 3) * 100) / 100;
}

/** "8,50" → 8.5 (o valor do aspecto na proposta). */
export function valorDoAspecto(valor: string): number {
  return Number(valor.replace(",", ".")) || 0;
}

/** Apresentação e estrutura textual: até 1,50 de 30 na PC PE 2024. */
export const APRESENTACAO = 1.5;

/** Os parágrafos da redação; no treino da redação completa ele marca quais vai escrever. */
export type ParteRedacao = "intro" | "p1" | "p2" | "fim";

export const PARTES_REDACAO: { id: ParteRedacao; nome: string; meta: [number, number]; aspecto: number | null }[] = [
  { id: "intro", nome: "Introdução", meta: [4, 5], aspecto: null },
  { id: "p1", nome: "1º desenvolvimento", meta: [8, 9], aspecto: 0 },
  { id: "p2", nome: "2º desenvolvimento", meta: [8, 9], aspecto: 1 },
  { id: "fim", nome: "Conclusão", meta: [7, 8], aspecto: 2 },
];

export const TODAS_AS_PARTES: ParteRedacao[] = PARTES_REDACAO.map((p) => p.id);

/** Linhas pedidas para os parágrafos marcados (a folha tem 30). */
export function metaDasPartes(partes: ParteRedacao[]): [number, number] {
  const escolhidas = PARTES_REDACAO.filter((p) => partes.includes(p.id));
  return [
    escolhidas.reduce((s, p) => s + p.meta[0], 0),
    Math.min(30, escolhidas.reduce((s, p) => s + p.meta[1], 0)),
  ];
}

/**
 * Nota da redação como a Cebraspe: cada aspecto vale conceito ÷ 3 × o valor dele na
 * proposta, a estrutura vale até 1,50, e a nota = NC − 6 × NE ÷ TL (TL = linhas escritas,
 * no máximo 30). Se ele escreveu só alguns parágrafos, conta só os aspectos deles (a
 * estrutura só com os 4): `maximo` é o que dava para tirar, e `nota30` traz para a escala 30.
 */
export function notaDaRedacao(
  conceitos: number[],
  valores: number[],
  estrutura: "ok" | "parcial" | "faltou",
  erros: number,
  linhas: number,
  partes: ParteRedacao[] = TODAS_AS_PARTES
): { notaConteudo: number; nota: number; maximo: number; nota30: number } {
  const contados = PARTES_REDACAO.filter((p) => p.aspecto != null && partes.includes(p.id)).map((p) => p.aspecto!);
  const completa = TODAS_AS_PARTES.every((p) => partes.includes(p));
  const aspectos = contados.reduce((s, i) => s + notaDoConceitoNaEscala(conceitos[i] ?? 0, valores[i] ?? 0), 0);
  const apresentacao = !completa ? 0 : estrutura === "ok" ? APRESENTACAO : estrutura === "parcial" ? APRESENTACAO / 2 : 0;
  const maximo = contados.reduce((s, i) => s + (valores[i] ?? 0), 0) + (completa ? APRESENTACAO : 0);
  const notaConteudo = Math.round((aspectos + apresentacao) * 100) / 100;
  const nota = Math.round(Math.max(0, notaConteudo - (6 * erros) / Math.max(1, Math.min(30, linhas))) * 100) / 100;
  const nota30 = maximo > 0 ? Math.round(((nota * 30) / maximo) * 100) / 100 : 0;
  return { notaConteudo, nota, maximo, nota30 };
}

