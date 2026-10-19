import { describe, expect, it } from "vitest";
import { resumoDoFiltro, type FiltroPadrao } from "./filtroPadrao";

const vazio: FiltroPadrao = { filtro: [], formato: "todos", bancas: [], cats: [], soConcluidos: false };

describe("resumoDoFiltro", () => {
  it("sem nada filtrado, diz que são todas", () => {
    expect(resumoDoFiltro(vazio, null)).toEqual(["Todas as questões"]);
  });

  it("descreve cada recorte na ordem da tela", () => {
    const atual: FiltroPadrao = {
      filtro: [
        { materiaId: "a", assuntos: [] },
        { materiaId: "b", assuntos: ["x"] },
      ],
      formato: "multipla",
      bancas: ["CESPE / CEBRASPE"],
      cats: ["real"],
      soConcluidos: true,
    };
    expect(resumoDoFiltro(atual, null)).toEqual([
      "2 matérias",
      "Só concluídos",
      "Múltipla escolha",
      "CESPE / CEBRASPE",
      "Reais",
    ]);
  });

  it("avisa quando a tela está no filtro padrão (a ordem não importa)", () => {
    const padrao: FiltroPadrao = { ...vazio, formato: "ce", bancas: ["FGV", "CESPE / CEBRASPE"] };
    const atual: FiltroPadrao = { ...vazio, formato: "ce", bancas: ["CESPE / CEBRASPE", "FGV"] };
    expect(resumoDoFiltro(atual, padrao)[0]).toBe("★ Filtro padrão");
    expect(resumoDoFiltro({ ...atual, formato: "todos" }, padrao)[0]).not.toBe("★ Filtro padrão");
  });

  it("com muitas bancas mostra duas e o resto em +N", () => {
    const atual: FiltroPadrao = { ...vazio, bancas: ["FGV", "", "IDECAN", "AOCP"] };
    expect(resumoDoFiltro(atual, null)).toEqual(["FGV, Sem banca +2"]);
  });
});
