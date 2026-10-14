import { describe, expect, it } from "vitest";
import { blocosRestantes, montarProximoBloco, type BlocoMontado, type RegrasDoBloco } from "./blocosPorMateria";

interface Q {
  id: string;
  m: string;
  ok?: boolean;
  t?: string;
}

const regras: RegrasDoBloco<Q> = {
  grupoDe: (q) => q.m,
  juntoDe: (q) => q.t,
  resolvida: (q) => !!q.ok,
  descartar: (q) => !!q.ok,
};

/** n questões da matéria m: m1, m2… */
const de = (m: string, n: number): Q[] => Array.from({ length: n }, (_, i) => ({ id: `${m}${i + 1}`, m }));

/** Monta blocos em sequência, respondendo tudo que aparece (sem pular nada). */
function seguir(lista: Q[], vezes: number) {
  const feitos: BlocoMontado[] = [];
  for (let i = 0; i < vezes; i++) {
    const b = montarProximoBloco(lista, feitos, regras);
    if (!b) break;
    feitos.push(b);
    for (const q of lista) if (b.ids.includes(q.id)) q.ok = true;
  }
  return feitos;
}

describe("montarProximoBloco (5 por matéria, revezando)", () => {
  it("cada bloco é de uma matéria só e as matérias se revezam", () => {
    // Ordem embaralhada: a matéria que aparece primeiro abre o revezamento.
    const lista = [...de("i", 7), ...de("p", 6), ...de("d", 3)].sort((a, b) =>
      a.id.slice(1).localeCompare(b.id.slice(1), undefined, { numeric: true })
    );
    const feitos = seguir(lista, 10);
    expect(feitos.map((b) => b.grupo)).toEqual(["i", "p", "d", "i", "p"]);
    expect(feitos[0].ids).toEqual(["i1", "i2", "i3", "i4", "i5"]);
    expect(feitos[3].ids).toEqual(["i6", "i7"]);
    expect(montarProximoBloco(lista, feitos, regras)).toBeNull();
  });

  it("a pulada volta no próximo bloco da matéria dela, na frente", () => {
    const lista = [...de("i", 10), ...de("p", 10)];
    const b0 = montarProximoBloco(lista, [], regras)!;
    // Responde i1, i2, i4, i5 e pula a i3.
    for (const q of lista) if (["i1", "i2", "i4", "i5"].includes(q.id)) q.ok = true;
    const b1 = montarProximoBloco(lista, [b0], regras)!;
    expect(b1.grupo).toBe("p");
    for (const q of lista) if (b1.ids.includes(q.id)) q.ok = true;
    const b2 = montarProximoBloco(lista, [b0, b1], regras)!;
    expect(b2).toEqual({ grupo: "i", ids: ["i3", "i6", "i7", "i8", "i9"] });
  });

  it("com uma matéria só, a pulada não volta já no bloco seguinte", () => {
    const lista = de("i", 12);
    const b0 = montarProximoBloco(lista, [], regras)!;
    // Pula o bloco inteiro.
    const b1 = montarProximoBloco(lista, [b0], regras)!;
    expect(b1.ids).toEqual(["i6", "i7", "i8", "i9", "i10"]);
    for (const q of lista) if (b1.ids.includes(q.id)) q.ok = true;
    const b2 = montarProximoBloco(lista, [b0, b1], regras)!;
    expect(b2.ids).toEqual(["i1", "i2", "i3", "i4", "i5"]);
  });

  it("não parte um texto associado no meio", () => {
    const lista: Q[] = [
      ...de("p", 3),
      { id: "t1", m: "p", t: "T" },
      { id: "t2", m: "p", t: "T" },
      { id: "t3", m: "p", t: "T" },
      { id: "p9", m: "p" },
    ];
    expect(montarProximoBloco(lista, [], regras)!.ids).toEqual(["p1", "p2", "p3", "t1", "t2", "t3"]);
  });

  it("descarta as já respondidas ao montar blocos novos", () => {
    const lista = de("i", 6);
    lista[0].ok = true;
    expect(montarProximoBloco(lista, [], regras)!.ids).toEqual(["i2", "i3", "i4", "i5", "i6"]);
  });
});

describe("blocosRestantes", () => {
  it("conta por matéria e só inclui as puladas depois que o bloco fica para trás", () => {
    const lista = [...de("i", 7), ...de("p", 6)];
    expect(blocosRestantes(lista, [], regras)).toBe(4);
    const b0 = montarProximoBloco(lista, [], regras)!;
    // Ainda no b0 (nada respondido): as dele não contam como restantes.
    expect(blocosRestantes(lista, [b0], regras)).toBe(3);
    const b1 = montarProximoBloco(lista, [b0], regras)!;
    // Pulou o b0 inteiro: as 5 voltam para a fila do "i" (5 + 2 = 2 blocos) e o "p" segue com 1 (+ o b1 em resolução).
    expect(blocosRestantes(lista, [b0, b1], regras)).toBe(3);
  });
});
