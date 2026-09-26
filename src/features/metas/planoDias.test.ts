import { describe, expect, it } from "vitest";
import {
  atividadeDe,
  blocosVisiveis,
  diasDoPlano,
  rotuloDoBloco,
  rotuloDoDia,
  somarDias,
  tempoDosBlocos,
} from "./planoDias";

describe("plano de 6 dias", () => {
  it("gera 6 dias seguidos a partir do início, virando o mês", () => {
    expect(diasDoPlano("2026-09-28")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });

  it("anda de 6 em 6 dias para os lados", () => {
    expect(somarDias("2026-09-25", 6)).toBe("2026-10-01");
    expect(somarDias("2026-09-25", -6)).toBe("2026-09-19");
  });

  it("rotula hoje, amanhã, ontem e o resto pelo dia da semana (sem '-feira')", () => {
    const hoje = "2026-09-25"; // sexta
    expect(rotuloDoDia(hoje, hoje)).toEqual({ nome: "Hoje", data: "25/09" });
    expect(rotuloDoDia("2026-09-26", hoje).nome).toBe("Amanhã");
    expect(rotuloDoDia("2026-09-24", hoje).nome).toBe("Ontem");
    expect(rotuloDoDia("2026-09-28", hoje)).toEqual({ nome: "Segunda", data: "28/09" });
    expect(rotuloDoDia("2026-09-27", hoje).nome).toBe("Domingo");
  });

  it("atividade desconhecida cai em Teoria", () => {
    expect(atividadeDe("questoes").label).toBe("Questões");
    expect(atividadeDe("xyz").chave).toBe("teoria");
  });

  it("começa com 6 blocos, soma os acrescentados e nunca esconde bloco preenchido", () => {
    expect(blocosVisiveis(0, 0)).toBe(6);
    expect(blocosVisiveis(2, 0)).toBe(8);
    expect(blocosVisiveis(0, 9)).toBe(9);
    expect(blocosVisiveis(1, 9)).toBe(9);
    expect(blocosVisiveis(40, 0)).toBe(16);
  });

  it("blocos de meia hora viram tempo no estilo 1h30", () => {
    expect(tempoDosBlocos(0)).toBe("0");
    expect(tempoDosBlocos(1)).toBe("30min");
    expect(tempoDosBlocos(3)).toBe("1h30");
    expect(rotuloDoBloco(2)).toBe("1h");
    expect(rotuloDoBloco(6)).toBe("3h");
  });
});
