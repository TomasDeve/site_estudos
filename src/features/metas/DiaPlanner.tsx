import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { BlocoDia } from "@/types/db";
import { useBlocosDia, useCopiarBlocos, useExcluirBloco, useToggleBloco } from "@/api/blocos";
import { useMetas, metaVigente } from "@/api/metas";
import {
  calcStreak,
  diaEstaConcluido,
  useConcluirDia,
  useDesfazerDia,
  useDiasConcluidos,
} from "@/api/diasConcluidos";
import { useMaterias } from "@/api/materias";
import { fmtDataCurta, fmtMinutos, hojeISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { Modal } from "@/components/Modal";
import { Pencil, Trash2 } from "lucide-react";
import { BlocoFormModal } from "./BlocoFormModal";
import { celebrar } from "./celebration";

export function DiaPlanner({ concursoIdPadrao }: { concursoIdPadrao?: string }) {
  const hoje = hojeISO();
  const [data, setData] = useState(hoje);

  const { data: blocos, isLoading } = useBlocosDia(data);
  const { data: metas } = useMetas();
  const { data: diasConcluidos } = useDiasConcluidos();
  const { data: materias } = useMaterias();

  const toggle = useToggleBloco();
  const excluir = useExcluirBloco();
  const copiar = useCopiarBlocos();
  const concluirDia = useConcluirDia();
  const desfazerDia = useDesfazerDia();

  const [modalBloco, setModalBloco] = useState(false);
  const [editandoBloco, setEditandoBloco] = useState<BlocoDia | null>(null);
  const [modalStreak, setModalStreak] = useState<number | null>(null);

  const meta = metaVigente(metas, data);
  const metaMin = meta ? Math.round(Number(meta.horas_dia) * 60) : null;
  const feitosMin = (blocos ?? []).filter((b) => b.concluido).reduce((s, b) => s + b.duracao_min, 0);
  const pctMeta = metaMin ? Math.min(100, Math.round((feitosMin / metaMin) * 100)) : null;

  const concluido = diaEstaConcluido(diasConcluidos, data);
  const todosFeitos = (blocos ?? []).length > 0 && (blocos ?? []).every((b) => b.concluido);
  const ehHoje = data === hoje;
  const rotuloDia = ehHoje
    ? "Hoje"
    : data === format(addDays(parseISO(hoje), -1), "yyyy-MM-dd")
      ? "Ontem"
      : data === format(addDays(parseISO(hoje), 1), "yyyy-MM-dd")
        ? "Amanhã"
        : fmtDataCurta(data);

  const nomeMat = useMemo(() => {
    const mapa = new Map((materias ?? []).map((m) => [m.id, m]));
    return (id: string | null) => (id ? mapa.get(id) : undefined);
  }, [materias]);

  async function onConcluirDia() {
    if (!todosFeitos && (blocos ?? []).length > 0) {
      const restam = (blocos ?? []).filter((b) => !b.concluido).length;
      if (!window.confirm(`Ainda ${restam === 1 ? "falta 1 bloco" : `faltam ${restam} blocos`}. Concluir o dia mesmo assim?`)) return;
    }
    try {
      await concluirDia.mutateAsync({ data, horas_estudadas: feitosMin / 60 });
      celebrar();
      const novoStreak = calcStreak(
        [...(diasConcluidos ?? []), { data } as never],
        hoje
      );
      setModalStreak(Math.max(novoStreak, 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        {/* navegação de dia */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setData(format(addDays(parseISO(data), -1), "yyyy-MM-dd"))}
              className="cursor-pointer rounded-lg p-1.5 text-dim hover:bg-navy-700 hover:text-txt"
              aria-label="Dia anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="min-w-28 text-center">
              <p className="text-sm font-bold capitalize text-txt">{rotuloDia}</p>
              {!ehHoje && (
                <button
                  onClick={() => setData(hoje)}
                  className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-gold hover:underline"
                >
                  ir para hoje
                </button>
              )}
            </div>
            <button
              onClick={() => setData(format(addDays(parseISO(data), 1), "yyyy-MM-dd"))}
              className="cursor-pointer rounded-lg p-1.5 text-dim hover:bg-navy-700 hover:text-txt"
              aria-label="Próximo dia"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="text-right text-xs text-dim">
            {meta ? (
              <>
                Meta:{" "}
                <strong className="text-txt">
                  {fmtMinutos(metaMin!)}
                </strong>
                /dia
                {meta.descricao && <span className="text-mut"> · {meta.descricao}</span>}
              </>
            ) : (
              <span className="text-mut">Sem meta para este dia</span>
            )}
          </div>
        </div>

        {/* barra da meta */}
        {metaMin !== null && (
          <div>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-dim">
                Cumprido <strong className="text-txt">{fmtMinutos(feitosMin)}</strong> de{" "}
                {fmtMinutos(metaMin)}
              </span>
              <span className="font-bold tabular-nums text-gold">{pctMeta}%</span>
            </div>
            <ProgressBar value={pctMeta ?? 0} />
          </div>
        )}

        {/* blocos */}
        {isLoading ? null : (blocos ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-line/70 p-6 text-center">
            <p className="text-sm text-mut">Nenhum bloco planejado para este dia.</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button size="sm" onClick={() => { setEditandoBloco(null); setModalBloco(true); }}>
                <Plus className="size-4" /> Bloco
              </Button>
              <Button
                size="sm"
                variant="secondary"
                loading={copiar.isPending}
                onClick={async () => {
                  const ontem = format(addDays(parseISO(data), -1), "yyyy-MM-dd");
                  const n = await copiar.mutateAsync({ de: ontem, para: data });
                  if (n === 0) toast.info("Ontem também não tinha blocos.");
                  else toast.success(`${n} blocos copiados de ontem.`);
                }}
              >
                <Copy className="size-4" /> Copiar de ontem
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {(blocos ?? []).map((b) => {
              const mat = nomeMat(b.materia_id);
              return (
                <li
                  key={b.id}
                  className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                    b.concluido
                      ? "border-green/25 bg-green/8"
                      : "border-line/50 bg-navy-900/50 hover:border-line"
                  }`}
                >
                  <button
                    onClick={() => toggle.mutate(b)}
                    disabled={concluido}
                    className={`flex size-5.5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all disabled:cursor-not-allowed ${
                      b.concluido
                        ? "border-green bg-green text-navy-950"
                        : "border-mut hover:border-gold hover:scale-110"
                    }`}
                    aria-label={b.concluido ? "Desmarcar bloco" : "Concluir bloco"}
                  >
                    {b.concluido && <CheckCircle2 className="size-4" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug ${
                        b.concluido ? "text-mut line-through" : "text-txt"
                      }`}
                    >
                      {b.titulo}
                    </p>
                    {mat && (
                      <p className="mt-0.5 text-[11px] text-mut">
                        {mat.icone} {mat.nome}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-md bg-navy-700 px-2 py-0.5 text-[11px] font-bold tabular-nums text-dim">
                    {fmtMinutos(b.duracao_min)}
                  </span>
                  {!concluido && (
                    <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                      <button
                        onClick={() => { setEditandoBloco(b); setModalBloco(true); }}
                        className="cursor-pointer rounded-md p-1 text-mut hover:bg-navy-600 hover:text-txt"
                        aria-label="Editar bloco"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => excluir.mutate(b)}
                        className="cursor-pointer rounded-md p-1 text-mut hover:bg-red/10 hover:text-red"
                        aria-label="Excluir bloco"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* rodapé: adicionar + concluir dia */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-4">
          {(blocos ?? []).length > 0 && !concluido ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => { setEditandoBloco(null); setModalBloco(true); }}
            >
              <Plus className="size-4" /> Bloco
            </Button>
          ) : (
            <span />
          )}

          {concluido ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-green">
                <CheckCircle2 className="size-4.5" /> Dia concluído!
              </span>
              <button
                onClick={() => desfazerDia.mutate(data)}
                className="flex cursor-pointer items-center gap-1 text-xs text-mut hover:text-dim"
              >
                <Undo2 className="size-3.5" /> desfazer
              </button>
            </div>
          ) : (
            (blocos ?? []).length > 0 && (
              <Button
                onClick={onConcluirDia}
                loading={concluirDia.isPending}
                className={todosFeitos ? "animate-pulse" : ""}
                variant={todosFeitos ? "primary" : "secondary"}
              >
                🏁 Concluir o dia
              </Button>
            )
          )}
        </div>
      </CardBody>

      <BlocoFormModal
        open={modalBloco}
        onClose={() => setModalBloco(false)}
        dataISO={data}
        bloco={editandoBloco}
        concursoIdPadrao={concursoIdPadrao}
        proximaOrdem={(blocos ?? []).reduce((m, b) => Math.max(m, b.ordem), -1) + 1}
      />

      {/* modal de celebração do streak */}
      <Modal
        open={modalStreak !== null}
        onClose={() => setModalStreak(null)}
        title="Dia concluído!"
        width="max-w-sm"
      >
        <div className="py-4 text-center">
          <div className="streak-glow text-6xl">🔥</div>
          <p className="mt-4 text-3xl font-black text-gold">
            {modalStreak} {modalStreak === 1 ? "dia" : "dias"}
          </p>
          <p className="mt-1 text-sm font-semibold text-txt">
            {modalStreak === 1 ? "Sequência iniciada!" : "seguidos de estudo!"}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-dim">
            {modalStreak && modalStreak >= 7
              ? "Constância é o que separa aprovados de quase-aprovados. Você está no caminho. 🏆"
              : "Volte amanhã e mantenha a chama acesa. Cada dia conta na aprovação."}
          </p>
          <Button className="mt-5 w-full" onClick={() => setModalStreak(null)}>
            Continuar firme 💪
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
