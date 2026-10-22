import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUp, Check, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Materia } from "@/types/db";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useDevolverAoCiclo, useLinhasDoCiclo, useSubirDoCiclo } from "@/api/cicloFila";
import { useDiasConcluidos } from "@/api/diasConcluidos";
import { useConcursoMaterias } from "@/api/materias";
import { fmtMinutos, hojeISO } from "@/lib/dates";
import { MenuMais } from "@/components/MenuMais";
import { atividadeDe, rotuloDoDia } from "./planoDias";
import {
  HORA_DA_VIRADA,
  TEMPOS_AO_SUBIR,
  diaDeEstudo,
  lerFila,
  situacaoDoCiclo,
  type EstadoItem,
  type ItemCiclo,
} from "./cicloFila";

/** Aberto/fechado fica neste navegador; começa aberto. */
const CHAVE_ABERTO = "plano.filaAberta";

function abertoSalvo(): boolean {
  try {
    return localStorage.getItem(CHAVE_ABERTO) !== "0";
  } catch {
    return true;
  }
}

/**
 * Ciclo de estudos, logo abaixo da grade do plano: a fila fixa do concurso,
 * numerada. Cada item na fila tem "Subir" (escolhendo o tempo): ele vira um bloco
 * no dia de estudo — hoje, ou o próximo dia aberto se hoje já foi concluído (até
 * as 6h ainda vale o dia anterior). Feito, o item fica verde; o dia acabou sem
 * fazer, o bloco sai do dia e o item volta pra fila. Todos feitos = nova volta.
 */
