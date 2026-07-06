import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ArrowRight, Check, Plus, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CicloItem } from "@/types/db";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import {
  useCicloItens,
  useGerarCiclo,
  useReiniciarVolta,
  useRemoverDoCiclo,
  useReordenarCiclo,
  useSetItemConcluido,
} from "@/api/ciclo";
import { sugerirOrdemCiclo } from "@/lib/cicloOrder";
import { progressoMateria } from "@/lib/progresso";
import { celebrar } from "@/features/metas/celebration";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { AdicionarMateriaModal } from "./AdicionarMateriaModal";
import { CicloItemRow } from "./CicloItemRow";

export function CicloPage() {
  const concurso = useConcursoAtual();
  const cor = concurso.cor;
  const { data: materias, isLoading: l1 } = useMaterias();
  const { data: vinculos, isLoading: l2 } = useConcursoMaterias();
  const { data: topicos, isLoading: l3 } = useTopicos();
  const { data: itens, isLoading: l4 } = useCicloItens();

  const gerar = useGerarCiclo();
  const setConcluido = useSetItemConcluido();
  const reiniciar = useReiniciarVolta();
  const reordenar = useReordenarCiclo();
  const remover = useRemoverDoCiclo();

  const sensors = useSensors(
    // distância de ativação: um clique curto na alça não conta como arraste
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [modalAdd, setModalAdd] = useState(false);

  const materiaById = useMemo(
    () => new Map((materias ?? []).map((m) => [m.id, m])),
    [materias]
  );
  const vinculosConcurso = useMemo(
    () => (vinculos ?? []).filter((v) => v.concurso_id === concurso.id),
    [vinculos, concurso.id]
  );
  const meusItens = useMemo(
    () =>
      (itens ?? [])
        .filter((i) => i.concurso_id === concurso.id)
        .sort((a, b) => a.ordem - b.ordem),
    [itens, concurso.id]
  );

  const ordemSugerida = useMemo(
    () => sugerirOrdemCiclo(vinculosConcurso),
    [vinculosConcurso]
  );

  if (l1 || l2 || l3 || l4) return <FullScreenSpinner />;

  const progresso = (materiaId: string) => progressoMateria(materiaId, topicos ?? []);
  const nome = (i: CicloItem) => materiaById.get(i.materia_id)?.nome ?? "Matéria";
  const icone = (i: CicloItem) => materiaById.get(i.materia_id)?.icone ?? "📚";

  const total = meusItens.length;
  const concluidosNaVolta = meusItens.filter((i) => i.concluido).length;
  const pctVolta = total === 0 ? 0 : Math.round((concluidosNaVolta / total) * 100);
  const atual = meusItens.find((i) => !i.concluido) ?? null;
  const indexAtual = atual ? meusItens.indexOf(atual) : -1;
  const proxima =
    indexAtual >= 0
      ? meusItens.slice(indexAtual + 1).find((i) => !i.concluido) ?? null
      : null;
  const voltaCompleta = total > 0 && concluidosNaVolta === total;
  // voltas concluídas = quantas vezes o ciclo inteiro já foi percorrido.
  const voltasCompletas = total === 0 ? 0 : Math.min(...meusItens.map((i) => i.voltas));
  // número exibido como "volta atual": a que está sendo estudada (ou a recém-fechada).
  const voltaLabel = voltaCompleta ? voltasCompletas : voltasCompletas + 1;
  const proximaVolta = voltasCompletas + 1;

  async function onConcluirAtual() {
    if (!atual) return;
    const eraUltima = concluidosNaVolta === total - 1;
    try {
      await setConcluido.mutateAsync({ item: atual, concluido: true });
      if (eraUltima) {
        celebrar();
        toast.success(
          `🎉 Volta ${voltasCompletas + 1} concluída! Você percorreu todas as matérias.`
        );
      } else {
        const prox = proxima ? `${icone(proxima)} ${nome(proxima)}` : "a próxima matéria";
        toast.success(`✓ ${nome(atual)} concluída. Agora: ${prox}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onGerar() {
    try {
      await gerar.mutateAsync({ concursoId: concurso.id, materiaIds: ordemSugerida });
      toast.success("Ciclo de estudos criado! Comece pela primeira matéria.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onReiniciar() {
    const completa = voltaCompleta;
    try {
      await reiniciar.mutateAsync(concurso.id);
      toast.success(
        completa
          ? `Volta ${proximaVolta} iniciada. Bons estudos! 🚀`
          : "Volta reiniciada do início."
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = meusItens.findIndex((i) => i.id === active.id);
    const para = meusItens.findIndex((i) => i.id === over.id);
    if (de < 0 || para < 0) return;
    reordenar.mutate(arrayMove(meusItens, de, para));
  }

  const jaNoCiclo = new Set(meusItens.map((i) => i.materia_id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ciclo de Estudos"
        subtitle="A ordem de rodízio das matérias: estude uma, conclua e avance para a próxima. Ao fechar a volta, recomece para revisar."
      />

      {meusItens.length === 0 ? (
        /* ===== Sem ciclo: propor a ordem sugerida ===== */
        vinculosConcurso.length === 0 ? (
          <EmptyState
            icon="📚"
            title="Este concurso ainda não tem matérias"
            message="Adicione matérias ao edital em Conteúdos para montar o ciclo de estudos."
            action={
              <Link
                to="../conteudos"
                className="text-sm font-semibold text-gold hover:underline"
              >
                Ir para Conteúdos
              </Link>
            }
          />
        ) : (
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ background: `${cor}1a` }}
                >
                  <Sparkles className="size-5" style={{ color: cor }} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-txt">Ordem sugerida para você</h2>
                  <p className="mt-0.5 text-xs leading-relaxed text-dim">
                    Montei um rodízio intercalando <strong className="text-txt">Básicas</strong> e{" "}
                    <strong className="text-txt">Específicas</strong>, priorizando as matérias de
                    maior peso na prova. Você pode reordenar depois.
                  </p>
                </div>
              </div>

              <ol className="space-y-1.5">
                {ordemSugerida.map((materiaId, i) => {
                  const m = materiaById.get(materiaId);
                  const v = vinculosConcurso.find((x) => x.materia_id === materiaId);
                  return (
                    <li
                      key={materiaId}
                      className="flex items-center gap-3 rounded-xl border border-line/50 bg-navy-900/50 px-3 py-2"
                    >
                      <span
                        className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
                        style={{ background: `${cor}22`, color: cor }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-base">{m?.icone ?? "📚"}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-txt">
                        {m?.nome ?? "Matéria"}
                      </span>
                      {v?.peso_questoes != null && (
                        <span className="shrink-0 rounded-md bg-navy-700 px-2 py-0.5 text-[10px] font-bold text-dim">
                          {v.peso_questoes} q
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>

              <Button className="w-full" onClick={onGerar} loading={gerar.isPending}>
                <Sparkles className="size-4" /> Gerar ciclo de estudos
              </Button>
            </CardBody>
          </Card>
        )
      ) : (
        /* ===== Ciclo montado ===== */
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon="🔁" label="Volta atual" value={voltaLabel} />
            <StatCard
              icon="📍"
              label="Progresso da volta"
              value={`${concluidosNaVolta}/${total}`}
              sub={`${pctVolta}% do ciclo`}
            />
            <StatCard icon="📚" label="Matérias no ciclo" value={total} />
          </div>

          <ProgressBar value={pctVolta} color={cor} size="lg" showLabel />

          {/* Matéria de agora / volta concluída */}
          {voltaCompleta ? (
            <Card>
              <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-5xl">🏆</span>
                <div>
                  <h2 className="text-lg font-black text-txt">Volta {voltaLabel} concluída!</h2>
                  <p className="mt-1 text-sm text-dim">
                    Você passou por todas as {total} matérias. Reinicie para uma nova rodada de
                    revisão e fixação.
                  </p>
                </div>
                <Button onClick={onReiniciar} loading={reiniciar.isPending}>
                  <RotateCcw className="size-4" /> Iniciar volta {proximaVolta}
                </Button>
              </CardBody>
            </Card>
          ) : (
            atual && (
              <Card
                className="border-2"
                style={{ borderColor: `${cor}66`, background: `${cor}0d` }}
              >
                <CardBody className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                      style={{ background: `${cor}1f` }}
                    >
                      {icone(atual)}
                    </span>
                    <div className="min-w-0">
                      <p
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: cor }}
                      >
                        Estude agora
                      </p>
                      <h2 className="truncate text-lg font-bold text-txt">{nome(atual)}</h2>
                      <p className="text-xs text-mut">
                        Matéria {indexAtual + 1} de {total} do ciclo
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const p = progresso(atual.materia_id);
                    return p.total > 0 ? (
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] text-dim">
                          <span>
                            Tópicos concluídos: <strong className="text-txt">{p.concluidos}</strong>{" "}
                            de {p.total}
                          </span>
                          <span className="tabular-nums">{p.pct}%</span>
                        </div>
                        <ProgressBar value={p.pct} color={cor} />
                      </div>
                    ) : null;
                  })()}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      to="../conteudos"
                      className="text-xs font-semibold text-gold hover:underline"
                    >
                      Ver tópicos em Conteúdos
                    </Link>
                    <Button onClick={onConcluirAtual} loading={setConcluido.isPending}>
                      <Check className="size-4" /> Concluir e avançar
                    </Button>
                  </div>

                  {proxima && (
                    <p className="flex items-center gap-1.5 border-t border-line/30 pt-3 text-xs text-mut">
                      <ArrowRight className="size-3.5" /> A seguir: {icone(proxima)} {nome(proxima)}
                    </p>
                  )}
                </CardBody>
              </Card>
            )
          )}

          {/* Lista completa do ciclo */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-mut">
                Ordem do ciclo
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setModalAdd(true)}>
                <Plus className="size-4" /> Matéria
              </Button>
            </div>

            <p className="mb-2 text-[11px] text-mut">
              Arraste pela alça à esquerda de cada matéria para reordenar o ciclo.
            </p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={meusItens.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1.5">
                  {meusItens.map((item, i) => {
                    const p = progresso(item.materia_id);
                    return (
                      <CicloItemRow
                        key={item.id}
                        item={item}
                        index={i}
                        ehAtual={item.id === atual?.id}
                        cor={cor}
                        nome={nome(item)}
                        icone={icone(item)}
                        pct={p.pct}
                        temTopicos={p.total > 0}
                        onToggle={() =>
                          setConcluido.mutate({ item, concluido: !item.concluido })
                        }
                        onRemover={() => remover.mutate(item.id)}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>

            {!voltaCompleta && (
              <button
                onClick={onReiniciar}
                className="mt-4 flex items-center gap-1.5 text-xs text-mut transition-colors hover:text-dim"
              >
                <RotateCcw className="size-3.5" /> Zerar a volta atual (recomeçar do início)
              </button>
            )}
          </div>
        </>
      )}

      <AdicionarMateriaModal
        open={modalAdd}
        onClose={() => setModalAdd(false)}
        concursoId={concurso.id}
        materias={materias ?? []}
        vinculos={vinculosConcurso}
        jaNoCiclo={jaNoCiclo}
        proximaOrdem={meusItens.reduce((m, i) => Math.max(m, i.ordem), -1) + 1}
      />
    </div>
  );
}
