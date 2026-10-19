import { describe, expect, it } from "vitest";
import {
  ajudaDaEtiqueta,
  etiquetaDeConcursoParado,
  etiquetaDoProprioConcurso,
  nomeDaArea,
} from "./concursoInfo";

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
    expect(etiquetaDoProprioConcurso("COMUM PMPE", "pm_pe")).toBe(true);
    expect(etiquetaDoProprioConcurso("COMUM CBPE", "cb_pe")).toBe(true);
    expect(etiquetaDoProprioConcurso("REVISAR", "pc_pe")).toBe(false);
  });

  it("outro cargo do mesmo edital também esconde a etiqueta", () => {
    expect(etiquetaDoProprioConcurso("COMUM PCPE", "pc_pe_escrivao")).toBe(true);
    expect(etiquetaDoProprioConcurso("COMUM PPPE", "pc_pe_escrivao")).toBe(false);
  });

  it("esconde a etiqueta de concurso parado (futuro/arquivado) e mostra a de ativo", () => {
    const concursos = [
      { slug: "pc_pe", status: "ativo" },
      { slug: "pc_pe_escrivao", status: "ativo" },
      { slug: "pp_pe", status: "futuro" },
      { slug: "pm_pe", status: "futuro" },
      { slug: "pmal_soldado", status: "arquivado" },
    ];
    expect(etiquetaDeConcursoParado("COMUM PPPE", concursos)).toBe(true);
    expect(etiquetaDeConcursoParado("COMUM PMPE", concursos)).toBe(true);
    expect(etiquetaDeConcursoParado("COMUM PMAL", concursos)).toBe(true);
    expect(etiquetaDeConcursoParado("COMUM PCPE", concursos)).toBe(false);
    // concurso não cadastrado: a etiqueta continua
    expect(etiquetaDeConcursoParado("COMUM PCAL", concursos)).toBe(false);
    expect(etiquetaDeConcursoParado("REVISAR", concursos)).toBe(false);
  });

  it("explica a etiqueta com o nome do outro concurso", () => {
    expect(ajudaDaEtiqueta("COMUM PCAL")).toBe("Este assunto também cai no edital da PC-AL");
    expect(ajudaDaEtiqueta("COMUM PCPE")).toBe("Este assunto também cai no edital da PC-PE");
    expect(ajudaDaEtiqueta("COMUM PPPE")).toBe("Este assunto também cai no edital da Polícia Penal-PE");
    expect(ajudaDaEtiqueta("COMUM PMPE")).toBe("Este assunto também cai no edital da PM-PE");
    expect(ajudaDaEtiqueta("COMUM CBPE")).toBe("Este assunto também cai no edital do CBM-PE");
    expect(ajudaDaEtiqueta("REVISAR")).toBe("REVISAR");
  });
});
