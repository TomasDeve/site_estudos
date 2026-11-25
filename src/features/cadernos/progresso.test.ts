import { describe, expect, it } from "vitest";
import { pctCaderno, pctGeral, situacaoDosCapitulos } from "./progresso";

const caderno = {
  total_paginas: 100,
  pagina_atual: 40,
  capitulos: [
    { n: 2, titulo: "Dois", pagina: 30 },
    { n: 1, titulo: "Um", pagina: 5 },
    { n: 3, titulo: "Três", pagina: 60 },
    { n: null, titulo: "Simulado final", pagina: 90 },
  ],
};

describe("situacaoDosCapitulos", () => {
  it("ordena pela página e marca visto, em andamento e falta", () => {
    const r = situacaoDosCapitulos(caderno);
    expect(r.map((c) => [c.titulo, c.ate, c.situacao])).toEqual([
      ["Um", 29, "visto"],
      ["Dois", 59, "andamento"],
      ["Três", 89, "falta"],
      ["Simulado final", 100, "falta"],
    ]);
  });
  it("a última página do capítulo fecha o capítulo", () => {
    const r = situacaoDosCapitulos({ ...caderno, pagina_atual: 59 });
    expect(r[1].situacao).toBe("visto");
    expect(r[2].situacao).toBe("falta");
  });
  it("sem começar, nada visto", () => {
    expect(situacaoDosCapitulos({ ...caderno, pagina_atual: 0 }).every((c) => c.situacao === "falta")).toBe(true);
  });
});

describe("porcentagem", () => {
  it("por caderno e somando as páginas de todos", () => {
    expect(pctCaderno(caderno)).toBe(40);
    expect(pctCaderno({ total_paginas: 3, pagina_atual: 1 })).toBe(33);
    expect(pctGeral([caderno, { total_paginas: 300, pagina_atual: 0 }])).toBe(10);
  });
  it("não passa de 100", () => {
    expect(pctCaderno({ total_paginas: 10, pagina_atual: 12 })).toBe(100);
  });
});
