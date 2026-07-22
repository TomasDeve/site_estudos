import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { QuestaoLog, TopicoMeta, TopicoMetaTipo } from "@/types/db";
import { avaliarMeta, blocoFrio, placarAssunto, ultimasQuestoes } from "./metasTopico";

/** Um registro de questões do dia. */
function log(data: string, total: number, acertos: number): QuestaoLog {
  return {
    id: `l-${data}-${total}`,
    data,
    total,
    acertos,
    topico_id: "t",
    materia_id: "m",
    materia_texto: null,
    origem: "clique",
    user_id: "u",
    created_at: `${data}T12:00:00Z`,
  };
}

/** Uma meta do plano padrão, com os números que o teste quiser. */
function meta(tipo: TopicoMetaTipo, extra: Partial<TopicoMeta> = {}): TopicoMeta {
  return {
    id: `m-${tipo}`,
    chave: tipo,
    titulo: tipo,
    tipo,
    alvo: null,
    janela: null,
    dias: null,
    concluida: false,
    concluida_at: null,
    ordem: 0,
    topico_id: "t",
    user_id: "u",
    created_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-21T12:00:00"));
});
afterAll(() => vi.useRealTimers());

describe("ultimasQuestoes", () => {
  it("pega as mais recentes primeiro", () => {
    const logs = [log("2026-07-10", 10, 5), log("2026-07-20", 10, 9)];
    expect(ultimasQuestoes(logs, 10)).toMatchObject({ total: 10, acertos: 9, pct: 90 });
  });

  it("corta o dia mais antigo proporcionalmente", () => {
    // 20 da janela: 10 de 20/07 (9 acertos) + 10 dos 30 de 10/07 (24 acertos → 8)
    const logs = [log("2026-07-10", 30, 24), log("2026-07-20", 10, 9)];
    expect(ultimasQuestoes(logs, 20)).toMatchObject({ total: 20, acertos: 17, pct: 85 });
  });

  it("devolve o que tem quando a janela não fecha", () => {
    expect(ultimasQuestoes([log("2026-07-20", 6, 6)], 20)).toMatchObject({ total: 6, pct: 100 });
  });
});

describe("meta de volume", () => {
  const m = meta("volume", { alvo: 20, dias: 2 });

  it("fecha com 20 questões em 2 dias", () => {
    const logs = [log("2026-07-19", 12, 10), log("2026-07-20", 8, 7)];
    expect(avaliarMeta(m, logs)).toMatchObject({ concluida: true });
  });

  it("não fecha se as 20 saíram todas no mesmo dia", () => {
    const e = avaliarMeta(m, [log("2026-07-20", 25, 20)]);
    expect(e.concluida).toBe(false);
    expect(e.detalhe).toContain("num dia só");
  });

  it("não fecha com poucas questões", () => {
    const logs = [log("2026-07-19", 5, 4), log("2026-07-20", 5, 4)];
    expect(avaliarMeta(m, logs)).toMatchObject({ concluida: false, progresso: 0.5 });
  });
});

describe("meta de acerto", () => {
  const m = meta("acerto", { alvo: 85, janela: 20 });

  it("exige a janela cheia antes de dar veredito", () => {
    const e = avaliarMeta(m, [log("2026-07-20", 10, 10)]);
    expect(e.concluida).toBe(false);
    expect(e.detalhe).toContain("faltam 10 questões");
  });

  it("fecha em 85%", () => {
    expect(avaliarMeta(m, [log("2026-07-20", 20, 17)])).toMatchObject({ concluida: true });
  });

  it("não fecha abaixo do alvo", () => {
    // 19/25 é 76% no total, mas a janela pega 20 (proporcional: 15/20 = 75%).
    const e = avaliarMeta(m, [log("2026-07-20", 25, 19)]);
    expect(e.concluida).toBe(false);
    expect(e.detalhe).toBe("75% nas últimas 20 · alvo 85%");
  });

  it("olha só a janela, não a vida toda", () => {
    // 60% no passado distante, 90% nas últimas 20: o que vale é o agora.
    const logs = [log("2026-05-01", 100, 60), log("2026-07-20", 20, 18)];
    expect(avaliarMeta(m, logs)).toMatchObject({ concluida: true });
  });
});

describe("teste frio", () => {
  const m = meta("frio", { alvo: 80, janela: 10, dias: 7 });

  it("acha o bloco depois da lacuna de 7 dias", () => {
    const logs = [log("2026-07-01", 20, 15), log("2026-07-15", 10, 9)];
    expect(blocoFrio(logs, 10, 7)).toMatchObject({ data: "2026-07-15", total: 10, completo: true });
  });

  it("fecha quando o bloco frio passa de 80%", () => {
    const logs = [log("2026-07-01", 20, 15), log("2026-07-15", 10, 9)];
    expect(avaliarMeta(m, logs)).toMatchObject({ concluida: true });
  });

  it("reprova o bloco frio fraco", () => {
    const logs = [log("2026-07-01", 20, 18), log("2026-07-15", 10, 6)];
    const e = avaliarMeta(m, logs);
    expect(e.concluida).toBe(false);
    expect(e.detalhe).toContain("abaixo de 80%");
  });

  it("estudo em dias seguidos não vira teste frio", () => {
    const logs = [log("2026-07-19", 20, 18), log("2026-07-20", 10, 10)];
    expect(blocoFrio(logs, 10, 7)).toBeNull();
    expect(avaliarMeta(m, logs)).toMatchObject({ concluida: false });
  });

  it("avisa quantos dias faltam para esfriar", () => {
    const e = avaliarMeta(m, [log("2026-07-18", 20, 18)]); // hoje é 21/07
    expect(e.detalhe).toBe("esfria em 4 dias");
  });

  it("libera o teste quando já passou o tempo parado", () => {
    const e = avaliarMeta(m, [log("2026-07-01", 20, 18)]);
    expect(e.detalhe).toContain("liberado");
  });

  it("mostra o bloco frio pela metade", () => {
    const logs = [log("2026-07-01", 20, 18), log("2026-07-20", 4, 4)];
    expect(avaliarMeta(m, logs).detalhe).toContain("4/10");
  });
});

describe("meta manual e 'dar por cumprida'", () => {
  it("vale o clique", () => {
    expect(avaliarMeta(meta("manual", { concluida: true }), [])).toMatchObject({
      concluida: true,
      automatica: false,
    });
  });

  it("marcar na mão fecha a automática que o histórico ainda não provou", () => {
    const m = meta("acerto", { alvo: 85, janela: 20, concluida: true });
    expect(avaliarMeta(m, [])).toMatchObject({ concluida: true, forcada: true });
  });

  it("o histórico manda quando ele já provou", () => {
    const m = meta("acerto", { alvo: 85, janela: 20, concluida: true });
    expect(avaliarMeta(m, [log("2026-07-20", 20, 18)])).toMatchObject({ forcada: false });
  });
});

describe("placarAssunto", () => {
  it("conta as metas fechadas", () => {
    const metas = [
      meta("manual", { id: "a", chave: "lei", concluida: true }),
      meta("manual", { id: "b", chave: "producao" }),
      meta("volume", { id: "c", chave: "volume", alvo: 20, dias: 2 }),
    ];
    const logs = [log("2026-07-19", 12, 10), log("2026-07-20", 8, 7)];
    expect(placarAssunto(metas, logs)).toMatchObject({ feitas: 2, total: 3, fechado: false });
  });

  it("sem metas cadastradas o assunto não conta como fechado", () => {
    expect(placarAssunto([], [])).toMatchObject({ feitas: 0, fechado: false });
  });
});
