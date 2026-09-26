import { describe, expect, it } from "vitest";
import { RANKS, TIERS, contarCiclo, rankDoCiclo, voltaDoCiclo } from "./cicloPlano";

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

  it("tem pelo menos 25 ranks, sem nome repetido, um por bloco", () => {
    expect(RANKS.length - 1).toBeGreaterThanOrEqual(25);
    expect(new Set(RANKS.map((r) => r.nome)).size).toBe(RANKS.length);
    RANKS.forEach((r, i) => expect(rankDoCiclo(i)).toBe(r));
  });

  it("sobe um rank por bloco: I, II e III em cada tier, até a Lenda", () => {
    expect(rankDoCiclo(0).nome).toBe("Sem rank");
    expect(rankDoCiclo(0).tier).toBeNull();
    expect(rankDoCiclo(1).nome).toBe("Bronze I");
    expect(rankDoCiclo(3).nome).toBe("Bronze III");
    expect(rankDoCiclo(4).nome).toBe("Prata I");
    expect(rankDoCiclo(8).nome).toBe("Ouro II");
    expect(rankDoCiclo(24).nome).toBe("Rubi III");
    expect(rankDoCiclo(25).nome).toBe("Mestre");
    expect(rankDoCiclo(26).nome).toBe("Grão-Mestre");
    expect(rankDoCiclo(27).nome).toBe("Lenda");
    expect(rankDoCiclo(60)).toBe(rankDoCiclo(27));
    expect(TIERS[TIERS.length - 1].nome).toBe("Lenda");
  });

  it("a volta fecha quando todas as matérias entraram; quem repete já conta na próxima", () => {
    expect(voltaDoCiclo([0, 0, 0])).toEqual({ completas: 0, atual: 1, naVolta: 0 });
    expect(voltaDoCiclo([1, 0, 0])).toEqual({ completas: 0, atual: 1, naVolta: 1 });
    expect(voltaDoCiclo([1, 1, 1])).toEqual({ completas: 1, atual: 2, naVolta: 0 });
    expect(voltaDoCiclo([2, 1, 1])).toEqual({ completas: 1, atual: 2, naVolta: 1 });
    expect(voltaDoCiclo([])).toEqual({ completas: 0, atual: 1, naVolta: 0 });
  });
});
