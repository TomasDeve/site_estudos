import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  CheckCheck,
  ExternalLink,
  GripVertical,
  Headphones,
  Pencil,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import type { Audio } from "@/types/db";
import { useAtualizarAudio, useAudios, useReordenarAudios } from "@/api/audios";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FullScreenSpinner } from "@/components/Spinner";
import { AudioFormModal } from "./AudioFormModal";
import { embedUrl, parseYoutube, thumbUrl } from "./youtube";

export function AudiosPage() {
  const { data: audios, isLoading, isError, error } = useAudios();
  const atualizar = useAtualizarAudio();
  const reordenar = useReordenarAudios();

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Audio | null>(null);
  // Áudio escolhido "à mão" para tocar agora; quando null, a tela deriva sozinha
  // o próximo não ouvido (assim reabrir a página já retoma de onde parou).
  const [override, setOverride] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ordenados = useMemo(
    () => [...(audios ?? [])].sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)),
    [audios]
  );

  const total = ordenados.length;
  const ouvidos = ordenados.filter((a) => a.ouvido).length;
  const rotacaoCompleta = total > 0 && ouvidos === total;

  const derivado = ordenados.find((a) => !a.ouvido) ?? ordenados[0] ?? null;
  const atual = (override && ordenados.find((a) => a.id === override)) || derivado;
  const ref = atual ? parseYoutube(atual.url) : null;

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }
  function abrirEdicao(a: Audio) {
    setEditando(a);
    setModalAberto(true);
  }

  /** Próximo não ouvido depois de `id` (dá a volta na fila). Null se acabou. */
  function proximoNaoOuvido(id: string): Audio | null {
    const i = ordenados.findIndex((a) => a.id === id);
    if (i < 0) return ordenados.find((a) => !a.ouvido) ?? null;
    for (let k = 1; k <= total; k++) {
      const cand = ordenados[(i + k) % total];
      if (cand.id !== id && !cand.ouvido) return cand;
    }
    return null;
  }

  async function ouviProximo() {
    if (!atual) return;
    const prox = proximoNaoOuvido(atual.id);
    try {
      await atualizar.mutateAsync({
        id: atual.id,
        ouvido: true,
        ouvido_em: new Date().toISOString(),
        vezes: atual.vezes + 1,
      });
      setOverride(prox ? prox.id : null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function pular() {
    if (!atual || total < 2) return;
    const i = ordenados.findIndex((a) => a.id === atual.id);
    setOverride(ordenados[(i + 1) % total].id);
  }

  async function alternarOuvido(a: Audio) {
    const marcar = !a.ouvido;
    try {
      await atualizar.mutateAsync({
        id: a.id,
        ouvido: marcar,
        ouvido_em: marcar ? new Date().toISOString() : null,
        vezes: marcar ? a.vezes + 1 : a.vezes,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function recomecarRotacao() {
    try {
      await Promise.all(
        ordenados
          .filter((a) => a.ouvido)
          .map((a) => atualizar.mutateAsync({ id: a.id, ouvido: false, ouvido_em: null }))
      );
      setOverride(ordenados[0]?.id ?? null);
      toast.success("Rotação reiniciada — bora de novo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = ordenados.findIndex((a) => a.id === active.id);
    const para = ordenados.findIndex((a) => a.id === over.id);
    if (de < 0 || para < 0) return;
    reordenar.mutate(arrayMove(ordenados, de, para));
  }

  if (isLoading) return <FullScreenSpinner />;

  return (
    <div>
      <PageHeader
        title="Textos em áudio"
        subtitle="Sua fila de leis narradas e aulas do YouTube — ouça uma, marque e passe pra próxima"
        action={
          <Button size="sm" onClick={abrirNovo}>
            <Headphones className="size-4" /> Adicionar áudio
          </Button>
        }
      />

      {isError ? (
        <EmptyState
          icon="⚠️"
          title="Não consegui carregar os áudios"
          message={
            /audios|relation|does not exist|schema cache/i.test(
              error instanceof Error ? error.message : String(error)
            )
              ? "A tabela 'audios' ainda não existe no banco. Rode a migration 0030_audios.sql no Supabase (SQL Editor) e recarregue."
              : error instanceof Error
                ? error.message
                : "Tente recarregar a página."
          }
        />
      ) : total === 0 ? (
        <EmptyState
          icon="🎧"
          title="Sua fila de áudios está vazia"
          message="Cole o link de um vídeo do YouTube (uma lei narrada, uma aula) e vá empilhando. Você ouve um, marca como ouvido e o site já pula pro próximo."
          action={
            <Button size="sm" onClick={abrirNovo}>
              <Headphones className="size-4" /> Adicionar o primeiro
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* ===== Tocando agora ===== */}
          {atual && (
            <div className="overflow-hidden rounded-card border border-line/60 bg-navy-800/80">
              <div className="flex items-center justify-between gap-3 border-b border-line/40 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold">
                  <Play className="size-3.5" /> {rotacaoCompleta ? "Revendo" : "Tocando agora"}
                </span>
                <span className="text-[11px] tabular-nums text-mut">
                  {ouvidos} de {total} ouvidos nesta rotação
                </span>
              </div>

              {ref ? (
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    key={atual.id}
                    src={embedUrl(ref)}
                    title={atual.titulo || atual.url}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-mut">
                  Link não reconhecido como YouTube.{" "}
                  <button onClick={() => abrirEdicao(atual)} className="text-gold hover:underline">
                    Editar
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3 px-4 py-3">
                <p className="truncate text-sm font-semibold text-txt" title={atual.titulo || atual.url}>
                  {atual.titulo || atual.url}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={ouviProximo} loading={atualizar.isPending}>
                    <Check className="size-4" /> Ouvi — próximo
                  </Button>
                  {total > 1 && (
                    <Button size="sm" variant="secondary" onClick={pular}>
                      <SkipForward className="size-4" /> Pular
                    </Button>
                  )}
                  <a
                    href={atual.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-mut transition-colors hover:text-gold"
                  >
                    <ExternalLink className="size-3.5" /> Abrir no YouTube
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ===== Rotação concluída ===== */}
          {rotacaoCompleta && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-green/30 bg-green/10 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium text-txt">
                <CheckCheck className="size-4 text-green" /> Você ouviu todos os {total} áudios da fila.
              </span>
              <Button size="sm" variant="secondary" onClick={recomecarRotacao} loading={atualizar.isPending}>
                <RotateCcw className="size-4" /> Recomeçar rotação
              </Button>
            </div>
          )}

          {/* ===== Fila ===== */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-txt">Fila ({total})</h2>
              {ouvidos > 0 && !rotacaoCompleta && (
                <button
                  onClick={recomecarRotacao}
                  className="flex cursor-pointer items-center gap-1.5 text-[11px] text-mut transition-colors hover:text-gold"
                  title="Desmarca todos e recomeça a rotação do zero"
                >
                  <RotateCcw className="size-3.5" /> Recomeçar
                </button>
              )}
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={ordenados.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {ordenados.map((a) => (
                    <FilaItem
                      key={a.id}
                      audio={a}
                      tocando={atual?.id === a.id}
                      onTocar={() => setOverride(a.id)}
                      onEditar={() => abrirEdicao(a)}
                      onAlternarOuvido={() => alternarOuvido(a)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      <AudioFormModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        audio={editando}
        proximaOrdem={total}
      />
    </div>
  );
}

interface FilaItemProps {
  audio: Audio;
  tocando: boolean;
  onTocar: () => void;
  onEditar: () => void;
  onAlternarOuvido: () => void;
}

function FilaItem({ audio, tocando, onTocar, onEditar, onAlternarOuvido }: FilaItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: audio.id,
  });
  const dragStyle = { transform: CSS.Transform.toString(transform), transition };
  const thumb = thumbUrl(parseYoutube(audio.url) ?? { videoId: null, listId: null, start: null });

  return (
    <li
      ref={setNodeRef}
      style={dragStyle}
      className={`group/audio ${isDragging ? "z-10" : ""}`}
    >
      <div
        className={`flex items-center gap-2 rounded-xl border px-2 py-2 transition-colors ${
          tocando
            ? "border-gold/50 bg-gold/5"
            : "border-line/60 bg-navy-800/60 hover:border-line hover:bg-navy-700/40"
        } ${isDragging ? "shadow-2xl ring-1 ring-line" : ""}`}
      >
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-mut transition-colors hover:bg-navy-600 hover:text-dim active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="size-4" />
        </button>

        {/* Marcar/desmarcar ouvido */}
        <button
          onClick={onAlternarOuvido}
          className={`flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all hover:scale-110 ${
            audio.ouvido ? "border-green bg-green text-navy-950" : "border-line text-transparent"
          }`}
          title={audio.ouvido ? "Marcado como ouvido — clique para desmarcar" : "Marcar como ouvido"}
          aria-label={audio.ouvido ? "Desmarcar ouvido" : "Marcar como ouvido"}
        >
          <Check className="size-3" strokeWidth={3} />
        </button>

        {/* Miniatura → tocar agora */}
        <button
          onClick={onTocar}
          className="relative shrink-0 overflow-hidden rounded-md"
          title="Tocar agora"
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className={`h-9 w-16 object-cover transition-opacity ${audio.ouvido ? "opacity-50" : ""}`}
            />
          ) : (
            <span className="flex h-9 w-16 items-center justify-center bg-navy-900 text-mut">
              <Play className="size-4" />
            </span>
          )}
          {!tocando && (
            <span className="absolute inset-0 flex items-center justify-center bg-navy-950/40 opacity-0 transition-opacity group-hover/audio:opacity-100">
              <Play className="size-4 text-white" />
            </span>
          )}
        </button>

        <button onClick={onTocar} className="min-w-0 flex-1 cursor-pointer text-left">
          <span
            className={`block truncate text-sm ${
              audio.ouvido ? "text-mut" : "font-medium text-txt"
            }`}
          >
            {audio.titulo || audio.url}
          </span>
          <span className="flex items-center gap-2 text-[11px] text-mut">
            {tocando && <span className="font-semibold text-gold">tocando</span>}
            {audio.ouvido && <span className="text-green">ouvido</span>}
            {audio.vezes > 0 && <span>· {audio.vezes}x</span>}
          </span>
        </button>

        <button
          onClick={onEditar}
          className="shrink-0 cursor-pointer rounded-md p-1.5 text-mut opacity-0 transition-all hover:bg-navy-600 hover:text-gold group-hover/audio:opacity-100 max-md:opacity-100"
          title="Editar / excluir"
          aria-label="Editar"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
