import { describe, expect, it } from "vitest";
import {
  atividadeDe,
  blocosQueDescem,
  blocosVisiveis,
  diasDoPlano,
  lerQuantosDias,
  ROTULO_BLOCO,
  fmtTempo,
  lerMinutos,
  minutosDe,
  rotuloDoDia,
  somarDias,
} from "./planoDias";

describe("plano dos próximos dias", () => {
  it("gera 3 dias seguidos a partir do início, virando o mês", () => {
    expect(diasDoPlano("2026-09-29", 3)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
    expect(diasDoPlano("2026-09-29", 9)).toHaveLength(9);
  });

  it("lê a quantidade de dias salva e cai em 3 se for inválida", () => {
    expect(lerQuantosDias("6")).toBe(6);
    expect(lerQuantosDias("9")).toBe(9);
    expect(lerQuantosDias("4")).toBe(3);
    expect(lerQuantosDias(null)).toBe(3);
  });

  it("anda de 3 em 3 dias para os lados", () => {
    expect(somarDias("2026-09-29", 3)).toBe("2026-10-02");
    expect(somarDias("2026-09-29", -3)).toBe("2026-09-26");
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

  it("replicar: a cópia entra logo abaixo e só a sequência colada desce", () => {
    expect(blocosQueDescem([1], 1)).toEqual([]); // 2 livre: nada desce
    expect(blocosQueDescem([1, 2, 3], 1)).toEqual([3, 2]); // de baixo pra cima
    expect(blocosQueDescem([1, 2, 4], 1)).toEqual([2]); // o 3 livre absorve
    expect(blocosQueDescem([16], 16)).toBeNull(); // cópia cairia no 17º
    expect(blocosQueDescem([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], 3)).toBeNull();
  });

  it("blocos de meia hora viram tempo no estilo 1h30", () => {
    expect(fmtTempo(0)).toBe("0");
    expect(fmtTempo(30)).toBe("30min");
    expect(fmtTempo(90)).toBe("1h30");
    expect(ROTULO_BLOCO).toBe("30min");
    expect(minutosDe({})).toBe(30); // bloco sem tempo próprio (antes da 0035)
    expect(minutosDe({ minutos: 45 })).toBe(45);
  });

  it("lê o tempo digitado: número é minuto, com h ou : é hora", () => {
    expect(lerMinutos("45")).toBe(45);
    expect(lerMinutos("45min")).toBe(45);
    expect(lerMinutos(" 20 min ")).toBe(20);
    expect(lerMinutos("1h")).toBe(60);
    expect(lerMinutos("1h30")).toBe(90);
    expect(lerMinutos("1:15")).toBe(75);
    expect(lerMinutos("2H")).toBe(120);
    expect(lerMinutos("")).toBeNull();
    expect(lerMinutos("0")).toBeNull();
    expect(lerMinutos("700")).toBeNull();
    expect(lerMinutos("1h75")).toBeNull();
    expect(lerMinutos("abc")).toBeNull();
  });
});
