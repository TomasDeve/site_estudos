import { describe, expect, it } from "vitest";
import { CORINGAS, tipoDoAspecto } from "./coringas";
import {
  TEMAS,
  linhasNaFolha,
  metaDasPartes,
  notaDaRedacao,
  notaDoConceito,
  notaFinal,
  pontosDoParagrafo,
  sortear,
} from "./paragrafos";

describe("banco de temas", () => {
  it("tem os 34 temas com 3 aspectos e esqueleto", () => {
    expect(TEMAS).toHaveLength(34);
    for (const t of TEMAS) {
      expect(t.aspectos).toHaveLength(3);
      expect(t.esqueleto.p1.length).toBeGreaterThan(0);
      expect(t.esqueleto.p2.length).toBeGreaterThan(0);
      expect(t.esqueleto.fim.length).toBeGreaterThan(0);
      for (const parte of [t.modelo.intro, t.modelo.p1, t.modelo.p2, t.modelo.fim]) expect(parte.length).toBeGreaterThan(150);
      expect(t.modelo.p1.startsWith("Inicialmente, cabe destacar")).toBe(true);
      expect(t.modelo.p2.startsWith("Em seguida, vale dissertar")).toBe(true);
      expect(t.modelo.fim.startsWith("Por fim, é preciso")).toBe(true);
      for (const parte of ["p1", "p2", "fim"] as const) {
        expect(t.embasamento[parte]).toHaveLength(t.esqueleto[parte].length);
        for (const e of t.embasamento[parte]) expect(e.length).toBeGreaterThan(30);
      }
    }
    expect(new Set(TEMAS.map((t) => t.id)).size).toBe(TEMAS.length);
  });

  it("pega os pontos do parágrafo certo", () => {
    const t = TEMAS[0];
    expect(pontosDoParagrafo(t, "introducao", null)).toBe(t.esqueleto.abre);
    expect(pontosDoParagrafo(t, "desenvolvimento", 1)).toBe(t.esqueleto.p2);
    expect(pontosDoParagrafo(t, "conclusao", 2)).toBe(t.esqueleto.fim);
  });
});

describe("tipoDoAspecto", () => {
  it("reconhece os tipos pelas palavras do enunciado", () => {
    expect(tipoDoAspecto("exemplos de programas de prevenção da violência já implementados")).toBe("ex");
    expect(tipoDoAspecto("medidas de prevenção e de repressão aos golpes digitais")).toBe("sol");
    expect(tipoDoAspecto("fatores que explicam o crescimento dos golpes digitais")).toBe("causa");
    expect(tipoDoAspecto("possíveis impactos da integração dos sistemas")).toBe("cons");
    expect(tipoDoAspecto("cenário atual da violência letal no país")).toBe("cenario");
  });

  it("todo tipo tem frase em pelo menos 4 coringas", () => {
    for (const tipo of ["cenario", "causa", "cons", "sol", "ex"] as const) {
      expect(CORINGAS.filter((c) => c.frases[tipo]).length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("linhas e nota", () => {
  it("estima as linhas pela folha (66 caracteres por linha, com recuo)", () => {
    expect(linhasNaFolha("")).toBe(0);
    expect(linhasNaFolha("a".repeat(63))).toBe(1);
    expect(linhasNaFolha("a".repeat(64))).toBe(2);
  });

  it("conta as linhas de cada parágrafo na redação inteira", () => {
    expect(linhasNaFolha(`${"a".repeat(63)}\n\n${"b".repeat(64)}`)).toBe(3);
  });

  it("dá a nota da redação inteira de 0 a 30, como a Cebraspe", () => {
    const valores = [8.5, 10, 10];
    expect(notaDaRedacao([3, 3, 3], valores, "ok", 0, 28)).toEqual({ notaConteudo: 30, nota: 30, maximo: 30, nota30: 30 });
    expect(notaDaRedacao([3, 2, 3], valores, "parcial", 3, 30)).toMatchObject({ notaConteudo: 25.92, nota: 25.32 });
    expect(notaDaRedacao([0, 0, 0], valores, "faltou", 10, 20).nota).toBe(0);
  });

  it("só alguns parágrafos: conta os aspectos deles e traz para a escala 30", () => {
    // introdução + 2 desenvolvimentos: aspectos 1 e 2 (8,50 + 10), sem a estrutura
    const r = notaDaRedacao([3, 3, 0], [8.5, 10, 10], "ok", 0, 22, ["intro", "p1", "p2"]);
    expect(r).toEqual({ notaConteudo: 18.5, nota: 18.5, maximo: 18.5, nota30: 30 });
    expect(metaDasPartes(["intro", "p1", "p2"])).toEqual([20, 23]);
    expect(metaDasPartes(["intro", "p1", "p2", "fim"])).toEqual([27, 30]);
  });

  it("desconta erros como a Cebraspe, em escala 10", () => {
    expect(notaFinal(9, 0, 8)).toBe(9);
    expect(notaFinal(9, 2, 8)).toBe(8.5);
    expect(notaFinal(1, 10, 2)).toBe(0);
  });

  it("converte o conceito como o quesito da banca", () => {
    expect(notaDoConceito(3)).toBe(10);
    expect(notaDoConceito(2)).toBe(6.67);
    expect(notaDoConceito(1)).toBe(3.33);
    expect(notaDoConceito(0)).toBe(0);
  });
});

describe("sortear", () => {
  it("evita o tema e o aspecto que já saíram", () => {
    const recentes = TEMAS.flatMap((t) => [
      { tipo: "desenvolvimento", tema_id: t.id, aspecto: 0 },
      ...(t.id === "e5" ? [] : [{ tipo: "desenvolvimento", tema_id: t.id, aspecto: 1 }]),
    ]);
    const s = sortear("desenvolvimento", recentes, () => 0.5);
    expect(s.tema.id).toBe("e5");
    expect(s.aspecto).toBe(1);
  });

  it("conclusão sempre responde ao 3º aspecto", () => {
    expect(sortear("conclusao", []).aspecto).toBe(2);
    expect(sortear("introducao", []).aspecto).toBeNull();
  });
});
