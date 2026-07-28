import { describe, expect, it } from "vitest";
import type { QuestaoLog } from "@/types/db";
import { corDesempenho, desempenhoGeral, desempenhoRecente } from "./desempenho";

/** Um registro de questões do dia. */
function log(data: string, total: number, acertos: number): QuestaoLog {
  return {
    id: `l-${data}-${total}`,
    data,
    total,
    acertos,
    topico_id: "t",
    materia_id: "m",
    materia_texto: null,
    origem: "clique",
    user_id: "u",
    created_at: `${data}T12:00:00Z`,
  };
}

describe("desempenhoGeral", () => {
  it("soma total e acertos de todos os registros", () => {
    const logs = [log("2026-07-10", 10, 5), log("2026-07-20", 10, 9)];
    expect(desempenhoGeral(logs)).toEqual({ total: 20, acertos: 14, pct: 70 });
  });

  it("sem registros, pct é null", () => {
    expect(desempenhoGeral([])).toEqual({ total: 0, acertos: 0, pct: null });
  });
});

describe("desempenhoRecente", () => {
  it("sem questões além da janela, não vale destacar (é igual ao geral)", () => {
    const logs = [log("2026-07-10", 10, 5), log("2026-07-20", 10, 9)];
    const r = desempenhoRecente(logs); // janela 30 > 20 questões
    expect(r).toMatchObject({ total: 20, pct: 70, vale: false, tendencia: null, anteriorPct: null });
  });

  it("com a janela cheia, mede a tendência contra as anteriores", () => {
    // 40 questões: últimas 20 = 85%; as 20 anteriores = 80% → subindo 5 p.p.
    const logs = [log("2026-07-10", 30, 24), log("2026-07-20", 10, 9)];
    const r = desempenhoRecente(logs, 20);
    expect(r).toMatchObject({
      total: 20,
      acertos: 17,
      pct: 85,
      janela: 20,
      anteriorPct: 80,
      tendencia: 5,
      vale: true,
    });
  });

  it("marca queda quando as recentes vão pior que as anteriores", () => {
    const logs = [log("2026-07-10", 20, 18), log("2026-07-20", 20, 10)];
    const r = desempenhoRecente(logs, 20);
    expect(r).toMatchObject({ pct: 50, anteriorPct: 90, tendencia: -40, vale: true });
  });

  it("tendência zero quando fica no mesmo nível", () => {
    const logs = [log("2026-07-10", 20, 16), log("2026-07-20", 20, 16)];
    expect(desempenhoRecente(logs, 20)).toMatchObject({ pct: 80, tendencia: 0, vale: true });
  });

  it("a janela de 30 só destaca quando passa de 30 questões", () => {
    expect(desempenhoRecente([log("2026-07-20", 30, 24)]).vale).toBe(false);
    const r = desempenhoRecente([log("2026-07-01", 100, 60), log("2026-07-20", 30, 27)]);
    expect(r).toMatchObject({ total: 30, pct: 90, anteriorPct: 60, tendencia: 30, vale: true });
  });
});

describe("corDesempenho", () => {
  it("troca de faixa nos limites", () => {
    expect(corDesempenho(90).texto).toBe("text-cyan");
    expect(corDesempenho(75).texto).toBe("text-green");
    expect(corDesempenho(60).texto).toBe("text-amber");
    expect(corDesempenho(30).texto).toBe("text-red");
  });
});
