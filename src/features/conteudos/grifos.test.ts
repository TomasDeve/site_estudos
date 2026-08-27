import { describe, expect, it } from "vitest";
import {
  unir,
  fatiar,
  partesDeTexto,
  grifosDoCampo,
  comCampoAtualizado,
  type Grifo,
} from "./grifos";

describe("unir (junta grifos)", () => {
  it("funde sobreposições", () => {
    expect(unir([[0, 5], [3, 8]])).toEqual([[0, 8]]);
  });
  it("funde intervalos que se encostam", () => {
    expect(unir([[0, 5], [5, 9]])).toEqual([[0, 9]]);
  });
  it("mantém intervalos separados e ordena", () => {
    expect(unir([[5, 8], [0, 3]])).toEqual([[0, 3], [5, 8]]);
  });
  it("descarta intervalos vazios/invertidos", () => {
    expect(unir([[4, 4], [2, 1], [0, 3]])).toEqual([[0, 3]]);
  });
});

describe("fatiar (posiciona os grifos no texto)", () => {
  it("parte no meio, com data-rs correto", () => {
    expect(fatiar("abcdefgh", 0, [[2, 5]])).toEqual([
      { ini: 0, texto: "ab", grifado: false },
      { ini: 2, texto: "cde", grifado: true },
      { ini: 5, texto: "fgh", grifado: false },
    ]);
  });
  it("respeita o deslocamento base (trecho que não começa em 0)", () => {
    // "world" começa no caractere 6 de "hello world"; grifo em [8,10) = "rl"
    expect(fatiar("world", 6, [[8, 10]])).toEqual([
      { ini: 6, texto: "wo", grifado: false },
      { ini: 8, texto: "rl", grifado: true },
      { ini: 10, texto: "d", grifado: false },
    ]);
  });
  it("ignora grifo fora do trecho", () => {
    expect(fatiar("abc", 0, [[10, 20]])).toEqual([{ ini: 0, texto: "abc", grifado: false }]);
  });
  it("clampa grifo que passa das bordas do trecho", () => {
    expect(fatiar("abc", 5, [[0, 100]])).toEqual([{ ini: 5, texto: "abc", grifado: true }]);
  });
});

describe("partesDeTexto (texto associado com imagem)", () => {
  it("separa texto e imagem preservando os deslocamentos", () => {
    const raw = "abc[imagem: http://x/1.png]def";
    expect(partesDeTexto(raw)).toEqual([
      { tipo: "texto", texto: "abc", base: 0 },
      { tipo: "img", url: "http://x/1.png" },
      { tipo: "texto", texto: "def", base: raw.length - 3 },
    ]);
  });
  it("passagem que é só imagem não gera parte de texto", () => {
    expect(partesDeTexto("[imagem: http://x/1.png]")).toEqual([
      { tipo: "img", url: "http://x/1.png" },
    ]);
  });
  it("texto puro vira uma parte base 0, sem trim (offsets exatos)", () => {
    expect(partesDeTexto("  oi  ")).toEqual([{ tipo: "texto", texto: "  oi  ", base: 0 }]);
  });
});

describe("grifosDoCampo (lê do jsonb solto, validando)", () => {
  it("lê o campo certo", () => {
    const g = { texto_associado: [[1, 4]], enunciado: [[0, 2]] };
    expect(grifosDoCampo(g, "enunciado")).toEqual([[0, 2]]);
  });
  it("descarta formatos inválidos", () => {
    const g = { enunciado: [[0, 2], [5], "x", [3, 3], [2, 1]] };
    expect(grifosDoCampo(g, "enunciado")).toEqual([[0, 2]]);
  });
  it("null/ausente vira lista vazia", () => {
    expect(grifosDoCampo(null, "enunciado")).toEqual([]);
    expect(grifosDoCampo({}, "texto_associado")).toEqual([]);
  });
});

describe("comCampoAtualizado (monta o jsonb pra salvar)", () => {
  it("atualiza um campo preservando o outro", () => {
    const antes = { enunciado: [[0, 2]] as unknown as Grifo[] };
    expect(comCampoAtualizado(antes, "texto_associado", [[3, 7]])).toEqual({
      enunciado: [[0, 2]],
      texto_associado: [[3, 7]],
    });
  });
  it("remove o campo quando fica vazio e vira null se não sobra nada", () => {
    expect(comCampoAtualizado({ enunciado: [[0, 2]] }, "enunciado", [])).toBeNull();
  });
  it("remove só o campo esvaziado, mantendo o resto", () => {
    const antes = { enunciado: [[0, 2]], texto_associado: [[3, 7]] };
    expect(comCampoAtualizado(antes, "enunciado", [])).toEqual({ texto_associado: [[3, 7]] });
  });
});
