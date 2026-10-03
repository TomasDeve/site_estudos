import { describe, expect, it } from "vitest";
import { notaCebraspe } from "./redacaoNota";

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
