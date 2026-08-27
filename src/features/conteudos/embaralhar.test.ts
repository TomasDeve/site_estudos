import { describe, expect, it } from "vitest";
import { agruparPorChave, embaralhar } from "./embaralhar";

describe("agruparPorChave (junta o mesmo texto sem desfazer o embaralho)", () => {
  const k = (x: { id: number; t: string | null }) => x.t;

  it("puxa o grupo inteiro para a 1ª aparição, mantendo o resto no lugar", () => {
    const lista = [
      { id: 1, t: "A" },
      { id: 2, t: null },
      { id: 3, t: "B" },
      { id: 4, t: "A" },
      { id: 5, t: "B" },
    ];
    expect(agruparPorChave(lista, k).map((x) => x.id)).toEqual([1, 4, 2, 3, 5]);
  });

  it("preserva a ordem quando todas as chaves são distintas", () => {
    const lista = [
      { id: 1, t: "A" },
      { id: 2, t: "B" },
      { id: 3, t: "C" },
    ];
    expect(agruparPorChave(lista, k).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("itens sem chave (null/vazio) ficam onde estão", () => {
    const lista = [
      { id: 1, t: null },
      { id: 2, t: "" },
      { id: 3, t: null },
    ];
    expect(agruparPorChave(lista, k).map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("mantém a ordem interna do grupo conforme a lista embaralhada", () => {
    const lista = [
      { id: 9, t: "X" },
      { id: 3, t: "Y" },
      { id: 7, t: "X" },
      { id: 1, t: "X" },
    ];
    // 1ª aparição de X é o id 9; o grupo sai na ordem 9, 7, 1; depois o Y.
    expect(agruparPorChave(lista, k).map((x) => x.id)).toEqual([9, 7, 1, 3]);
  });
});

describe("embaralhar (determinístico por semente)", () => {
  it("a mesma semente reproduz a mesma ordem", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(embaralhar(arr, 42)).toEqual(embaralhar(arr, 42));
  });
  it("não altera o array original", () => {
    const arr = [1, 2, 3];
    embaralhar(arr, 7);
    expect(arr).toEqual([1, 2, 3]);
  });
});
