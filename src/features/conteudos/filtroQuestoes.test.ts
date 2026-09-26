import { describe, expect, it } from "vitest";
import {
  alternarAssunto,
  alternarMateria,
  chaveFiltro,
  compilarFiltro,
  limparAssuntos,
  normalizarFiltro,
  semAcento,
  type FiltroQuestoes,
} from "./filtroQuestoes";

describe("compilarFiltro", () => {
  it("sem filtro, tudo passa", () => {
    const passa = compilarFiltro([]);
    expect(passa("penal", "t1")).toBe(true);
    expect(passa(null, null)).toBe(true);
  });

  it("matéria sem assunto marcado traz todos os assuntos dela", () => {
    const passa = compilarFiltro([{ materiaId: "penal", assuntos: [] }]);
    expect(passa("penal", "t1")).toBe(true);
    expect(passa("penal", "t2")).toBe(true);
    // registro geral da matéria (sem assunto) também conta
    expect(passa("penal", null)).toBe(true);
    expect(passa("const", "t9")).toBe(false);
  });

  it("com assuntos marcados, só entram esses assuntos daquela matéria", () => {
    const passa = compilarFiltro([
      { materiaId: "penal", assuntos: ["t1"] },
      { materiaId: "const", assuntos: [] },
    ]);
    expect(passa("penal", "t1")).toBe(true);
    expect(passa("penal", "t2")).toBe(false);
    expect(passa("penal", null)).toBe(false);
    expect(passa("const", "t9")).toBe(true);
    expect(passa("adm", "t5")).toBe(false);
    expect(passa(undefined, "t1")).toBe(false);
  });
});

describe("edição do filtro", () => {
  it("desmarcar a matéria leva junto os assuntos dela", () => {
    const f: FiltroQuestoes = [{ materiaId: "penal", assuntos: ["t1", "t2"] }];
    expect(alternarMateria(f, "penal")).toEqual([]);
    expect(alternarMateria([], "penal")).toEqual([{ materiaId: "penal", assuntos: [] }]);
  });

  it("marcar assunto de matéria não escolhida já escolhe a matéria", () => {
    expect(alternarAssunto([], "penal", "t1")).toEqual([{ materiaId: "penal", assuntos: ["t1"] }]);
  });

  it("desmarcar o último assunto mantém a matéria inteira", () => {
    const f: FiltroQuestoes = [{ materiaId: "penal", assuntos: ["t1"] }];
    expect(alternarAssunto(f, "penal", "t1")).toEqual([{ materiaId: "penal", assuntos: [] }]);
    expect(limparAssuntos([{ materiaId: "penal", assuntos: ["t1", "t2"] }], "penal")).toEqual([
      { materiaId: "penal", assuntos: [] },
    ]);
  });

  it("na página de uma matéria, matéria sem assunto não é filtro", () => {
    expect(normalizarFiltro([{ materiaId: "penal", assuntos: [] }], "penal")).toEqual([]);
    const f: FiltroQuestoes = [{ materiaId: "penal", assuntos: ["t1"] }];
    expect(normalizarFiltro(f, "penal")).toEqual(f);
    expect(normalizarFiltro([{ materiaId: "penal", assuntos: [] }])).toHaveLength(1);
  });

  it("a chave não depende da ordem de marcação", () => {
    const a: FiltroQuestoes = [
      { materiaId: "penal", assuntos: ["t2", "t1"] },
      { materiaId: "const", assuntos: [] },
    ];
    const b: FiltroQuestoes = [
      { materiaId: "const", assuntos: [] },
      { materiaId: "penal", assuntos: ["t1", "t2"] },
    ];
    expect(chaveFiltro(a)).toBe(chaveFiltro(b));
  });

  it("busca ignora acento e caixa", () => {
    expect(semAcento("Inquérito Policial")).toBe("inquerito policial");
  });
});
