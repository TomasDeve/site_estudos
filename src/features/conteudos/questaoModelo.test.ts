import { describe, expect, it } from "vitest";
import { alternativasDe } from "./questaoModelo";

describe("alternativasDe", () => {
  it("traz a explicação de cada alternativa quando existe", () => {
    expect(
      alternativasDe({
        alternativas: [
          { letra: "A", texto: "Um", explicacao: "  Certa porque sim. " },
          { letra: "B", texto: "Dois", explicacao: "" },
          { letra: "C", texto: "Três" },
        ],
      })
    ).toEqual([
      { letra: "A", texto: "Um", explicacao: "Certa porque sim." },
      { letra: "B", texto: "Dois" },
      { letra: "C", texto: "Três" },
    ]);
  });

  it("ignora entradas malformadas", () => {
    expect(alternativasDe({ alternativas: [null, { letra: "A" }, "x", { letra: "B", texto: "Ok" }] })).toEqual([
      { letra: "B", texto: "Ok" },
    ]);
    expect(alternativasDe({ alternativas: null })).toEqual([]);
  });
});