export function CicloDeEstudos({ materiaPorId }: { materiaPorId: Map<string, Materia> }) {
  const concurso = useConcursoAtual();
  const fila = useMemo(() => lerFila(concurso.ciclo_fila), [concurso.ciclo_fila]);
  const voltaGravada = concurso.ciclo_volta ?? 1;
  const { data: linhas } = useLinhasDoCiclo(voltaGravada);
  const { data: diasConcluidos } = useDiasConcluidos();
  const { data: vinculos } = useConcursoMaterias();
  const subir = useSubirDoCiclo();
  const devolver = useDevolverAoCiclo();
  const [aberto, setAberto] = useState(abertoSalvo);

  const hoje = hojeISO();
  const concluidos = useMemo(() => new Set((diasConcluidos ?? []).map((d) => d.data)), [diasConcluidos]);
  const diaBase = diaDeEstudo(new Date(), concluidos);
  const situacao = useMemo(
    () => situacaoDoCiclo(fila, linhas ?? [], voltaGravada, diaBase, concluidos),
    [fila, linhas, voltaGravada, diaBase, concluidos]
  );
  // Recado "para a próxima vez" de cada matéria neste concurso.
  const recados = useMemo(
    () =>
      new Map(
        (vinculos ?? [])
          .filter((v) => v.concurso_id === concurso.id && v.proximo_estudo)
          .map((v) => [v.materia_id, v.proximo_estudo])
      ),
    [vinculos, concurso.id]
  );

  // Blocos do ciclo que ficaram por fazer num dia que já acabou: saem do dia e o
  // item volta pra fila. Uma vez por conjunto (a lista some quando o banco responde).
  const devolvidos = useRef("");
  useEffect(() => {
    if (!linhas || !diasConcluidos) return;
    const ids = situacao.devolvidas.map((l) => l.id).filter((id) => !id.startsWith("tmp-"));
    const chave = [...ids].sort().join(",");
    if (!ids.length || devolvidos.current === chave) return;
    devolvidos.current = chave;
    devolver.mutate(ids, {
      onSuccess: () =>
        toast(
          ids.length === 1
            ? "1 bloco do ciclo ficou por fazer e voltou pra fila"
            : `${ids.length} blocos do ciclo ficaram por fazer e voltaram pra fila`
        ),
      onError: erro,
    });
  }, [situacao.devolvidas, linhas, diasConcluidos]);

  if (fila.length === 0) return null;

  const destino = rotuloDoDia(diaBase, hoje);
  const destinoTexto = `${destino.nome.toLowerCase()} (${destino.data})`;

  function erro(err: unknown) {
    toast.error(err instanceof Error ? err.message : String(err));
  }

  function alternar() {
    const v = !aberto;
    setAberto(v);
    try {
      localStorage.setItem(CHAVE_ABERTO, v ? "1" : "0");
    } catch {
      /* localStorage indisponível: vale só nesta visita */
    }
  }

  function subirItem(item: ItemCiclo, minutos: number) {
    const nome = materiaPorId.get(item.materia_id)?.nome ?? "Matéria";
    subir.mutate(
      {
        concursoId: concurso.id,
        item,
        volta: situacao.volta,
        voltaGravada,
        data: diaBase,
        minutos,
        nota: recados.get(item.materia_id) ?? "",
      },
      {
        onError: erro,
        onSuccess: () => toast.success(`${nome} (${fmtMinutos(minutos)}) foi para ${destinoTexto}`),
      }
    );
  }

  return (
    <section className="border-t border-line/40 pt-4">
      <h2 className="text-sm font-semibold text-txt">
        <button
          type="button"
          onClick={alternar}
          aria-expanded={aberto}
          aria-controls="ciclo-de-estudos"
          title={aberto ? "Ocultar a fila do ciclo" : "Mostrar a fila do ciclo"}
          className="group -ml-1 inline-flex cursor-pointer items-center gap-1 rounded-md py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-navy-700/50"
        >
          <ChevronRight
            className={`size-4 shrink-0 text-mut transition-transform group-hover:text-txt ${
              aberto ? "rotate-90" : ""
            }`}
            aria-hidden
          />
          Ciclo de estudos
        </button>
      </h2>
      <p className="mt-0.5 pl-5 text-xs text-mut">
        <strong className="text-dim">Volta {situacao.volta}</strong> · {situacao.feitos} de {fila.length}{" "}
        feitos
        {situacao.volta > 1 && (
          <>
            {" "}
            ·{" "}
            <span className="text-green">
              ✓ {situacao.volta - 1 === 1 ? "1 volta completa" : `${situacao.volta - 1} voltas completas`}
            </span>
          </>
        )}{" "}
        · o que subir vai para <strong className="text-gold">{destinoTexto}</strong>
        {diaBase > hoje && " — hoje já foi concluído"}
        {diaBase < hoje && ` — até as ${HORA_DA_VIRADA}h ainda conta o dia anterior`}
      </p>

      {aberto && (
        <ol
          id="ciclo-de-estudos"
          aria-label="Fila do ciclo, em ordem"
          className="mt-3 grid gap-1.5 sm:grid-flow-col sm:grid-cols-2 sm:[grid-template-rows:repeat(var(--linhas),minmax(0,auto))]"
          style={{ "--linhas": Math.ceil(fila.length / 2) } as CSSProperties}
        >
          {fila.map((item, i) => (
            <LinhaDaFila
              key={item.id}
              ordem={i + 1}
              item={item}
              materia={materiaPorId.get(item.materia_id)}
              estado={situacao.estados.get(item.id) ?? { tipo: "fila" }}
              proximo={situacao.proximo?.id === item.id}
              recado={recados.get(item.materia_id) ?? ""}
              hoje={hoje}
              destino={destinoTexto}
              ocupado={subir.isPending}
              onSubir={(min) => subirItem(item, min)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function LinhaDaFila({
  ordem,
  item,
  materia,
  estado,
  proximo,
  recado,
  hoje,
  destino,
  ocupado,
  onSubir,
}: {
  ordem: number;
  item: ItemCiclo;
  materia: Materia | undefined;
  estado: EstadoItem;
  proximo: boolean;
  recado: string;
  hoje: string;
  destino: string;
  ocupado: boolean;
  onSubir: (minutos: number) => void;
}) {
  const at = atividadeDe(item.atividade);
  const feito = estado.tipo === "feito";
  return (
    <li
      className={`flex min-w-0 items-center gap-2 rounded-lg border py-1.5 pl-2 pr-1.5 ${
        feito
          ? "border-green/30 bg-green/8"
          : estado.tipo === "no_dia"
            ? "border-gold/30 bg-gold/5"
            : proximo
              ? "border-gold/60 bg-navy-900/60 shadow-[0_0_0_1px_rgb(224_168_62/0.15)]"
              : "border-line/60 bg-navy-900/40"
      }`}
    >
      <span className="w-5 shrink-0 text-[11px] font-semibold tabular-nums text-mut">
        {String(ordem).padStart(2, "0")}
      </span>
      <span className={`shrink-0 text-sm leading-none ${feito ? "opacity-60" : ""}`} aria-hidden>
        {materia?.icone ?? at.icone}
      </span>
      <span className="min-w-0 flex-1" title={recado ? `Recado: ${recado}` : undefined}>
        <span
          className={`block truncate text-xs font-semibold ${feito ? "text-mut line-through" : "text-txt"}`}
        >
          {materia?.nome ?? "Matéria removida"}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px]">
          <span className={`shrink-0 font-bold uppercase tracking-wide ${at.texto}`}>{at.label}</span>
          <span className="shrink-0 text-mut">· {fmtMinutos(item.minutos)}</span>
          {recado && !feito && <span className="truncate text-dim">· 📝 {recado}</span>}
        </span>
      </span>

      {estado.tipo === "feito" ? (
        <span
          className="flex shrink-0 items-center gap-1 px-1.5 text-[11px] font-semibold text-green"
          title={`Feito em ${rotuloDoDia(estado.linha.data, hoje).data}`}
        >
          <Check className="size-3.5" strokeWidth={3} /> {rotuloDoDia(estado.linha.data, hoje).data}
        </span>
      ) : estado.tipo === "no_dia" ? (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold"
          title="Já está no dia, esperando você fazer"
        >
          <Clock className="size-3" /> {rotuloDoDia(estado.linha.data, hoje).nome}
        </span>
      ) : (
        <span className={ocupado ? "pointer-events-none opacity-60" : ""}>
          <MenuMais
            aria={`Subir ${materia?.nome ?? "item"} para ${destino}`}
            rotulo={
              <>
                <ArrowUp className="size-3.5" />
                {proximo ? "Subir" : <span className="max-sm:hidden">Subir</span>}
              </>
            }
            itens={TEMPOS_AO_SUBIR.map((t) => ({
              icone: <Clock className="size-3.5" />,
              label: `${fmtMinutos(t)} para ${destino}${t === item.minutos ? " ★" : ""}`,
              onClick: () => onSubir(t),
            }))}
          />
        </span>
      )}
    </li>
  );
}
