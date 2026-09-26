import { describe, expect, it } from "vitest";
import { ajudaDaEtiqueta, etiquetaDoProprioConcurso, nomeDaArea } from "./concursoInfo";

describe("nomeDaArea", () => {
  const pcpe = {
    estrutura: [
      { area: "Noções de Direito", itens: 20, prova: "P1 — Objetiva" },
      { area: "Conhecimentos Específicos", itens: 40, prova: "P2 — Objetiva" },
      { area: "Redação", itens: 1, prova: "P3 — Discursiva" },
    ],
  };

  it("usa o nome da área que o edital do concurso dá para a P1/P2", () => {
    expect(nomeDaArea(pcpe, "P1")).toBe("Noções de Direito");
    expect(nomeDaArea(pcpe, "P2")).toBe("Conhecimentos Específicos");
  });

  it("sem estrutura (ou área desconhecida) cai no padrão", () => {
    expect(nomeDaArea({ estrutura: [] }, "P1")).toBe("Conhecimentos Básicos");
    expect(nomeDaArea(undefined, "P2")).toBe("Conhecimentos Específicos");
    expect(nomeDaArea(pcpe, "outros")).toBe("Outros conteúdos");
  });
});

describe("etiquetas COMUM", () => {
  it("esconde a etiqueta que aponta para o próprio concurso", () => {
    expect(etiquetaDoProprioConcurso("COMUM PCPE", "pc_pe")).toBe(true);
    expect(etiquetaDoProprioConcurso("COMUM PCAL", "pc_pe")).toBe(false);
    expect(etiquetaDoProprioConcurso("COMUM PCAL", "pc_al")).toBe(true);
    expect(etiquetaDoProprioConcurso("COMUM PPPE", "pp_pe")).toBe(true);
    expect(etiquetaDoProprioConcurso("REVISAR", "pc_pe")).toBe(false);
  });

  it("explica a etiqueta com o nome do outro concurso", () => {
    expect(ajudaDaEtiqueta("COMUM PCAL")).toBe("Este assunto também cai no edital da PC-AL");
    expect(ajudaDaEtiqueta("COMUM PCPE")).toBe("Este assunto também cai no edital da PC-PE");
    expect(ajudaDaEtiqueta("COMUM PPPE")).toBe("Este assunto também cai no edital da Polícia Penal-PE");
    expect(ajudaDaEtiqueta("REVISAR")).toBe("REVISAR");
  });
});
