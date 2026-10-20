import { describe, expect, it } from "vitest";
import type { MarcaAnki } from "@/api/questoesAnki";
import type { QuestaoDoResumo } from "@/api/topicoQuestoes";
import {
  appsPorMateria,
  cargaDaBateria,
  contar,
  criarFiltroEdital,
  estadoDaQuestao,
  extrairBlocos,
  montarItens,
  passaNoFiltro,
  recorteDaQuestao,
  secoesPorAssunto,
  type ResumoDeQuestoes,
} from "./itensResumo";

// ids no formato de uuid (como os do banco)
const Q1 = "11111111-1111-1111-1111-111111111111";
const Q2 = "22222222-2222-2222-2222-222222222222";
const Q3 = "33333333-3333-3333-3333-333333333333";
const Q4 = "44444444-4444-4444-4444-444444444444";

/** O bloco do jeito que o "Adicionar ao resumo" grava. */
const bloco = (id: string, corpo: string) =>
  `<div data-resumo-questao="${id}"><hr><div><strong>Q3213956 · 2025 (CESPE) - Agente</strong></div>${corpo}</div>`;

describe("extrairBlocos", () => {
  it("pega cada trecho com as divs aninhadas e ignora o texto solto", () => {
    const html = `<div>anotação solta</div>${bloco(Q1, "<div>enunciado</div><div><br></div><div><strong>RESPOSTA:</strong></div>")}<div>outra nota</div>${bloco(Q2, "<div>dois</div>")}`;
    const blocos = extrairBlocos(html);
    expect(blocos.map((b) => b.questaoId)).toEqual([Q1, Q2]);
    expect(blocos[0].html).toContain("RESPOSTA:");
    expect(blocos[0].html).not.toContain("outra nota");
    expect(blocos[1].html.endsWith("<div>dois</div>")).toBe(true);
  });

  it("aceita atributos depois do id (o editor às vezes acrescenta)", () => {
    const html = `<div data-resumo-questao="${Q1}" style="color: red"><hr><div>x</div></div>`;
    expect(extrairBlocos(html).map((b) => b.questaoId)).toEqual([Q1]);
  });

  it("acha também um trecho que o editor aninhou dentro de outro", () => {
    const html = `<div data-resumo-questao="${Q1}"><hr><div>a</div><div data-resumo-questao="${Q2}"><hr><div>b</div></div></div>`;
    expect(extrairBlocos(html).map((b) => b.questaoId)).toEqual([Q1, Q2]);
  });

  it("resumo sem trecho marcado → nada", () => {
    expect(extrairBlocos("<div>Adicionei 21/08</div>")).toEqual([]);
    expect(extrairBlocos("")).toEqual([]);
  });
});

describe("recorteDaQuestao", () => {
  it("usa o enunciado, numa linha só", () => {
    expect(recorteDaQuestao("O poder de polícia\n\né  discricionário.", "")).toBe(
      "O poder de polícia é discricionário."
    );
  });

  it("corta enunciado comprido com reticências", () => {
    const r = recorteDaQuestao("a".repeat(500), "");
    expect(r.length).toBe(220);
    expect(r.endsWith("…")).toBe(true);
  });

  it("sem a questão (apagada), usa o trecho pulando o cabeçalho Q…", () => {
    const html = "<hr><div><strong>Q3213956 · 2025 (CESPE) - Agente</strong></div><div>O ato é nulo.</div>";
    expect(recorteDaQuestao(null, html)).toBe("O ato é nulo.");
    expect(recorteDaQuestao(null, "<hr>")).toBe("Trecho vazio");
  });
});

describe("criarFiltroEdital", () => {
  const topicos = new Map([
    ["t1", { id: "t1", materia_id: "m1" }],
    ["t2", { id: "t2", materia_id: "m1" }],
    ["t3", { id: "t3", materia_id: "m2" }],
    ["t4", { id: "t4", materia_id: "m3" }],
  ]);
  const vinc = (
    concurso_id: string,
    materia_id: string,
    extra: Partial<{ riscada: boolean; topicos_incluidos: string[] | null; topicos_riscados: string[] }> = {}
  ) => ({ concurso_id, materia_id, riscada: false, topicos_incluidos: null, topicos_riscados: [], ...extra });

  it("vale o recorte, o riscado e a matéria riscada do concurso ativo", () => {
    const noEdital = criarFiltroEdital(
      [
        { id: "c1", status: "ativo" },
        { id: "c2", status: "futuro" },
      ],
      [
        vinc("c1", "m1", { topicos_incluidos: ["t1", "t2"], topicos_riscados: ["t2"] }),
        vinc("c1", "m2", { riscada: true }),
        vinc("c2", "m3"),
      ],
      topicos
    );
    expect(noEdital("t1")).toBe(true);
    expect(noEdital("t2")).toBe(false); // riscado
    expect(noEdital("t3")).toBe(false); // matéria riscada
    expect(noEdital("t4")).toBe(false); // só no concurso pausado
    expect(noEdital("nao-existe")).toBe(false);
    expect(noEdital(null)).toBe(false);
  });

  it("basta um concurso ativo incluir o assunto", () => {
    const noEdital = criarFiltroEdital(
      [
        { id: "c1", status: "ativo" },
        { id: "c2", status: "ativo" },
      ],
      [vinc("c1", "m1", { topicos_incluidos: ["t2"] }), vinc("c2", "m1")],
      topicos
    );
    expect(noEdital("t1")).toBe(true);
  });

  it("sem concurso ativo, não filtra", () => {
    const noEdital = criarFiltroEdital([{ id: "c1", status: "futuro" }], [], topicos);
    expect(noEdital("t3")).toBe(true);
  });
});

