import { describe, expect, it } from "vitest";
import { CORINGAS, tipoDoAspecto } from "./coringas";
import { TEMAS, linhasNaFolha, notaConteudo, notaFinal, pontosDoParagrafo, sortear } from "./paragrafos";

describe("banco de temas", () => {
  it("tem os 34 temas com 3 aspectos e esqueleto", () => {
    expect(TEMAS).toHaveLength(34);
    for (const t of TEMAS) {
      expect(t.aspectos).toHaveLength(3);
      expect(t.esqueleto.p1.length).toBeGreaterThan(0);
      expect(t.esqueleto.p2.length).toBeGreaterThan(0);
      expect(t.esqueleto.fim.length).toBeGreaterThan(0);
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
  it("estima as linhas pela folha (62 caracteres por linha, com recuo)", () => {
    expect(linhasNaFolha("")).toBe(0);
    expect(linhasNaFolha("a".repeat(59))).toBe(1);
    expect(linhasNaFolha("a".repeat(60))).toBe(2);
  });

  it("desconta erros como a Cebraspe, em escala 10", () => {
    expect(notaFinal(9, 0, 8)).toBe(9);
    expect(notaFinal(9, 2, 8)).toBe(8.5);
    expect(notaFinal(1, 10, 2)).toBe(0);
  });

  it("soma os critérios sem passar do máximo", () => {
    expect(notaConteudo([{ pontos: 6, max: 6 }, { pontos: 3, max: 2 }, { pontos: 1.5, max: 2 }])).toBe(9.5);
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
