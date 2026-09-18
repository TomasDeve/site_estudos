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
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
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
  ChevronRight,
  ExternalLink,
  GripVertical,
  Headphones,
  Pencil,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import type { Audio, AudioGrupo } from "@/types/db";
import { useAtualizarAudio, useAudios, useReordenarAudios, useSalvarPosicaoAudio } from "@/api/audios";
import { useAudioGrupos, useSalvarOrdemGrupos, useToggleGrupoAberto } from "@/api/audioGrupos";
import { useMaterias } from "@/api/materias";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FullScreenSpinner } from "@/components/Spinner";
import { AudioFormModal } from "./AudioFormModal";
import { PlayerAudio } from "./PlayerAudio";
import { parseYoutube, thumbUrl } from "./youtube";

interface GrupoView {
  key: string; // materia_id ou "sem"
  materiaId: string | null;
  nome: string;
  icone: string;
  audios: Audio[];
  aberto: boolean;
}

export function AudiosPage() {
  const { data: audios, isLoading, isError, error } = useAudios();
  const { data: materias } = useMaterias();
  const { data: grupos } = useAudioGrupos();
  const atualizar = useAtualizarAudio();
  const reordenar = useReordenarAudios();
  const salvarPosicao = useSalvarPosicaoAudio();
  const salvarOrdemGrupos = useSalvarOrdemGrupos();
  const toggleGrupo = useToggleGrupoAberto();

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Audio | null>(null);
  // Áudio escolhido "à mão"; quando null, a tela deriva sozinha o próximo não ouvido.
  const [override, setOverride] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const materiasById = useMemo(
    () => new Map((materias ?? []).map((m) => [m.id, m])),
    [materias]
  );
  const grupoRowByKey = useMemo(() => {
    const map = new Map<string, AudioGrupo>();
    for (const g of grupos ?? []) map.set(g.materia_id ?? "sem", g);
    return map;
  }, [grupos]);

  const gruposView = useMemo<GrupoView[]>(() => {
    const porGrupo = new Map<string, Audio[]>();
    for (const a of audios ?? []) {
      const k = a.materia_id ?? "sem";
      const arr = porGrupo.get(k) ?? [];
      arr.push(a);
      porGrupo.set(k, arr);
    }
    const views: GrupoView[] = [];
    for (const [k, arr] of porGrupo) {
      arr.sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at));
      const mat = k === "sem" ? null : materiasById.get(k) ?? null;
      views.push({
        key: k,
        materiaId: k === "sem" ? null : k,
        nome: mat ? mat.nome : "Sem matéria",
        icone: mat ? mat.icone : "🎧",
        audios: arr,
        aberto: grupoRowByKey.get(k)?.aberto ?? true,
      });
    }
    views.sort((a, b) => {
      const oa = grupoRowByKey.get(a.key)?.ordem ?? 9999;
      const ob = grupoRowByKey.get(b.key)?.ordem ?? 9999;
      return oa - ob || a.nome.localeCompare(b.nome);
    });
    return views;
  }, [audios, materiasById, grupoRowByKey]);

  // Ordem "de leitura" da rotação: segue as seções e, dentro delas, a ordem da fila.
  const flat = useMemo(() => gruposView.flatMap((g) => g.audios), [gruposView]);

  const total = flat.length;
  const ouvidos = flat.filter((a) => a.ouvido).length;
  const rotacaoCompleta = total > 0 && ouvidos === total;

  const derivado = flat.find((a) => !a.ouvido) ?? flat[0] ?? null;
  const atual = (override && flat.find((a) => a.id === override)) || derivado;
  const ytr = atual ? parseYoutube(atual.url) : null;

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }
  function abrirEdicao(a: Audio) {
    setEditando(a);
    setModalAberto(true);
  }

  /** Próximo não ouvido depois de `id`, na ordem de leitura (dá a volta). */
  function proximoNaoOuvido(id: string): Audio | null {
    const i = flat.findIndex((a) => a.id === id);
    if (i < 0) return flat.find((a) => !a.ouvido) ?? null;
    for (let k = 1; k <= total; k++) {
      const cand = flat[(i + k) % total];
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
    const i = flat.findIndex((a) => a.id === atual.id);
    setOverride(flat[(i + 1) % total].id);
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
        flat
          .filter((a) => a.ouvido || a.posicao_seg > 0)
          .map((a) =>
            atualizar.mutateAsync({ id: a.id, ouvido: false, ouvido_em: null, posicao_seg: 0 })
          )
      );
      setOverride(flat[0]?.id ?? null);
      toast.success("Rotação reiniciada — bora de novo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;

    // Arrastando uma SEÇÃO (matéria).
    if (activeId.startsWith("grp:")) {
      if (!overId.startsWith("grp:")) return;
      const de = gruposView.findIndex((g) => `grp:${g.key}` === activeId);
      const para = gruposView.findIndex((g) => `grp:${g.key}` === overId);
      if (de < 0 || para < 0) return;
      const nova = arrayMove(gruposView, de, para);
      salvarOrdemGrupos.mutate(nova.map((g, i) => ({ materiaId: g.materiaId, ordem: i })));
      return;
    }

    // Arrastando um ÁUDIO dentro de uma seção (só reordena no mesmo grupo).
    const grupo = gruposView.find((g) => g.audios.some((a) => a.id === activeId));
    if (!grupo || !grupo.audios.some((a) => a.id === overId)) return;
    const de = grupo.audios.findIndex((a) => a.id === activeId);
    const para = grupo.audios.findIndex((a) => a.id === overId);
    reordenar.mutate(arrayMove(grupo.audios, de, para));
  }

  if (isLoading) return <FullScreenSpinner />;

  return (
    <div>
      <PageHeader
        title="Textos em áudio"
        subtitle="Suas leis narradas e aulas do YouTube, por matéria — ouça uma, marque e passe pra próxima"
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
            /audios|audio_grupos|relation|does not exist|column|schema cache/i.test(
              error instanceof Error ? error.message : String(error)
            )
              ? "Faltam tabelas/colunas no banco. Rode as migrations 0030 e 0031 no Supabase (SQL Editor) e recarregue."
              : error instanceof Error
                ? error.message
                : "Tente recarregar a página."
          }
        />
      ) : total === 0 ? (
        <EmptyState
          icon="🎧"
          title="Sua fila de áudios está vazia"
          message="Cole o link de um vídeo do YouTube (uma lei narrada, uma aula), escolha a matéria e vá empilhando. Você ouve um, marca como ouvido e o site pula pro próximo."
          action={
            <Button size="sm" onClick={abrirNovo}>
              <Headphones className="size-4" /> Adicionar o primeiro
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* ===== Tocando agora ===== */}
          {atual && ytr && (
            <div className="overflow-hidden rounded-card border border-line/60 bg-navy-800/80">
              <div className="flex items-center justify-between gap-3 border-b border-line/40 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold">
                  <Play className="size-3.5" /> {rotacaoCompleta ? "Revendo" : "Tocando agora"}
                </span>
                <span className="text-[11px] tabular-nums text-mut">
                  {ouvidos} de {total} ouvidos nesta rotação
                </span>
              </div>

              <PlayerAudio
                key={atual.id}
                audio={atual}
                ytRef={ytr}
                onSalvar={(p, d) =>
                  salvarPosicao.mutate({ id: atual.id, posicao_seg: p, duracao_seg: d })
                }
              />

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

          {atual && !ytr && (
            <div className="rounded-card border border-line/60 bg-navy-800/80 px-4 py-4 text-sm text-mut">
              O áudio atual tem um link que não reconheço como YouTube.{" "}
              <button onClick={() => abrirEdicao(atual)} className="text-gold hover:underline">
                Editar
              </button>
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

          {/* ===== Fila por matéria ===== */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-txt">
                Fila ({total} {total === 1 ? "áudio" : "áudios"})
              </h2>
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
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={gruposView.map((g) => `grp:${g.key}`)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {gruposView.map((g) => (
                    <GrupoSecao
                      key={g.key}
                      grupo={g}
                      tocandoId={atual?.id ?? null}
                      onToggle={() => toggleGrupo.mutate({ materiaId: g.materiaId, aberto: !g.aberto })}
                      onTocar={setOverride}
                      onEditar={abrirEdicao}
                      onAlternarOuvido={alternarOuvido}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      <AudioFormModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        audio={editando}
        audios={audios ?? []}
        materias={materias ?? []}
      />
    </div>
  );
}

interface GrupoSecaoProps {
  grupo: GrupoView;
  tocandoId: string | null;
  onToggle: () => void;
  onTocar: (id: string) => void;
  onEditar: (a: Audio) => void;
  onAlternarOuvido: (a: Audio) => void;
}

function GrupoSecao({ grupo, tocandoId, onToggle, onTocar, onEditar, onAlternarOuvido }: GrupoSecaoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `grp:${grupo.key}`,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const ouvidos = grupo.audios.filter((a) => a.ouvido).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-card border border-line/60 bg-navy-800/40 ${
        isDragging ? "z-10 shadow-2xl ring-1 ring-line" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 px-2 py-2">
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-navy-700/40"
          aria-expanded={grupo.aberto}
        >
          <ChevronRight
            className={`size-4 shrink-0 text-mut transition-transform ${grupo.aberto ? "rotate-90" : ""}`}
          />
          <span className="shrink-0 text-base">{grupo.icone}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-txt">{grupo.nome}</span>
          <span className="shrink-0 text-[11px] tabular-nums text-mut">
            {ouvidos}/{grupo.audios.length}
          </span>
        </button>
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-mut transition-colors hover:bg-navy-600 hover:text-dim active:cursor-grabbing"
          aria-label="Arrastar seção"
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      {grupo.aberto && (
        <div className="px-2 pb-2">
          <SortableContext
            items={grupo.audios.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1.5">
              {grupo.audios.map((a) => (
                <FilaItem
                  key={a.id}
                  audio={a}
                  tocando={tocandoId === a.id}
                  onTocar={() => onTocar(a.id)}
                  onEditar={() => onEditar(a)}
                  onAlternarOuvido={() => onAlternarOuvido(a)}
                />
              ))}
            </ul>
          </SortableContext>
        </div>
      )}
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
  const pct =
    audio.duracao_seg > 0 ? Math.min(100, (audio.posicao_seg / audio.duracao_seg) * 100) : 0;

  return (
    <li ref={setNodeRef} style={dragStyle} className={`group/audio ${isDragging ? "z-10" : ""}`}>
      <div
        className={`relative flex items-center gap-2 rounded-xl border px-2 pb-2.5 pt-2 transition-colors ${
          tocando
            ? "border-gold/50 bg-gold/5"
            : "border-line/60 bg-navy-800/60 hover:border-line hover:bg-navy-700/40"
        } ${isDragging ? "shadow-2xl ring-1 ring-line" : ""}`}
      >
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

        <button onClick={onTocar} className="relative shrink-0 overflow-hidden rounded-md" title="Tocar agora">
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
          <span className={`block truncate text-sm ${audio.ouvido ? "text-mut" : "font-medium text-txt"}`}>
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

        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-mut transition-colors hover:bg-navy-600 hover:text-dim active:cursor-grabbing"
          aria-label="Arrastar para reordenar"
        >
          <GripVertical className="size-4" />
        </button>

        {/* Onde parei neste áudio */}
        {audio.duracao_seg > 0 && (
          <div className="absolute inset-x-2 bottom-0.5 h-0.5 overflow-hidden rounded-full bg-navy-600">
            <div className="h-full rounded-full bg-gold/70" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}
