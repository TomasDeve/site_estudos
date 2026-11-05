import { describe, expect, it } from "vitest";
import { TEMAS } from "./paragrafos";
import { PLANO_SEMANA, PROPOSTAS_SEMANA, diaDoPlano, posicaoDoTema, semanaDe } from "./semanas";

describe("propostas da semana", () => {
  it("são 15 temas do banco, sem repetir, todos com modelo", () => {
    expect(PROPOSTAS_SEMANA).toHaveLength(15);
    const ids = PROPOSTAS_SEMANA.map((p) => p.temaId);
    expect(new Set(ids).size).toBe(15);
    for (const id of ids) {
      const tema = TEMAS.find((t) => t.id === id);
      expect(tema, id).toBeDefined();
      expect(tema!.modelo.intro.length).toBeGreaterThan(100);
    }
    expect(posicaoDoTema("b05a")).toBe(1);
    expect(posicaoDoTema("e1")).toBeNull();
  });

  it("o plano cobre os 4 parágrafos da redação", () => {
    const partes = PLANO_SEMANA.flatMap((p) => (p.parte ? [`${p.parte.tipo}:${p.parte.aspecto}`] : []));
    expect(partes).toEqual(["introducao:null", "desenvolvimento:0", "desenvolvimento:1", "conclusao:2"]);
  });
});

describe("semana de estudo", () => {
  it("começa na segunda e, antes das 6h, ainda vale o dia anterior", () => {
    expect(semanaDe(new Date(2026, 10, 5, 15))).toBe("2026-11-02"); // quinta
    expect(semanaDe(new Date(2026, 10, 8, 23))).toBe("2026-11-02"); // domingo
    expect(semanaDe(new Date(2026, 10, 9, 3))).toBe("2026-11-02"); // segunda de madrugada = domingo
    expect(semanaDe(new Date(2026, 10, 9, 8))).toBe("2026-11-09");
    expect(diaDoPlano(new Date(2026, 10, 9, 3))).toBe("dom");
    expect(diaDoPlano(new Date(2026, 10, 7, 12))).toBe("sab");
  });
});
