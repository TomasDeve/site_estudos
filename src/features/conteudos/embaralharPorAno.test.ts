import { describe, expect, it } from "vitest";
import { embaralharPorAno, ordenarPorAno } from "./embaralhar";
import { anoDaFonte } from "./fonteQuestao";

type Q = { id: string; ano: number | null };
const anoDe = (q: Q) => q.ano;
const lote = (ano: number | null, n: number): Q[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${ano}-${i}`, ano }));

describe("ordenarPorAno", () => {
  it("mais recentes primeiro, estável, sem ano no fim", () => {
    const itens = [...lote(2024, 2), ...lote(null, 1), ...lote(2026, 2), ...lote(2025, 1)];
    expect(ordenarPorAno(itens, anoDe).map((q) => q.id)).toEqual([
      "2026-0", "2026-1", "2025-0", "2024-0", "2024-1", "null-0",
    ]);
  });
});

describe("embaralharPorAno", () => {
  const itens = [...lote(2022, 30), ...lote(2026, 30), ...lote(2024, 30), ...lote(2025, 30)];

  it("só mistura anos vizinhos: nunca um ano mais antigo antes de dois anos acima", () => {
    for (const semente of [1, 7, 42, 999, 123456]) {
      const out = embaralharPorAno(itens, semente, anoDe);
      const rank = new Map([[2026, 0], [2025, 1], [2024, 2], [2022, 3]]);
      // nenhum item de rank r aparece depois de um item de rank r+2 ou maior
      let maxVisto = -1;
      for (const q of out) {
        const r = rank.get(q.ano!)!;
        expect(maxVisto - r).toBeLessThan(2);
        maxVisto = Math.max(maxVisto, r);
      }
      expect(out[0].ano).toBeGreaterThanOrEqual(2025);
      expect(out.at(-1)!.ano).toBeLessThanOrEqual(2024);
    }
  });

  it("é determinístico pela semente e realmente mistura", () => {
    expect(embaralharPorAno(itens, 5, anoDe)).toEqual(embaralharPorAno(itens, 5, anoDe));
    expect(embaralharPorAno(itens, 5, anoDe)).not.toEqual(embaralharPorAno(itens, 6, anoDe));
  });
});

describe("anoDaFonte", () => {
  it("tira o ano sem confundir com o código Q", () => {
    expect(anoDaFonte("Q2985893 (CESPE / CEBRASPE) · 2006 · Técnico")).toBe(2006);
    expect(anoDaFonte("Simulado 2 DSO · nº 63")).toBeNull();
    expect(anoDaFonte(null)).toBeNull();
  });
});
