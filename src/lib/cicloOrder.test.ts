import { describe, expect, it } from "vitest";
import type { CicloItem } from "@/types/db";
import { estadoCiclo } from "./cicloOrder";

/** Cria um item de ciclo mínimo para os testes. */
function mk(
  id: string,
  ordem: number,
  extra: Partial<Pick<CicloItem, "concluido" | "adiado_em">> = {}
): CicloItem {
  return {
    id,
    ordem,
    concluido: false,
    adiado_em: null,
    concluido_at: null,
    concurso_id: "c",
    materia_id: `m-${id}`,
    user_id: "u",
    voltas: 0,
    created_at: "2026-01-01T00:00:00Z",
    ...extra,
  };
}

describe("estadoCiclo", () => {
  it("sem reservas: a atual é a primeira, a próxima é a seguinte", () => {
    const itens = [mk("a", 0), mk("b", 1), mk("c", 2)];
    const { atual, proxima, adiadas } = estadoCiclo(itens);
    expect(atual?.id).toBe("a");
    expect(proxima?.id).toBe("b");
    expect(adiadas).toHaveLength(0);
  });

  it("pular a atual: ela vira reserva (próxima) e a seguinte assume", () => {
    // "a" foi pulada (adiada) → "b" estuda agora, "a" fica como próxima.
    const itens = [
      mk("a", 0, { adiado_em: "2026-07-11T10:00:00Z" }),
      mk("b", 1),
      mk("c", 2),
    ];
    const { atual, proxima, adiadas } = estadoCiclo(itens);
    expect(atual?.id).toBe("b");
    expect(proxima?.id).toBe("a"); // a reserva é a próxima
    expect(adiadas.map((i) => i.id)).toEqual(["a"]);
  });

  it("pular de novo: a próxima continua sendo a primeira pulada", () => {
    // "a" pulada às 10h; depois "b" pulada às 11h. "c" estuda agora,
    // mas a PRÓXIMA continua sendo "a" (a reserva mais antiga).
    const itens = [
      mk("a", 0, { adiado_em: "2026-07-11T10:00:00Z" }),
      mk("b", 1, { adiado_em: "2026-07-11T11:00:00Z" }),
      mk("c", 2),
    ];
    const { atual, proxima, fila } = estadoCiclo(itens);
    expect(atual?.id).toBe("c");
    expect(proxima?.id).toBe("a");
    expect(fila.map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("todas adiadas: a atual passa a ser a reserva mais antiga", () => {
    const itens = [
      mk("a", 0, { adiado_em: "2026-07-11T11:00:00Z" }),
      mk("b", 1, { adiado_em: "2026-07-11T10:00:00Z" }),
    ];
    const { atual, proxima } = estadoCiclo(itens);
    expect(atual?.id).toBe("b"); // adiada mais cedo
    expect(proxima?.id).toBe("a");
  });

  it("ignora as concluídas ao escolher atual/próxima", () => {
    const itens = [
      mk("a", 0, { concluido: true }),
      mk("b", 1),
      mk("c", 2),
    ];
    const { atual, proxima } = estadoCiclo(itens);
    expect(atual?.id).toBe("b");
    expect(proxima?.id).toBe("c");
  });
});
