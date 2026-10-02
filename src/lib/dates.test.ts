import { describe, expect, it } from "vitest";
import { fmtMesesSemanasAte } from "./dates";

describe("fmtMesesSemanasAte", () => {
  const hoje = new Date(2026, 9, 2, 15, 30); // 02/10/2026, à tarde

  it("conta meses de calendário e semanas, com a sobra em dias", () => {
    // 156 dias: 02/10 → 02/03 são 5 meses, +5 dias; 156 = 22 semanas + 2 dias
    expect(fmtMesesSemanasAte("2027-03-07", hoje)).toBe("5 meses e 5 dias · 22 semanas e 2 dias");
  });

  it("omite a sobra quando é exata e usa o singular", () => {
    expect(fmtMesesSemanasAte("2026-11-02", hoje)).toBe("1 mês · 4 semanas e 3 dias");
    expect(fmtMesesSemanasAte("2026-10-09", hoje)).toBe("7 dias · 1 semana");
  });

  it("fica vazio no dia da prova e depois dela", () => {
    expect(fmtMesesSemanasAte("2026-10-02", hoje)).toBe("");
    expect(fmtMesesSemanasAte("2026-09-30", hoje)).toBe("");
  });
});
