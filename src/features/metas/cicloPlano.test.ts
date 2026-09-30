import { describe, expect, it } from "vitest";
import type { QuestaoLog } from "@/types/db";
import {
  RANKS,
  contarCiclo,
  desempenhoDoCiclo,
  ordenarCiclo,
  rankPorAcerto,
  voltaDoCiclo,
} from "./cicloPlano";

const bloco = (data: string, materia_id: string | null, feita = false, minutos?: number) => ({
  data,
  materia_id,
  feita,
  minutos,
});

describe("ciclo das matérias", () => {
  it("conta os blocos de cada matéria, feitos ou não, com o tempo somado", () => {
    const c = contarCiclo(
      [
        bloco("2026-09-26", "port", true),
        bloco("2026-09-26", "port", false, 45),
        bloco("2026-09-27", "rlm"),
      ],
      null
    );
    expect(c.get("port")).toEqual({ blocos: 2, feitos: 1, minutos: 75 });
    expect(c.get("rlm")).toEqual({ blocos: 1, feitos: 0, minutos: 30 });
    expect(c.has("conta")).toBe(false);
  });

  it("bloco sem matéria (texto livre) não entra no ciclo", () => {
    expect(contarCiclo([bloco("2026-09-26", null)], null).size).toBe(0);
  });

  it("com início, só conta do dia do início em diante", () => {
    const c = contarCiclo(
      [bloco("2026-09-25", "port"), bloco("2026-09-26", "port"), bloco("2026-10-02", "port")],
      "2026-09-26"
    );
    expect(c.get("port")?.blocos).toBe(2);
  });

  it("tem 12 ranks (Bronze, Prata, Ouro, Diamante), com o mínimo subindo", () => {
    expect(RANKS.length - 1).toBe(12);
    expect(new Set(RANKS.map((r) => r.nome)).size).toBe(RANKS.length);
    for (let i = 2; i < RANKS.length; i++) expect(RANKS[i].minimo).toBeGreaterThan(RANKS[i - 1].minimo);
  });

  it("o rank sai do % de acerto: Diamante III a partir de 95%", () => {
    expect(rankPorAcerto(null).nome).toBe("Sem rank");
    expect(rankPorAcerto(null).tier).toBeNull();
    expect(rankPorAcerto(0).nome).toBe("Bronze I");
    expect(rankPorAcerto(49).nome).toBe("Bronze I");
    expect(rankPorAcerto(50).nome).toBe("Bronze II");
    expect(rankPorAcerto(60).nome).toBe("Prata I");
    expect(rankPorAcerto(75).nome).toBe("Ouro I");
    expect(rankPorAcerto(87).nome).toBe("Ouro III");
    expect(rankPorAcerto(88).nome).toBe("Diamante I");
    expect(rankPorAcerto(94).nome).toBe("Diamante II");
    expect(rankPorAcerto(95).nome).toBe("Diamante III");
    expect(rankPorAcerto(100).nome).toBe("Diamante III");
  });

  it("desempenho: últimas 50 da matéria, assunto conta pra matéria dele, mínimo de 10", () => {
    const log = (data: string, total: number, acertos: number, o: Partial<QuestaoLog>) =>
      ({ data, total, acertos, created_at: data, topico_id: null, materia_id: null, ...o }) as QuestaoLog;
    const d = desempenhoDoCiclo(
      [
        log("2026-09-01", 40, 0, { topico_id: "t1" }), // antigo: sai da janela em parte
        log("2026-09-20", 30, 30, { topico_id: "t1" }),
        log("2026-09-21", 10, 9, { materia_id: "port" }),
        log("2026-09-21", 5, 5, { materia_id: "rlm" }),
      ],
      new Map([["t1", "port"]])
    );
    // 30 + 10 recentes (39 acertos) + 10 das 40 antigas (0) = 39/50
    expect(d.get("port")).toMatchObject({ total: 50, acertos: 39, pct: 78 });
    expect(d.get("port")?.rank.nome).toBe("Ouro I");
    expect(d.get("rlm")).toMatchObject({ total: 5, pct: null });
    expect(d.get("rlm")?.rank.nome).toBe("Sem rank");
  });


  it("a volta fecha quando todas as matérias entraram; quem repete já conta na próxima", () => {
    expect(voltaDoCiclo([0, 0, 0])).toEqual({ completas: 0, atual: 1, naVolta: 0 });
    expect(voltaDoCiclo([1, 0, 0])).toEqual({ completas: 0, atual: 1, naVolta: 1 });
    expect(voltaDoCiclo([1, 1, 1])).toEqual({ completas: 1, atual: 2, naVolta: 0 });
    expect(voltaDoCiclo([2, 1, 1])).toEqual({ completas: 1, atual: 2, naVolta: 1 });
    expect(voltaDoCiclo([])).toEqual({ completas: 0, atual: 1, naVolta: 0 });
  });

  it("ordem do ciclo: a arrastada vale; matéria nova vai pro fim e id que saiu é ignorado", () => {
    const edital = ["a", "b", "c", "d"].map((id) => ({ id }));
    const ids = (ms: { id: string }[]) => ms.map((m) => m.id);
    expect(ids(ordenarCiclo(edital, null))).toEqual(["a", "b", "c", "d"]);
    expect(ids(ordenarCiclo(edital, []))).toEqual(["a", "b", "c", "d"]);
    expect(ids(ordenarCiclo(edital, ["c", "a", "d", "b"]))).toEqual(["c", "a", "d", "b"]);
    // "b" e "d" não estavam na ordem gravada (entraram depois): vão pro fim, na ordem do edital
    expect(ids(ordenarCiclo(edital, ["c", "a"]))).toEqual(["c", "a", "b", "d"]);
    // "x" saiu do concurso (riscada): some
    expect(ids(ordenarCiclo(edital, ["x", "d", "c", "b", "a"]))).toEqual(["d", "c", "b", "a"]);
  });
});
