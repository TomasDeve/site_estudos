import { describe, expect, it } from "vitest";
import { distribuirIgual, distribuirInteiro, distribuirPorPeso, somaHoras } from "./horas";

describe("distribuirInteiro", () => {
  it("reparte minutos igualmente quando divide certo", () => {
    expect(distribuirInteiro(30, 3)).toEqual([10, 10, 10]);
  });

  it("dá o resto às primeiras partes e mantém a soma exata", () => {
    const r = distribuirInteiro(25, 3);
    expect(r).toEqual([9, 8, 8]);
    expect(r.reduce((a, b) => a + b, 0)).toBe(25);
  });

  it("tudo para um único assunto", () => {
    expect(distribuirInteiro(30, 1)).toEqual([30]);
  });

  it("total zero zera todas as partes", () => {
    expect(distribuirInteiro(0, 3)).toEqual([0, 0, 0]);
  });

  it("sem partes devolve lista vazia", () => {
    expect(distribuirInteiro(30, 0)).toEqual([]);
  });
});

describe("distribuirIgual", () => {
  it("reparte em partes iguais quando divide certo", () => {
    expect(distribuirIgual(20, 4)).toEqual([5, 5, 5, 5]);
  });

  it("fecha a conta em passos de meia-hora quando não divide certo", () => {
    const r = distribuirIgual(20, 3);
    expect(somaHoras(r)).toBe(20);
    expect(r.every((h) => h * 2 === Math.round(h * 2))).toBe(true); // múltiplos de 0,5
  });

  it("total zero zera todas as partes", () => {
    expect(distribuirIgual(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("sem partes devolve lista vazia", () => {
    expect(distribuirIgual(10, 0)).toEqual([]);
  });
});

describe("distribuirPorPeso", () => {
  it("reparte proporcional aos pesos", () => {
    expect(distribuirPorPeso(30, [2, 1])).toEqual([20, 10]);
  });

  it("pesos iguais = distribuição igual", () => {
    expect(distribuirPorPeso(30, [1, 1, 1])).toEqual([10, 10, 10]);
  });

  it("soma de pesos zero cai para igual", () => {
    expect(distribuirPorPeso(10, [0, 0])).toEqual([5, 5]);
  });

  it("mantém a soma exata mesmo com sobra", () => {
    const r = distribuirPorPeso(21, [3, 2, 1]);
    expect(somaHoras(r)).toBe(21);
  });
});
