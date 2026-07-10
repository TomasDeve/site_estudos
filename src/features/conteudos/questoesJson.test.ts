import { describe, expect, it } from "vitest";
import { parsearQuestoesJson } from "./questoesJson";

const TOPICO = "11111111-1111-1111-1111-111111111111";

describe("parsearQuestoesJson", () => {
  it("converte uma lista completa e continua a numeração da ordem", () => {
    const linhas = parsearQuestoesJson(
      JSON.stringify([
        {
          contexto: "Julgue o item.",
          enunciado: "Penedo fica às margens do rio São Francisco.",
          gabarito: "C",
          comentario: "Marco inicial da ocupação efetiva.",
          fonte: "Aula 01",
        },
        { enunciado: "As capitanias eram alienáveis.", gabarito: "E" },
      ]),
      TOPICO,
      5
    );

    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toMatchObject({
      topico_id: TOPICO,
      contexto: "Julgue o item.",
      gabarito: true,
      fonte: "Aula 01",
      ordem: 5,
    });
    expect(linhas[1]).toMatchObject({
      contexto: null,
      comentario: "",
      fonte: null,
      gabarito: false,
      ordem: 6,
    });
  });

  it("aceita gabarito booleano e as variações de certo/errado", () => {
    const gabaritos = ["C", "certo", "Verdadeiro", true, "E", "errado", "falso", false];
    const linhas = parsearQuestoesJson(
      JSON.stringify(gabaritos.map((gabarito) => ({ enunciado: "item", gabarito }))),
      TOPICO,
      0
    );
    expect(linhas.map((l) => l.gabarito)).toEqual([
      true, true, true, true, false, false, false, false,
    ]);
  });

  it("aceita um único objeto fora de lista", () => {
    const linhas = parsearQuestoesJson('{"enunciado":"item","gabarito":"C"}', TOPICO, 0);
    expect(linhas).toHaveLength(1);
  });

  it("descarta espaços em branco de campos opcionais", () => {
    const linhas = parsearQuestoesJson(
      '[{"enunciado":" item ","gabarito":"C","contexto":"   ","comentario":"  "}]',
      TOPICO,
      0
    );
    expect(linhas[0]).toMatchObject({ enunciado: "item", contexto: null, comentario: "" });
  });

  it("recusa JSON malformado", () => {
    expect(() => parsearQuestoesJson("[{enunciado:", TOPICO, 0)).toThrow(/JSON inválido/);
  });

  it("recusa lista vazia", () => {
    expect(() => parsearQuestoesJson("[]", TOPICO, 0)).toThrow(/Nenhuma questão/);
  });

  it("aponta a questão sem enunciado", () => {
    expect(() =>
      parsearQuestoesJson('[{"enunciado":"ok","gabarito":"C"},{"gabarito":"E"}]', TOPICO, 0)
    ).toThrow(/Questão 2.*enunciado/);
  });

  it("aponta a questão com gabarito inválido", () => {
    expect(() => parsearQuestoesJson('[{"enunciado":"ok","gabarito":"talvez"}]', TOPICO, 0)).toThrow(
      /Questão 1.*gabarito/
    );
  });
});
