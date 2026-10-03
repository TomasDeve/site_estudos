import { describe, expect, it } from "vitest";
import type { RotinaBloco } from "@/types/db";
import { TODOS_OS_DIAS, diffRotina, ordenarPeloDia } from "./rotinaModelo";

const bloco = (id: string, tipo: string, inicio: number, fim: number, titulo = ""): RotinaBloco => ({
  id,
  user_id: "u",
  created_at: "",
  tipo,
  titulo,
  inicio,
  fim,
  dias: TODOS_OS_DIAS,
});

const ATUAL = [
  bloco("sono", "sono", 1350, 360, "Dormir"),
  bloco("almoco", "refeicao", 720, 780, "Almoço"),
  bloco("academia", "academia", 1080, 1140, "Academia"),
];

describe("diffRotina", () => {
  it("rotina igual não grava nada", () => {
    expect(diffRotina(ATUAL, ATUAL)).toEqual({ inserir: [], atualizar: [], excluir: [] });
  });

  it("atualiza só o que mudou, insere o novo e apaga o que saiu", () => {
    const nova = [
      { ...ATUAL[0] },
      { ...ATUAL[1], inicio: 750, fim: 810 },
      { tipo: "estudo", titulo: "Revisão", inicio: 1200, fim: 1260, dias: TODOS_OS_DIAS },
    ];
    const d = diffRotina(ATUAL, nova);
    expect(d.atualizar).toEqual([
      { id: "almoco", tipo: "refeicao", titulo: "Almoço", inicio: 750, fim: 810, dias: TODOS_OS_DIAS },
    ]);
    expect(d.inserir).toEqual([
      { tipo: "estudo", titulo: "Revisão", inicio: 1200, fim: 1260, dias: TODOS_OS_DIAS },
    ]);
    expect(d.excluir).toEqual(["academia"]);
  });

  it("id que não existe mais (Desfazer depois de apagar) entra como novo", () => {
    const semAcademia = ATUAL.slice(0, 2);
    const d = diffRotina(semAcademia, ATUAL);
    expect(d.inserir).toHaveLength(1);
    expect(d.inserir[0]).toMatchObject({ tipo: "academia", inicio: 1080, fim: 1140 });
    expect(d.inserir[0]).not.toHaveProperty("id");
    expect(d.atualizar).toEqual([]);
    expect(d.excluir).toEqual([]);
  });

  it("id repetido aproveita a linha uma vez só; a cópia vira bloco novo", () => {
    const nova = [{ ...ATUAL[1] }, { ...ATUAL[1], inicio: 1140, fim: 1170 }];
    const d = diffRotina([ATUAL[1]], nova);
    expect(d.atualizar).toEqual([]);
    expect(d.inserir).toEqual([
      { tipo: "refeicao", titulo: "Almoço", inicio: 1140, fim: 1170, dias: TODOS_OS_DIAS },
    ]);
    expect(d.excluir).toEqual([]);
  });

  it("rotina nova vazia apaga tudo", () => {
    expect(diffRotina(ATUAL, []).excluir).toEqual(["sono", "almoco", "academia"]);
  });
});

describe("ordenarPeloDia", () => {
  it("começa no acordar e deixa o sono e a madrugada no fim", () => {
    const madrugada = bloco("leitura", "lazer", 30, 60);
    const ordem = ordenarPeloDia([madrugada, ...ATUAL]).map((b) => b.id);
    expect(ordem).toEqual(["almoco", "academia", "sono", "leitura"]);
  });
});
