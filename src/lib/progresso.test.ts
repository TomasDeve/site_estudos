import { describe, expect, it } from "vitest";
import type { ConcursoMateria, Topico } from "@/types/db";
import { ordenarTopicosDoVinculo, topicosDoConcurso } from "./progresso";

// Fábricas mínimas: só os campos que as funções olham.
function topico(id: string, materia_id: string, extra: Partial<Topico> = {}): Topico {
  return {
    id,
    materia_id,
    ordem: 0,
    nucleo_comum: false,
    status: "nao_estudado",
    created_at: "2026-01-01",
    ...extra,
  } as Topico;
}
function vinculo(
  concurso_id: string,
  materia_id: string,
  topicos_incluidos: string[] | null
): ConcursoMateria {
  return { id: `${concurso_id}-${materia_id}`, concurso_id, materia_id, topicos_incluidos } as ConcursoMateria;
}

describe("topicosDoConcurso", () => {
  // Matéria compartilhada M1 com 3 assuntos; M2 é de outro concurso.
  const t1 = topico("t1", "M1", { ordem: 0 });
  const t2 = topico("t2", "M1", { ordem: 1 });
  const t3 = topico("t3", "M1", { ordem: 2 });
  const outra = topico("z", "M2");
  const todos = [t1, t2, t3, outra];

  it("recorte por concurso: só os tópicos escolhidos da matéria", () => {
    const vinc = [vinculo("pc", "M1", ["t1", "t3"])];
    const r = topicosDoConcurso(todos, { id: "pc", somente_nucleo: false }, vinc);
    expect(r.map((t) => t.id).sort()).toEqual(["t1", "t3"]);
  });

  it("sem recorte (null): a matéria inteira, mas só matérias vinculadas", () => {
    const vinc = [vinculo("pmal", "M1", null)];
    const r = topicosDoConcurso(todos, { id: "pmal", somente_nucleo: false }, vinc);
    // t1..t3 entram; 'z' (M2, não vinculada) fica de fora.
    expect(r.map((t) => t.id).sort()).toEqual(["t1", "t2", "t3"]);
  });

  it("mesma matéria, recortes diferentes por concurso (compartilhamento real)", () => {
    const vinc = [vinculo("pc", "M1", ["t1"]), vinculo("pmal", "M1", ["t1", "t2", "t3"])];
    const pc = topicosDoConcurso(todos, { id: "pc", somente_nucleo: false }, vinc);
    const pmal = topicosDoConcurso(todos, { id: "pmal", somente_nucleo: false }, vinc);
    expect(pc.map((t) => t.id)).toEqual(["t1"]);
    expect(pmal.map((t) => t.id).sort()).toEqual(["t1", "t2", "t3"]);
    // t1 é a MESMA linha nos dois — progresso/questões compartilhados.
  });

  it("Concurso Indefinido (somente_nucleo) sem recorte: só núcleo comum", () => {
    const nuc = topico("n", "M1", { nucleo_comum: true });
    const vinc = [vinculo("indef", "M1", null)];
    const r = topicosDoConcurso([t1, t2, nuc], { id: "indef", somente_nucleo: true }, vinc);
    expect(r.map((t) => t.id)).toEqual(["n"]);
  });

  it("sem vínculos informados: comportamento antigo (tudo)", () => {
    const r = topicosDoConcurso(todos, { id: "x", somente_nucleo: false });
    expect(r).toHaveLength(4);
  });
});

describe("ordenarTopicosDoVinculo", () => {
  const a = topico("a", "M", { ordem: 2 });
  const b = topico("b", "M", { ordem: 0 });
  const c = topico("c", "M", { ordem: 1 });

  it("segue a ordem do recorte quando há topicos_incluidos", () => {
    expect(ordenarTopicosDoVinculo([a, b, c], ["c", "a", "b"]).map((t) => t.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("cai na ordem natural (campo ordem) quando não há recorte", () => {
    expect(ordenarTopicosDoVinculo([a, b, c], null).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});
