import { describe, expect, it } from "vitest";
import { SHY, hifenizar, indiceComHifens, indiceReal, semHifens } from "./silabas";

const separa = (p: string) => hifenizar(p).split(SHY).join("-");

describe("separação silábica", () => {
  it("separa como na translineação", () => {
    const casos: Record<string, string> = {
      responsabilização: "res-pon-sa-bi-li-za-ção",
      investigação: "in-ves-ti-ga-ção",
      criminalidade: "cri-mi-na-li-da-de",
      carro: "car-ro",
      nascer: "nas-cer",
      exceção: "ex-ce-ção",
      trabalho: "tra-ba-lho",
      enquanto: "en-quan-to",
      sangue: "san-gue",
      construção: "cons-tru-ção",
      perspectiva: "pers-pec-ti-va",
      advogado: "ad-vo-ga-do",
      técnica: "téc-ni-ca",
      obstáculo: "obs-tá-cu-lo",
      ritmo: "rit-mo",
      Brasil: "Bra-sil",
      psicologia: "psi-co-lo-gia",
      milícias: "mi-lí-cias",
    };
    for (const [palavra, esperado] of Object.entries(casos)) expect(separa(palavra)).toBe(esperado);
  });

  it("não quebra entre vogais, nem deixa 1 letra sozinha, nem em sigla", () => {
    expect(separa("poeta")).toBe("poe-ta");
    expect(separa("saúde")).toBe("saú-de");
    expect(separa("aquele")).toBe("aque-le");
    expect(separa("água")).toBe("água");
    expect(separa("amor")).toBe("amor");
    expect(separa("PCPE")).toBe("PCPE");
    expect(separa("FBSP")).toBe("FBSP");
  });

  it("pula as separações duvidosas", () => {
    expect(separa("atleta")).toBe("atle-ta");
    expect(separa("sublinhar")).toBe("subli-nhar");
  });

  it("mantém o texto e converte as posições do cursor", () => {
    const t = "A investigação, puni-lo.";
    const h = hifenizar(t);
    expect(semHifens(h)).toBe(t);
    const real = t.indexOf("ga");
    const pos = indiceComHifens(h, real);
    expect(semHifens(h.slice(pos)).startsWith("gação,")).toBe(true);
    expect(indiceReal(h, pos)).toBe(real);
  });
});
