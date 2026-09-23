import { describe, expect, it } from "vitest";
import type { ConcursoMateria, Materia, Topico, TopicoQuestao } from "@/types/db";
import {
  agruparEmSequencia,
  blocosPorTexto,
  listaNumeros,
  numerarImpressao,
  ordenarParaImpressao,
} from "./organizar";

const materia = (id: string, nome: string) => ({ id, nome, icone: "📘" }) as Materia;
const topico = (id: string, materia_id: string, ordem: number, titulo = id) =>
  ({ id, materia_id, ordem, titulo, created_at: "2026-01-01" }) as Topico;
const vinculo = (materia_id: string, ordem: number, topicos_incluidos: string[] | null = null) =>
  ({ materia_id, ordem, topicos_incluidos }) as ConcursoMateria;
const questao = (
  id: string,
  topico_id: string,
  ordem: number,
  texto: string | null = null,
  impressao_numero: number | null = null
) =>
  ({ id, topico_id, ordem, texto_associado: texto, impressao_numero, created_at: "2026-01-01" }) as TopicoQuestao;

const materias = [materia("pen", "Direito Penal"), materia("por", "Português"), materia("ext", "Arquivada")];
const topicos = [
  topico("p1", "pen", 1),
  topico("p2", "pen", 2),
  topico("t1", "por", 5),
  topico("t2", "por", 1),
  topico("e1", "ext", 1),
];
// No edital: Português antes de Penal; em Português, o recorte põe t1 antes de t2.
const vinculos = [vinculo("por", 0, ["t1", "t2"]), vinculo("pen", 1)];
const ids = (qs: TopicoQuestao[]) => qs.map((q) => q.id);

describe("ordenarParaImpressao (ordem de prova: matéria → assunto → caderno)", () => {
  it("segue a ordem do edital", () => {
    const qs = [
      questao("a", "p2", 0),
      questao("b", "p1", 3),
      questao("c", "t2", 0),
      questao("d", "p1", 1),
      questao("e", "t1", 0),
    ];
    expect(ids(ordenarParaImpressao(qs, topicos, materias, vinculos))).toEqual(["e", "c", "d", "b", "a"]);
  });

  it("matéria fora do edital vai para o fim", () => {
    const qs = [questao("x", "e1", 0), questao("y", "p1", 0)];
    expect(ids(ordenarParaImpressao(qs, topicos, materias, vinculos))).toEqual(["y", "x"]);
  });

  it("junta as questões do mesmo texto associado dentro do assunto", () => {
    const qs = [
      questao("1", "p1", 0, "TEXTO A"),
      questao("2", "p1", 1, null),
      questao("3", "p1", 2, "TEXTO A"),
    ];
    expect(ids(ordenarParaImpressao(qs, topicos, materias, vinculos))).toEqual(["1", "3", "2"]);
  });
});

describe("numerarImpressao (o número da folha não muda depois de impresso)", () => {
  const todas = () => true;

  it("sem nada impresso, numera 1, 2, 3… na ordem de prova", () => {
    const qs = [questao("a", "t1", 0), questao("b", "t1", 1), questao("c", "p1", 0)];
    const { ordem, numeroDe } = numerarImpressao(qs, todas);
    expect(ids(ordem)).toEqual(["a", "b", "c"]);
    expect([...numeroDe.values()]).toEqual([1, 2, 3]);
  });

  it("desmarcar uma impressa não renumera as outras", () => {
    // A folha tinha 1..4; a 2 foi desmarcada (sumiu da lista).
    const qs = [questao("a", "t1", 0, null, 1), questao("c", "t1", 2, null, 3), questao("d", "p1", 0, null, 4)];
    const { numeroDe } = numerarImpressao(qs, todas);
    expect(numeroDe.get("a")).toBe(1);
    expect(numeroDe.get("c")).toBe(3);
    expect(numeroDe.get("d")).toBe(4);
  });

  it("as novas continuam depois da maior impressa, mesmo sendo de matéria anterior", () => {
    // "n" é de Português (vem antes na prova), mas foi marcada depois da impressão.
    const qs = [questao("n", "t1", 0), questao("a", "p1", 0, null, 1), questao("b", "p1", 1, null, 2)];
    const { ordem, numeroDe } = numerarImpressao(qs, todas);
    expect(ids(ordem)).toEqual(["a", "b", "n"]);
    expect(numeroDe.get("n")).toBe(3);
  });

  it("com filtro, as novas que estão na tela ganham os próximos números em sequência", () => {
    const qs = [questao("x", "t1", 0), questao("y", "p1", 0), questao("z", "p1", 1)];
    const { numeroDe } = numerarImpressao(qs, (q) => q.topico_id === "p1");
    expect(numeroDe.get("y")).toBe(1);
    expect(numeroDe.get("z")).toBe(2);
    expect(numeroDe.get("x")).toBe(3);
  });
});

describe("agruparEmSequencia", () => {
  it("agrupa vizinhos por matéria e assunto; a mesma matéria pode voltar depois", () => {
    const qs = [questao("1", "t1", 0), questao("2", "t1", 1), questao("3", "p1", 0), questao("4", "t2", 0)];
    const grupos = agruparEmSequencia(qs, topicos, materias);
    expect(grupos.map((m) => [m.nome, m.assuntos.map((a) => [a.topicoId, ids(a.questoes)])])).toEqual([
      ["Português", [["t1", ["1", "2"]]]],
      ["Direito Penal", [["p1", ["3"]]]],
      ["Português", [["t2", ["4"]]]],
    ]);
  });
});

describe("blocosPorTexto", () => {
  it("agrupa só as questões seguidas com o mesmo texto", () => {
    const qs = [
      questao("1", "t", 0, "A"),
      questao("2", "t", 1, "A"),
      questao("3", "t", 2, null),
      questao("4", "t", 3, null),
      questao("5", "t", 4, "A"),
    ];
    expect(blocosPorTexto(qs).map((b) => [b.texto, ids(b.questoes)])).toEqual([
      ["A", ["1", "2"]],
      [null, ["3", "4"]],
      ["A", ["5"]],
    ]);
  });
});

describe("listaNumeros", () => {
  it("escreve os números por extenso, juntando sequências de 3+", () => {
    expect(listaNumeros([5])).toBe("5");
    expect(listaNumeros([6, 5])).toBe("5 e 6");
    expect(listaNumeros([5, 6, 7, 8])).toBe("5 a 8");
    expect(listaNumeros([5, 6, 9, 10])).toBe("5, 6, 9 e 10");
    expect(listaNumeros([5, 6, 7, 12])).toBe("5 a 7 e 12");
    expect(listaNumeros([])).toBe("");
  });
});
