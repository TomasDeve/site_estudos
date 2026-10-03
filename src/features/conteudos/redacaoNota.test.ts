import { describe, expect, it } from "vitest";
import { notaCebraspe, promptCorrecao } from "./redacaoNota";

describe("notaCebraspe", () => {
  it("aplica NC − 6 × NE ÷ TL", () => {
    // 24 − 6 × 5 ÷ 30 = 23
    expect(notaCebraspe(24, 5, 30, 30)).toBe(23);
    // 20 − 6 × 3 ÷ 25 = 19,28
    expect(notaCebraspe(20, 3, 25, 30)).toBe(19.28);
  });

  it("escrever menos faz cada erro pesar mais", () => {
    expect(notaCebraspe(20, 4, 15, 30)!).toBeLessThan(notaCebraspe(20, 4, 30, 30)!);
  });

  it("limita NC à nota máxima e zera nota negativa", () => {
    expect(notaCebraspe(35, 0, 30, 30)).toBe(30);
    expect(notaCebraspe(2, 20, 10, 30)).toBe(0);
  });

  it("fica null enquanto falta algum número", () => {
    expect(notaCebraspe(20, null, 30, 30)).toBeNull();
    expect(notaCebraspe(20, 2, 0, 30)).toBeNull();
  });
});

describe("promptCorrecao", () => {
  const regra = {
    notaMax: 30,
    minimo: 15,
    linhas: 30,
    formulaCebraspe: true,
    descricao: "Redação de até 30 linhas",
  };

  it("pede NC, NE, TL e a linha-resumo quando a banca usa a fórmula", () => {
    const p = promptCorrecao("Tráfico de drogas", regra);
    expect(p).toContain("Tema proposto: Tráfico de drogas.");
    expect(p).toContain("NC (0 a 30)");
    expect(p).toContain("mínimo para não ser eliminado é 15");
    expect(p).toContain("NC: x | NE: y | TL: z | NPD: w");
  });

  it("sem regra nem tema, faz um pedido genérico", () => {
    const p = promptCorrecao("  ");
    expect(p).not.toContain("Tema proposto");
    expect(p).not.toContain("NPD");
  });
});
