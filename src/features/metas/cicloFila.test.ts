import { describe, expect, it } from "vitest";
import type { PlanoHora } from "@/types/db";
import { diaDeEstudo, lerFila, situacaoDoCiclo, type ItemCiclo } from "./cicloFila";

const fila: ItemCiclo[] = [
  { id: "a", materia_id: "rlm", minutos: 60, atividade: "teoria" },
  { id: "b", materia_id: "port", minutos: 60, atividade: "questoes" },
];

function bloco(p: Partial<PlanoHora>): PlanoHora {
  return {
    id: Math.random().toString(36),
    user_id: "u",
    data: "2026-10-23",
    hora: 1,
    materia_id: "rlm",
    atividade: "teoria",
    nota: "",
    feita: false,
    minutos: 60,
    ciclo_item: "a",
    ciclo_volta: 1,
    created_at: "",
    ...p,
  };
}

describe("diaDeEstudo", () => {
  it("de tarde, é hoje", () => {
    expect(diaDeEstudo(new Date(2026, 9, 22, 16), new Set())).toBe("2026-10-22");
  });
  it("hoje concluído: vai pro dia seguinte", () => {
    expect(diaDeEstudo(new Date(2026, 9, 22, 16), new Set(["2026-10-22"]))).toBe("2026-10-23");
  });
  it("de madrugada (antes das 6h) ainda é o dia anterior", () => {
    expect(diaDeEstudo(new Date(2026, 9, 23, 3), new Set())).toBe("2026-10-22");
  });
  it("de madrugada com o dia anterior concluído: o dia de hoje", () => {
    expect(diaDeEstudo(new Date(2026, 9, 23, 3), new Set(["2026-10-22"]))).toBe("2026-10-23");
  });
});

describe("lerFila", () => {
  it("descarta itens malformados e completa o padrão", () => {
    expect(lerFila([{ id: "x", materia_id: "m" }, { id: 1 }, null, "?"])).toEqual([
      { id: "x", materia_id: "m", minutos: 60, atividade: "teoria" },
    ]);
    expect(lerFila(null)).toEqual([]);
  });
});

describe("situacaoDoCiclo", () => {
  const nenhum = new Set<string>();

  it("sem blocos: tudo na fila, o primeiro é o próximo", () => {
    const s = situacaoDoCiclo(fila, [], 1, "2026-10-23", nenhum);
    expect(s.feitos).toBe(0);
    expect(s.proximo?.id).toBe("a");
    expect(s.estados.get("a")?.tipo).toBe("fila");
  });

  it("no dia esperando e feito", () => {
    const s = situacaoDoCiclo(
      fila,
      [bloco({ ciclo_item: "a", feita: true }), bloco({ ciclo_item: "b", hora: 2 })],
      1,
      "2026-10-23",
      nenhum
    );
    expect(s.estados.get("a")?.tipo).toBe("feito");
    expect(s.estados.get("b")?.tipo).toBe("no_dia");
    expect(s.proximo).toBeNull();
    expect(s.devolvidas).toEqual([]);
  });

  it("dia passado sem fazer: volta pra fila e o bloco é devolvido", () => {
    const velho = bloco({ ciclo_item: "a", data: "2026-10-21" });
    const s = situacaoDoCiclo(fila, [velho], 1, "2026-10-22", nenhum);
    expect(s.estados.get("a")?.tipo).toBe("fila");
    expect(s.devolvidas).toEqual([velho]);
  });

  it("dia concluído sem fazer: também volta", () => {
    const b = bloco({ ciclo_item: "a", data: "2026-10-22" });
    const s = situacaoDoCiclo(fila, [b], 1, "2026-10-23", new Set(["2026-10-22"]));
    expect(s.estados.get("a")?.tipo).toBe("fila");
    expect(s.devolvidas).toEqual([b]);
  });

  it("todos feitos: começa a volta seguinte com a fila cheia", () => {
    const s = situacaoDoCiclo(
      fila,
      [bloco({ ciclo_item: "a", feita: true }), bloco({ ciclo_item: "b", feita: true, hora: 2 })],
      1,
      "2026-10-23",
      nenhum
    );
    expect(s.volta).toBe(2);
    expect(s.feitos).toBe(0);
    expect(s.proximo?.id).toBe("a");
  });

  it("bloco de outra volta não conta na atual", () => {
    const s = situacaoDoCiclo(fila, [bloco({ ciclo_item: "a", feita: true, ciclo_volta: 2 })], 1, "2026-10-23", nenhum);
    expect(s.estados.get("a")?.tipo).toBe("fila");
  });
});
