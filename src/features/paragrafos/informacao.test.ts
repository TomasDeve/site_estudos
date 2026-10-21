import { describe, expect, it } from "vitest";
import { lerInformacao } from "./informacao";
import { TEMAS } from "./paragrafos";

describe("lerInformacao", () => {
  it("separa rótulo, texto e fonte de uma lei", () => {
    const i = lerInformacao("Lei 9.807/1999: programas de proteção a vítimas e testemunhas ameaçadas.");
    expect(i).toEqual({ tipo: "lei", rotulo: "Lei 9.807/1999", texto: "Programas de proteção a vítimas e testemunhas ameaçadas.", fonte: undefined });
  });

  it("tira a fonte do fim e reconhece dado", () => {
    const i = lerInformacao("2,26 milhões de estelionatos em 2025, cerca de 258 por hora (Anuário 2026).");
    expect(i.tipo).toBe("dado");
    expect(i.fonte).toBe("Anuário 2026");
    expect(i.texto).toBe("2,26 milhões de estelionatos em 2025, cerca de 258 por hora.");
  });

  it("reconhece caso sem número e o formato (fonte: …) do Para decorar", () => {
    expect(lerInformacao("Casa da Mulher Brasileira (programa federal): delegacia e juizado no mesmo prédio.").tipo).toBe("caso");
    const d = lerInformacao("mortes violentas em 2025. (fonte: Anuário Brasileiro de Segurança Pública)", {
      rotulo: "Mais de 40 mil",
      tipoDado: "numero",
    });
    expect(d).toEqual({ tipo: "dado", rotulo: "Mais de 40 mil", texto: "mortes violentas em 2025.", fonte: "Anuário Brasileiro de Segurança Pública" });
  });

  it("toda linha do banco vira informação com texto", () => {
    for (const t of TEMAS) {
      for (const parte of ["p1", "p2", "fim"] as const) {
        for (const e of t.embasamento[parte]) expect(lerInformacao(e).texto.length).toBeGreaterThan(5);
      }
    }
  });
});