describe("estadoDaQuestao", () => {
  it("a marca manda; sem marca, o edital decide entre falta e fora", () => {
    expect(estadoDaQuestao(true, { status: "no_anki" }, false)).toBe("no_anki");
    expect(estadoDaQuestao(true, { status: "ignorada" }, true)).toBe("ignorada");
    expect(estadoDaQuestao(true, null, true)).toBe("falta");
    expect(estadoDaQuestao(true, null, false)).toBe("fora");
    expect(estadoDaQuestao(false, { status: "no_anki" }, true)).toBe("apagada");
  });
});

describe("montarItens", () => {
  const questao = (id: string, topico_id: string, extra: Partial<QuestaoDoResumo> = {}): QuestaoDoResumo => ({
    id,
    topico_id,
    tipo: "ce",
    fonte: "QConcursos — Q3213956 (CESPE / CEBRASPE) · 2025 · Agente",
    enunciado: `enunciado ${id.slice(0, 2)}`,
    resposta: true,
    resposta_letra: null,
    gabarito: false,
    gabarito_letra: null,
    ...extra,
  });
  const topicoPorId = new Map([
    ["t1", { id: "t1", materia_id: "m1" }],
    ["t2", { id: "t2", materia_id: "m2" }],
  ]);
  const resumos: ResumoDeQuestoes[] = [
    { id: "r1", topico_id: "t1", materia_id: null, conteudo: bloco(Q1, "<div>a</div>") + bloco(Q2, "<div>b</div>") },
    { id: "r2", topico_id: "t2", materia_id: null, conteudo: bloco(Q3, "<div>c</div>") + bloco(Q1, "<div>a de novo</div>") + bloco(Q4, "<div>d</div>") },
  ];
  const questoes = new Map([
    [Q1, questao(Q1, "t1")],
    [Q2, questao(Q2, "t1", { tipo: "multipla", resposta: null, resposta_letra: "B", gabarito: null, gabarito_letra: "B" })],
    [Q3, questao(Q3, "t2")],
  ]);
  const marcas = new Map<string, MarcaAnki>([[Q2, { questao_id: Q2, status: "no_anki", origem: "importacao", em: "2026-10-01" }]]);
  const itens = montarItens({ resumos, questoes, marcas, topicoPorId, noEdital: (t) => t === "t1" });
  const porId = new Map(itens.map((i) => [i.questaoId, i]));

  it("um item por questão; repetida junta os dois trechos", () => {
    expect(itens.map((i) => i.questaoId)).toEqual([Q1, Q2, Q3, Q4]);
    expect(porId.get(Q1)!.html).toContain("a de novo");
    expect(porId.get(Q1)!.html.startsWith("<hr>")).toBe(false);
    expect(porId.get(Q1)!.resumoId).toBe("r1");
  });

  it("estado, matéria, fonte e acerto de cada uma", () => {
    expect(porId.get(Q1)!.estado).toBe("falta");
    expect(porId.get(Q2)!.estado).toBe("no_anki");
    expect(porId.get(Q3)!.estado).toBe("fora");
    expect(porId.get(Q4)!.estado).toBe("apagada");
    expect(porId.get(Q1)!.materiaId).toBe("m1");
    expect(porId.get(Q4)!.materiaId).toBe("m2"); // sem questão: assunto do resumo
    expect(porId.get(Q1)!.codigo).toBe("Q3213956");
    expect(porId.get(Q1)!.acertou).toBe(false);
    expect(porId.get(Q2)!.acertou).toBe(true);
    expect(porId.get(Q4)!.acertou).toBeNull();
    expect(porId.get(Q1)!.destino).toEqual({ topicoId: "t1" });
  });

  it("contagem e bateria (só no Anki ÷ no Anki + falta)", () => {
    const c = contar(itens);
    expect(c).toEqual({ total: 4, falta: 1, no_anki: 1, ignorada: 0, fora: 1, apagada: 1 });
    expect(cargaDaBateria(c)).toBe(50);
    expect(cargaDaBateria({ falta: 0, no_anki: 0 })).toBe(100);
  });

  it("filtro do celular", () => {
    expect(passaNoFiltro("fora", "todas")).toBe(true);
    expect(passaNoFiltro("fora", "falta")).toBe(false);
    expect(passaNoFiltro("no_anki", "no_anki")).toBe(true);
  });

  it("apps na ordem do edital; matéria fora do concurso vai pro fim", () => {
    const materias = new Map([
      ["m1", { id: "m1", nome: "Penal", icone: "⚖️" }],
      ["m2", { id: "m2", nome: "Português", icone: "📝" }],
    ]);
    const apps = appsPorMateria(itens, materias, ["m2"]);
    expect(apps.map((a) => a.materiaId)).toEqual(["m2", "m1"]);
    expect(apps[1].contagem.falta).toBe(1);
  });

  it("seções por assunto seguem matéria → ordem do edital → ordem de entrada", () => {
    const topicos = new Map([
      ["t1", { id: "t1", titulo: "Crimes", ordem: 2 }],
      ["t2", { id: "t2", titulo: "Crase", ordem: 1 }],
    ]);
    const secoes = secoesPorAssunto(itens, topicos, ["m1", "m2"], new Map());
    expect(secoes.map((s) => s.titulo)).toEqual(["Crimes", "Crase"]);
    expect(secoes[0].itens.map((i) => i.questaoId)).toEqual([Q1, Q2]);
  });
});
