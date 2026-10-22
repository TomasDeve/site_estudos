import { format, subHours } from "date-fns";
import type { Json, PlanoHora } from "@/types/db";
import { ATIVIDADES, somarDias, type AtividadeChave } from "./planoDias";

/**
 * Ciclo de estudos em fila (Painel): uma sequência fixa de itens — matéria, tempo
 * sugerido e atividade — gravada no concurso (`concursos.ciclo_fila`). Você sobe
 * um item para o dia de estudo; o bloco do plano guarda de qual item e de qual
 * volta veio (`plano_horas.ciclo_item`/`ciclo_volta`). Feito, o item sai da volta;
 * o dia acabou sem fazer, o bloco é apagado e o item volta pra fila. Todos os
 * itens feitos = começa a volta seguinte.
 */
export interface ItemCiclo {
  id: string;
  materia_id: string;
  /** Tempo com que o bloco entra no dia; o real você ajusta no bloco, estudando. */
  minutos: number;
  atividade: AtividadeChave;
}

/** Lê a fila gravada no concurso, descartando o que não tiver o formato certo. */
export function lerFila(json: Json | null | undefined): ItemCiclo[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((x) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) return [];
    const { id, materia_id, minutos, atividade } = x as Record<string, unknown>;
    if (typeof id !== "string" || typeof materia_id !== "string") return [];
    return [
      {
        id,
        materia_id,
        minutos: typeof minutos === "number" && minutos > 0 ? minutos : 60,
        atividade: ATIVIDADES.some((a) => a.chave === atividade)
          ? (atividade as AtividadeChave)
          : "teoria",
      },
    ];
  });
}

/**
 * Até esta hora da madrugada ainda vale o dia anterior: quem estuda das 22h às
 * 4h conta tudo no dia em que começou.
 */
export const HORA_DA_VIRADA = 6;

/**
 * O dia que recebe o que você sobe do ciclo: o de hoje (antes das 6h, o de
 * ontem) ou, se ele já foi concluído, o primeiro dia seguinte ainda aberto.
 */
export function diaDeEstudo(agora: Date, concluidos: ReadonlySet<string>): string {
  let dia = format(subHours(agora, HORA_DA_VIRADA), "yyyy-MM-dd");
  while (concluidos.has(dia)) dia = somarDias(dia, 1);
  return dia;
}

export type EstadoItem =
  | { tipo: "feito"; linha: PlanoHora }
  | { tipo: "no_dia"; linha: PlanoHora }
  | { tipo: "fila" };

export interface SituacaoCiclo {
  /** A volta em andamento (a gravada, ou a seguinte se a gravada já fechou). */
  volta: number;
  estados: Map<string, EstadoItem>;
  feitos: number;
  /** O primeiro item da volta ainda na fila. */
  proximo: ItemCiclo | null;
  /** Blocos do ciclo não feitos num dia que já acabou: voltam pra fila (apagar). */
  devolvidas: PlanoHora[];
}

/**
 * Onde cada item da fila está na volta: feito, já no dia (esperando) ou na fila.
 * Um bloco não feito de dia que já acabou (antes do dia de estudo, ou num dia
 * concluído) não segura o item: ele volta pra fila e o bloco é devolvido.
 */
export function situacaoDoCiclo(
  fila: ItemCiclo[],
  linhas: PlanoHora[],
  voltaGravada: number,
  diaBase: string,
  concluidos: ReadonlySet<string>
): SituacaoCiclo {
  const acabou = (l: PlanoHora) => l.data < diaBase || concluidos.has(l.data);
  const devolvidas = linhas.filter((l) => l.ciclo_item && !l.feita && acabou(l));

  function estadosDa(volta: number) {
    const estados = new Map<string, EstadoItem>();
    for (const item of fila) {
      const dele = linhas.filter((l) => l.ciclo_item === item.id && l.ciclo_volta === volta);
      const feita = dele.find((l) => l.feita);
      const esperando = dele.find((l) => !l.feita && !acabou(l));
      estados.set(
        item.id,
        feita ? { tipo: "feito", linha: feita } : esperando ? { tipo: "no_dia", linha: esperando } : { tipo: "fila" }
      );
    }
    return estados;
  }

  let volta = voltaGravada;
  let estados = estadosDa(volta);
  const fechou = (e: Map<string, EstadoItem>) =>
    fila.length > 0 && [...e.values()].every((x) => x.tipo === "feito");
  if (fechou(estados)) {
    volta += 1;
    estados = estadosDa(volta);
  }
  const feitos = [...estados.values()].filter((e) => e.tipo === "feito").length;
  const proximo = fila.find((i) => estados.get(i.id)?.tipo === "fila") ?? null;
  return { volta, estados, feitos, proximo, devolvidas };
}
