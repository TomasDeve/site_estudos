import { describe, expect, it } from "vitest";
import { matchMateria, normalizar, parseQconcursos, type MateriaRef } from "./parser";

describe("parseQconcursos", () => {
  it("linha única com total/acertos/erros (cópia de tabela)", () => {
    const rows = parseQconcursos(
      "Língua Portuguesa\t120\t90\t30\nDireito Penal\t50\t40\t10"
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ total: 120, acertos: 90, confianca: "alta" });
    expect(normalizar(rows[0].materiaTexto)).toBe("lingua portuguesa");
    expect(rows[1]).toMatchObject({ total: 50, acertos: 40 });
  });

  it("grupo multi-linha com percentual", () => {
    const rows = parseQconcursos(
      `Direito Constitucional
       132 questões
       99 acertos (75%)`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ total: 132, acertos: 99, confianca: "alta" });
  });

  it("separador de milhar e duas colunas", () => {
    const rows = parseQconcursos("Língua Portuguesa 1.234 987");
    expect(rows[0]).toMatchObject({ total: 1234, acertos: 987 });
  });

  it("percentual corrige acertos implausíveis", () => {
    // 2 números que não batem com o % → % vence
    const rows = parseQconcursos("Informática 100 3 50%");
    expect(rows[0]).toMatchObject({ total: 100, acertos: 50, confianca: "media" });
  });

  it("ignora cabeçalhos e lixo", () => {
    const rows = parseQconcursos(
      `Disciplina Resolvidas Acertos Erros
       Ética no Serviço Público 40 30 10
       Ver mais`
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ total: 40, acertos: 30 });
  });

  it("descarta acertos > total", () => {
    expect(parseQconcursos("Matéria X 10 50")).toEqual([
      expect.objectContaining({ total: 50, acertos: 10 }),
    ]);
  });
});

describe("matchMateria", () => {
  const materias: MateriaRef[] = [
    { id: "m1", slug: "portugues", nome: "Língua Portuguesa" },
    { id: "m2", slug: "dconst", nome: "Direito Constitucional" },
    { id: "m3", slug: "informatica", nome: "Noções de Informática" },
  ];
  const semAliases = new Map<string, string>();

  it("match exato por nome (com acentos diferentes)", () => {
    expect(matchMateria("lingua portuguesa", materias, semAliases)).toMatchObject({
      materiaId: "m1",
      confianca: "alta",
    });
  });

  it("alias salvo tem prioridade", () => {
    const aliases = new Map([["portugues para concursos", "m1"]]);
    expect(matchMateria("Português para concursos", materias, aliases)).toMatchObject({
      materiaId: "m1",
      confianca: "alta",
    });
  });

  it("dicionário de apelidos", () => {
    expect(matchMateria("Informática", materias, semAliases)).toMatchObject({
      materiaId: "m3",
      confianca: "alta",
    });
  });

  it("fuzzy por tokens", () => {
    expect(
      matchMateria("Direito Constitucional (CF/88)", materias, semAliases).materiaId
    ).toBe("m2");
  });

  it("sem match retorna null", () => {
    expect(matchMateria("Culinária Nordestina", materias, semAliases)).toMatchObject({
      materiaId: null,
    });
  });
});
