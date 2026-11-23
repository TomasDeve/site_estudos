import { describe, expect, it } from "vitest";
import { agoraNoFuso, descreverDias, proximoAperto } from "./agenda";

// 2026-11-23 10:00 em Recife (UTC-3) = 13:00 UTC; 23/11/2026 é segunda-feira (dow 1)
const SEG_10H = new Date("2026-11-23T13:00:00Z");

describe("agoraNoFuso", () => {
  it("converte para o fuso de Recife", () => {
    expect(agoraNoFuso(SEG_10H)).toEqual({ dow: 1, minuto: 600 });
  });
  it("vira o dia pelo fuso, não pelo UTC", () => {
    // 01:30 UTC de terça = 22:30 de segunda em Recife
    expect(agoraNoFuso(new Date("2026-11-24T01:30:00Z"))).toEqual({ dow: 1, minuto: 22 * 60 + 30 });
  });
});

describe("proximoAperto", () => {
  it("pega o próximo de hoje", () => {
    const r = proximoAperto(
      [
        { hora: "07:00:00", dias: [0, 1, 2, 3, 4, 5, 6], ativo: true },
        { hora: "18:30:00", dias: [1], ativo: true },
      ],
      SEG_10H
    );
    expect(r).toEqual({ emDias: 0, hora: "18:30", dow: 1 });
  });
  it("passa para outro dia quando o de hoje já foi", () => {
    const r = proximoAperto([{ hora: "07:00:00", dias: [3], ativo: true }], SEG_10H);
    expect(r).toEqual({ emDias: 2, hora: "07:00", dow: 3 });
  });
  it("mesmo dia da semana que já passou vai para a semana que vem", () => {
    const r = proximoAperto([{ hora: "09:00:00", dias: [1], ativo: true }], SEG_10H);
    expect(r).toEqual({ emDias: 7, hora: "09:00", dow: 1 });
  });
  it("ignora desligados", () => {
    expect(proximoAperto([{ hora: "11:00:00", dias: [1], ativo: false }], SEG_10H)).toBeNull();
  });
  it("o minuto atual ainda conta", () => {
    const r = proximoAperto([{ hora: "10:00:00", dias: [1], ativo: true }], SEG_10H);
    expect(r).toEqual({ emDias: 0, hora: "10:00", dow: 1 });
  });
});

describe("descreverDias", () => {
  it("resume os casos comuns", () => {
    expect(descreverDias([0, 1, 2, 3, 4, 5, 6])).toBe("Todo dia");
    expect(descreverDias([5, 4, 3, 2, 1])).toBe("Seg a sex");
    expect(descreverDias([6, 0])).toBe("Fim de semana");
    expect(descreverDias([1, 3, 5])).toBe("Seg, Qua, Sex");
  });
});
