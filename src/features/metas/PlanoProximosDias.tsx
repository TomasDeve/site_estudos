import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CopyPlus,
  GripVertical,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Materia, PlanoHora } from "@/types/db";
import {
  tabelaFaltando,
  useCopiarDiaPlano,
  useLimparDiaPlano,
  useLimparHora,
  useMarcarHoraFeita,
  useMoverHora,
  usePlanoHoras,
  useReplicarHora,
  useSalvarHora,
  useTempoHora,
} from "@/api/planoHoras";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { fmtMinutos, hojeISO } from "@/lib/dates";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { MenuMais } from "@/components/MenuMais";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { CicloDasMaterias } from "./CicloDasMaterias";
import {
  ATIVIDADES,
  BLOCOS_INICIAIS,
  MAX_BLOCOS,
  atividadeDe,
  blocosQueDescem,
  blocosVisiveis,
  diasDoPlano,
  fmtTempo,
  lerMinutos,
  lerQuantosDias,
  minutosDe,
  ROTULO_BLOCO,
  rotuloDoDia,
  somarDias,
  tituloDoBloco,
  OPCOES_DIAS,
  type AtividadeChave,
  type QuantosDias,
} from "./planoDias";

/** Preferência de exibição (quantos dias aparecem): fica neste navegador. */
const CHAVE_QUANTOS = "plano.diasVisiveis";

function quantosSalvo(): QuantosDias {
  try {
    return lerQuantosDias(localStorage.getItem(CHAVE_QUANTOS));
  } catch {
    return lerQuantosDias(null);
  }
}

/** O bloco (de meia hora) que está sendo editado no modal. `hora` = posição no dia. */
interface Edicao {
  data: string;
  hora: number;
  linha?: PlanoHora;
}

/**
 * Plano dos próximos dias do calendário, 3 por linha — você escolhe ver 3, 6 ou
 * 9 dias (mora no Painel, dentro do card do Status do edital — por isso não traz
 * Card próprio).
 * Cada dia é uma coluna de blocos de meia hora (como linhas do Excel): começa
 * com 6 (3h) e dá para acrescentar até 16. Em cada bloco você escolhe a matéria
 * e a atividade e, depois, marca como feito. Embaixo da grade, o Ciclo das
 * matérias mostra quantas vezes cada matéria do edital já entrou no plano.
 */
export function PlanoProximosDias({ concursoId }: { concursoId: string }) {
  const hoje = hojeISO();
  const [inicio, setInicio] = useState(hoje);
  const [quantos, setQuantos] = useState<QuantosDias>(quantosSalvo);
  const dias = useMemo(() => diasDoPlano(inicio, quantos), [inicio, quantos]);

  function escolherQuantos(n: QuantosDias) {
    setQuantos(n);
    try {
      localStorage.setItem(CHAVE_QUANTOS, String(n));
    } catch {
      /* localStorage indisponível: vale só nesta visita */
    }
  }
  const fim = dias[dias.length - 1];

  const { data: linhas, isLoading, error } = usePlanoHoras(inicio, fim);
  const { data: materias } = useMaterias();
  const { data: vinculos } = useConcursoMaterias();
  const marcarFeita = useMarcarHoraFeita();
  const copiarDia = useCopiarDiaPlano();
  const limparDia = useLimparDiaPlano();
  const limparHora = useLimparHora();
  const salvarHora = useSalvarHora();
  const replicarHora = useReplicarHora();
  const tempoHora = useTempoHora();
  const moverHora = useMoverHora();

  // Arrastar blocos: mouse começa a arrastar depois de mexer 6px (um clique curto
  // continua abrindo o bloco); no toque, segurar um instante — assim rolar a
  // página por cima dos blocos não vira arraste.
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );
  const [arrastando, setArrastando] = useState<PlanoHora | null>(null);

  function aoComecarArrastar(e: DragStartEvent) {
    setArrastando((e.active.data.current?.linha as PlanoHora | undefined) ?? null);
  }

  /** Soltou numa linha: livre → o bloco vai pra lá; ocupada → os dois trocam. */
  function aoSoltar(e: DragEndEvent) {
    setArrastando(null);
    const origem = e.active.data.current?.linha as PlanoHora | undefined;
    const destino = e.over?.data.current as { data: string; hora: number } | undefined;
    if (!origem || !destino) return;
    if (origem.data === destino.data && origem.hora === destino.hora) return;
    moverHora.mutate(
      { origem: { data: origem.data, hora: origem.hora }, destino },
      { onError: erro }
    );
  }

  const [editando, setEditando] = useState<Edicao | null>(null);
  // Blocos acrescentados além dos 6 iniciais, por dia. Não vai pro banco: bloco
  // vazio não tem linha, então some ao recarregar — o preenchido fica.
  const [extras, setExtras] = useState<Record<string, number>>({});
  // Atividade do último bloco salvo: vira o padrão do próximo bloco vazio.
  const [ultimaAtividade, setUltimaAtividade] = useState<AtividadeChave>("teoria");

  // Matérias do concurso em estudo, na ordem do edital, sem as riscadas.
  const materiasDoConcurso = useMemo(() => {
    const meus = (vinculos ?? [])
      .filter((v) => v.concurso_id === concursoId && !v.riscada)
      .sort((a, b) => a.ordem - b.ordem);
    const porId = new Map((materias ?? []).map((m) => [m.id, m]));
    return meus.map((v) => porId.get(v.materia_id)).filter((m): m is Materia => !!m);
  }, [vinculos, materias, concursoId]);
  const materiaPorId = useMemo(() => new Map((materias ?? []).map((m) => [m.id, m])), [materias]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Map<number, PlanoHora>>();
    for (const l of linhas ?? []) {
      if (!mapa.has(l.data)) mapa.set(l.data, new Map());
      mapa.get(l.data)!.set(l.hora, l);
    }
    return mapa;
  }, [linhas]);

  // Totais em minutos: cada bloco conta o tempo dele (30 por padrão).
  const planejadas = (linhas ?? []).reduce((s, l) => s + minutosDe(l), 0);
  const feitas = (linhas ?? []).filter((l) => l.feita).reduce((s, l) => s + minutosDe(l), 0);
  const ehJanelaDeHoje = inicio === hoje;
  const titulo = ehJanelaDeHoje
    ? `Próximos ${quantos} dias`
    : `${rotuloDoDia(inicio, hoje).data} a ${rotuloDoDia(fim, hoje).data}`;

  function erro(err: unknown) {
    // Bloco além do 5º antes de rodar a 0034: o CHECK antigo (1 a 5) recusa.
    const e = err as { code?: string; message?: string } | null;
    // Tempo do bloco antes de rodar a 0035: a coluna `minutos` ainda não existe.
    if (e?.message?.includes("minutos")) {
      toast.error(
        "Falta rodar a migração 0035 (tempo de cada bloco) no Supabase → SQL Editor.",
        { duration: 8000 }
      );
      return;
    }
    if (e?.message?.includes("plano_horas_atividade_check")) {
      toast.error(
        "Falta rodar a migração 0036 (texto livre) no Supabase → SQL Editor.",
        { duration: 8000 }
      );
      return;
    }
    if (e?.code === "23514" || e?.message?.includes("plano_horas_hora_check")) {
      toast.error(
        "Falta rodar a migração 0034 (blocos de meia hora) no Supabase → SQL Editor.",
        { duration: 8000 }
      );
      return;
    }
    toast.error(err instanceof Error ? err.message : String(err));
  }

  /** Apaga o bloco direto da grade; o aviso traz "Desfazer" (volta como estava). */
  function apagar(l: PlanoHora) {
    limparHora.mutate(
      { data: l.data, hora: l.hora },
      {
        onError: erro,
        onSuccess: () =>
          toast("Bloco apagado", {
            action: {
              label: "Desfazer",
              onClick: () =>
                salvarHora.mutate(
                  {
                    data: l.data,
                    hora: l.hora,
                    materia_id: l.materia_id,
                    atividade: l.atividade,
                    nota: l.nota,
                    feita: l.feita,
                    ...(l.minutos != null ? { minutos: l.minutos } : {}),
                  },
                  { onError: erro }
                ),
            },
          }),
      }
    );
  }

  async function copiarDoAnterior(data: string) {
    try {
      const n = await copiarDia.mutateAsync({ de: somarDias(data, -1), para: data });
      if (n === 0) toast.info("O dia anterior não tinha nada planejado.");
      else toast.success(`${n === 1 ? "1 bloco copiado" : `${n} blocos copiados`} do dia anterior.`);
    } catch (err) {
      erro(err);
    }
  }

  return (
    <div className="space-y-4">
        {/* Cabeçalho: título, resumo das horas, quantos dias mostrar e navegação */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-txt">{titulo}</h2>
            <p className="mt-0.5 text-xs text-mut">
              {planejadas === 0 ? (
                "Blocos de 30 min — toque num bloco para escolher o que fazer nele."
              ) : (
                <>
                  <strong className="text-dim">{fmtTempo(planejadas)}</strong> planejadas ·{" "}
                  <strong className="text-green">{fmtTempo(feitas)}</strong> feitas
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Quantos dias mostrar: 3 (uma linha), 6 ou 9 */}
            <div
              className="inline-flex shrink-0 rounded-xl border border-line/60 bg-navy-900/60 p-0.5"
              role="group"
              aria-label="Quantos dias mostrar"
            >
              {OPCOES_DIAS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => escolherQuantos(n)}
                  aria-pressed={quantos === n}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    quantos === n ? "bg-gold text-navy-950 shadow-sm" : "text-dim hover:text-txt"
                  }`}
                >
                  {n} dias
                </button>
              ))}
            </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setInicio(somarDias(inicio, -quantos))}
              className="cursor-pointer rounded-lg p-1.5 text-dim hover:bg-navy-700 hover:text-txt"
              aria-label={`${quantos} dias anteriores`}
              title={`${quantos} dias anteriores`}
            >
              <ChevronLeft className="size-4" />
            </button>
            {!ehJanelaDeHoje && (
              <button
                onClick={() => setInicio(hoje)}
                className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold hover:bg-navy-700"
              >
                Hoje
              </button>
            )}
            <button
              onClick={() => setInicio(somarDias(inicio, quantos))}
              className="cursor-pointer rounded-lg p-1.5 text-dim hover:bg-navy-700 hover:text-txt"
              aria-label={`Próximos ${quantos} dias`}
              title={`Próximos ${quantos} dias`}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          </div>
        </div>

        {error && tabelaFaltando(error) ? (
          <div className="rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4 text-xs leading-relaxed text-dim">
            <p className="font-semibold text-gold">Falta criar a tabela do plano no banco.</p>
            <p className="mt-1">
              Abra o Supabase → <strong className="text-txt">SQL Editor</strong>, cole o conteúdo de{" "}
              <code className="rounded bg-navy-900 px-1 py-0.5 text-txt">
                supabase/migrations/0033_plano_horas.sql
              </code>{" "}
              e clique em <strong className="text-txt">Run</strong>. Depois recarregue a página.
            </p>
          </div>
        ) : error ? (
          <p className="text-xs text-red">
            Não deu para carregar o plano: {error instanceof Error ? error.message : String(error)}
          </p>
        ) : isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-5" />
          </div>
        ) : (
          <>
            <DndContext
              sensors={sensores}
              // Cai na linha que está debaixo do ponteiro/dedo (não na que a prévia cobre mais).
              collisionDetection={pointerWithin}
              onDragStart={aoComecarArrastar}
              onDragEnd={aoSoltar}
              onDragCancel={() => setArrastando(null)}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {dias.map((d) => (
                  <CaixaDia
                    key={d}
                    data={d}
                    hoje={hoje}
                    horas={porDia.get(d)}
                    extras={extras[d] ?? 0}
                    onExtras={(n) => setExtras((x) => ({ ...x, [d]: n }))}
                    materiaPorId={materiaPorId}
                    onEditar={(hora, linha) => setEditando({ data: d, hora, linha })}
                    onFeita={(l) =>
                      marcarFeita.mutate(
                        { data: l.data, hora: l.hora, feita: !l.feita },
                        { onError: erro }
                      )
                    }
                    onApagar={apagar}
                    onTempo={(l, minutos) =>
                      tempoHora.mutate({ data: l.data, hora: l.hora, minutos }, { onError: erro })
                    }
                    onReplicar={(l) => replicarHora.mutate(l, { onError: erro })}
                    onCopiarAnterior={() => void copiarDoAnterior(d)}
                    onLimparDia={() => limparDia.mutate(d, { onError: erro })}
                  />
                ))}
              </div>
              {/* O bloco "na mão" enquanto arrasta */}
              <DragOverlay dropAnimation={null}>
                {arrastando && (
                  <BlocoNaMao
                    linha={arrastando}
                    materia={
                      arrastando.materia_id ? materiaPorId.get(arrastando.materia_id) : undefined
                    }
                  />
                )}
              </DragOverlay>
            </DndContext>

            {/* O ciclo das matérias: o que já entrou no plano, na ordem do edital */}
            <CicloDasMaterias materias={materiasDoConcurso} />
          </>
        )}

      {editando && (
        <EditarHoraModal
          key={`${editando.data}-${editando.hora}`}
          edicao={editando}
          hoje={hoje}
          materias={materiasDoConcurso}
          atividadePadrao={ultimaAtividade}
          onSalvo={setUltimaAtividade}
          onErro={erro}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function CaixaDia({
  data,
  hoje,
  horas,
  extras,
  onExtras,
  materiaPorId,
  onEditar,
  onFeita,
  onApagar,
  onReplicar,
  onTempo,
  onCopiarAnterior,
  onLimparDia,
}: {
  data: string;
  hoje: string;
  horas: Map<number, PlanoHora> | undefined;
  /** Blocos acrescentados além dos 6 iniciais. */
  extras: number;
  onExtras: (n: number) => void;
  materiaPorId: Map<string, Materia>;
  onEditar: (hora: number, linha?: PlanoHora) => void;
  onFeita: (linha: PlanoHora) => void;
  onApagar: (linha: PlanoHora) => void;
  onReplicar: (linha: PlanoHora) => void;
  onTempo: (linha: PlanoHora, minutos: number) => void;
  onCopiarAnterior: () => void;
  onLimparDia: () => void;
}) {
  const { nome, data: dataCurta } = rotuloDoDia(data, hoje);
  const ehHoje = data === hoje;
  const passado = data < hoje;
  const preenchidas = horas?.size ?? 0;
  const blocos = [...(horas?.values() ?? [])];
  const completo = preenchidas > 0 && blocos.every((l) => l.feita);
  const minPlanejados = blocos.reduce((s, l) => s + minutosDe(l), 0);
  const minFeitos = blocos.filter((l) => l.feita).reduce((s, l) => s + minutosDe(l), 0);
  const maiorPreenchido = Math.max(0, ...(horas?.keys() ?? []));
  const visiveis = blocosVisiveis(extras, maiorPreenchido);
  // Só dá para tirar bloco vazio do fim, e nunca abaixo dos 6 iniciais.
  const podeTirar = visiveis > BLOCOS_INICIAIS && visiveis > maiorPreenchido;

  return (
    <div
      className={`flex flex-col overflow-visible rounded-xl border bg-navy-900/50 ${
        ehHoje ? "border-gold/60 shadow-[0_0_0_1px_rgb(224_168_62/0.15)]" : "border-line/60"
      } ${passado ? "opacity-80" : ""}`}
    >
      {/* Cabeçalho do dia */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-bold ${ehHoje ? "text-gold" : "text-txt"}`}>
            {nome} <span className="text-xs font-medium text-mut">{dataCurta}</span>
          </p>
        </div>
        {preenchidas > 0 && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
              completo ? "bg-green/15 text-green" : "bg-navy-700 text-dim"
            }`}
            title={`${fmtTempo(minFeitos)} feitas de ${fmtTempo(minPlanejados)} planejadas`}
          >
            {fmtTempo(minFeitos)}/{fmtTempo(minPlanejados)}
          </span>
        )}
        <MenuMais
          aria={`Ações de ${nome}`}
          itens={[
            {
              icone: <Copy className="size-3.5" />,
              label: "Copiar do dia anterior",
              onClick: onCopiarAnterior,
            },
            ...(preenchidas > 0
              ? [
                  {
                    icone: <Trash2 className="size-3.5" />,
                    label: "Limpar o dia",
                    onClick: onLimparDia,
                    danger: true,
                  },
                ]
              : []),
          ]}
        />
      </div>

      {/* Os blocos de meia hora do dia, como linhas de planilha. A 1ª coluna
          traz a duração de cada um (30min), igual em todas as linhas. */}
      <ol className="border-t border-line/50">
        {Array.from({ length: visiveis }, (_, i) => i + 1).map((h) => {
          const l = horas?.get(h);
          return (
            <Celula key={h} data={data} hora={h} feita={!!l?.feita}>
              {/* 1ª coluna: o tempo do bloco. Preenchido → clica e digita o tempo real. */}
              {l ? (
                <TempoDoBloco minutos={minutosDe(l)} onSalvar={(m) => onTempo(l, m)} />
              ) : (
                <span className="flex w-12 shrink-0 items-center justify-center border-r border-line/30 text-[10px] font-semibold tabular-nums text-mut">
                  {ROTULO_BLOCO}
                </span>
              )}
              {l ? (
                <LinhaPreenchida
                  linha={l}
                  materia={l.materia_id ? materiaPorId.get(l.materia_id) : undefined}
                  onEditar={() => onEditar(h, l)}
                  onFeita={() => onFeita(l)}
                  onApagar={() => onApagar(l)}
                  onReplicar={() => onReplicar(l)}
                  podeReplicar={blocosQueDescem([...(horas?.keys() ?? [])], h) !== null}
                />
              ) : (
                <button
                  onClick={() => onEditar(h)}
                  className="group flex flex-1 cursor-pointer items-center gap-1.5 px-2.5 text-left text-xs text-mut/70 transition-colors hover:bg-navy-700/40 hover:text-dim"
                  aria-label={`Escolher o que fazer no ${h}º bloco de ${nome}`}
                >
                  <Plus className="size-3.5 opacity-60 group-hover:opacity-100" />
                  livre
                </button>
              )}
            </Celula>
          );
        })}
      </ol>

      {/* Acrescentar/tirar blocos de meia hora */}
      <div className="mt-auto flex items-center">
        <button
          onClick={() => onExtras(visiveis + 1 - BLOCOS_INICIAIS)}
          disabled={visiveis >= MAX_BLOCOS}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-dim transition-colors hover:bg-navy-700/40 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-dim"
          title={visiveis >= MAX_BLOCOS ? "Máximo de 16 blocos (8h) por dia" : undefined}
        >
          <Plus className="size-3.5" /> Bloco de 30 min
        </button>
        {podeTirar && (
          <button
            onClick={() => onExtras(visiveis - 1 - BLOCOS_INICIAIS)}
            className="flex cursor-pointer items-center gap-1 border-l border-line/30 px-3 py-2 text-[11px] font-semibold text-mut transition-colors hover:bg-navy-700/40 hover:text-red"
            aria-label="Tirar o último bloco vazio"
            title="Tirar o último bloco vazio"
          >
            <Minus className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Tempo do bloco na 1ª coluna: clica, digita ("45", "20min", "1h", "1h30") e
 * Enter ou clicar fora salva; Esc cancela. É esse tempo que soma no gráfico.
 */
function TempoDoBloco({ minutos, onSalvar }: { minutos: number; onSalvar: (m: number) => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const invalido = editando && valor.trim() !== "" && lerMinutos(valor) === null;

  function fechar(salvarValor: boolean) {
    const m = lerMinutos(valor);
    if (salvarValor && m !== null && m !== minutos) onSalvar(m);
    setEditando(false);
  }

  if (!editando) {
    return (
      <button
        onClick={() => {
          setValor(String(minutos));
          setEditando(true);
        }}
        className="flex w-12 shrink-0 cursor-pointer items-center justify-center border-r border-line/30 text-[10px] font-semibold tabular-nums text-dim transition-colors hover:bg-navy-700/40 hover:text-gold"
        title="Clique para mudar o tempo deste bloco (ex.: 45, 20min, 1h)"
        aria-label={`Tempo do bloco: ${fmtMinutos(minutos)}. Clique para mudar`}
      >
        <span className="underline decoration-dotted decoration-1 underline-offset-2">
          {fmtMinutos(minutos)}
        </span>
      </button>
    );
  }

  return (
    <span className="flex w-12 shrink-0 items-center border-r border-line/30 px-0.5">
      <input
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter") fechar(true);
          if (e.key === "Escape") fechar(false);
        }}
        onBlur={() => fechar(true)}
        aria-label="Tempo deste bloco (minutos, ou 1h30)"
        title="Minutos (45) ou horas (1h, 1h30). Enter salva, Esc cancela"
        className={`w-full rounded border bg-navy-950 px-0.5 py-1 text-center text-[11px] font-semibold tabular-nums text-txt outline-none ${
          invalido ? "border-red" : "border-gold/60"
        }`}
      />
    </span>
  );
}

/** Uma linha do dia: também é onde se solta um bloco arrastado (acende em dourado). */
function Celula({
  data,
  hora,
  feita,
  children,
}: {
  data: string;
  hora: number;
  feita: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `s:${data}|${hora}`, data: { data, hora } });
  return (
    <li
      ref={setNodeRef}
      className={`group flex min-h-11 items-stretch border-b border-line/30 transition-colors ${
        isOver
          ? "bg-gold/10 shadow-[inset_0_0_0_1px_rgb(224_168_62/0.7)]"
          : feita
            ? "bg-green/8"
            : ""
      }`}
    >
      {children}
    </li>
  );
}

/** Prévia do bloco que acompanha o cursor/dedo durante o arraste. */
function BlocoNaMao({ linha: l, materia }: { linha: PlanoHora; materia: Materia | undefined }) {
  const at = atividadeDe(l.atividade);
  const livre = l.atividade === "livre";
  return (
    <div className="flex w-60 cursor-grabbing items-stretch gap-2 rounded-lg border border-gold/50 bg-navy-800 px-2.5 py-2 shadow-2xl shadow-navy-950/70">
      <span className={`w-1 rounded-full ${at.barra}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-txt">
          <span className="text-sm leading-none">{livre ? at.icone : (materia?.icone ?? at.icone)}</span>
          <span className="truncate">{tituloDoBloco(l, materia)}</span>
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${at.texto}`}>
          {at.label} · {fmtMinutos(minutosDe(l))}
        </span>
      </span>
    </div>
  );
}

function LinhaPreenchida({
  linha: l,
  materia,
  onEditar,
  onFeita,
  onApagar,
  onReplicar,
  podeReplicar,
}: {
  linha: PlanoHora;
  materia: Materia | undefined;
  onEditar: () => void;
  onFeita: () => void;
  onApagar: () => void;
  onReplicar: () => void;
  /** Falso quando o dia já está cheio (16 blocos) até embaixo. */
  podeReplicar: boolean;
}) {
  const at = atividadeDe(l.atividade);
  const livre = l.atividade === "livre";
  const principal = tituloDoBloco(l, livre ? undefined : materia);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `b:${l.data}|${l.hora}`,
    data: { linha: l },
  });
  return (
    <>
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={onEditar}
        className={`flex min-w-0 flex-1 cursor-grab touch-manipulation items-center gap-2 py-1.5 pl-1 pr-1 text-left transition-colors hover:bg-navy-700/40 active:cursor-grabbing ${
          isDragging ? "opacity-30" : ""
        }`}
        title={`${[materia?.nome, at.label, l.nota].filter(Boolean).join(" · ")} — clique para editar, arraste para mover`}
      >
        <GripVertical
          className="size-3 shrink-0 text-mut opacity-0 transition-opacity group-hover:opacity-70 max-md:opacity-40"
          aria-hidden
        />
        <span className={`w-1 self-stretch rounded-full ${at.barra}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              l.feita ? "text-mut line-through" : "text-txt"
            }`}
          >
            <span className="shrink-0 text-sm leading-none">
              {livre ? at.icone : (materia?.icone ?? at.icone)}
            </span>
            <span className="truncate">{principal}</span>
          </span>
          {/* Com matéria, a atividade vai na 2ª linha; sem matéria ela já é o título.
              Texto livre: o próprio texto é o título, sem 2ª linha. */}
          {!livre && (materia || l.nota) && (
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px]">
              {materia && (
                <span className={`shrink-0 font-bold uppercase tracking-wide ${at.texto}`}>
                  {at.label}
                </span>
              )}
              {l.nota && (
                <span className="truncate text-mut">
                  {materia ? "· " : ""}
                  {l.nota}
                </span>
              )}
            </span>
          )}
        </span>
      </button>
      {/* Ações rápidas, sem abrir o bloco: discretas, acendem ao passar o mouse */}
      <span className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100">
        <button
          onClick={onReplicar}
          disabled={!podeReplicar}
          className="cursor-pointer rounded-md p-1.5 text-mut transition-colors hover:bg-navy-600 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-mut"
          aria-label="Replicar este bloco abaixo"
          title={podeReplicar ? "Replicar abaixo" : "Dia cheio (16 blocos)"}
        >
          <CopyPlus className="size-3.5" />
        </button>
        <button
          onClick={onApagar}
          className="cursor-pointer rounded-md p-1.5 text-mut transition-colors hover:bg-red/10 hover:text-red"
          aria-label="Apagar este bloco"
          title="Apagar bloco"
        >
          <Trash2 className="size-3.5" />
        </button>
      </span>
      <button
        onClick={onFeita}
        className="flex w-10 shrink-0 cursor-pointer items-center justify-center"
        aria-label={l.feita ? "Desmarcar bloco feito" : "Marcar bloco como feito"}
        title={
          l.feita
            ? "Desmarcar (tira os 30 min do tempo de estudo)"
            : "Marcar como feito (soma 30 min no tempo de estudo)"
        }
      >
        <span
          className={`flex size-5 items-center justify-center rounded-full border-2 transition-all ${
            l.feita
              ? "border-green bg-green text-navy-950"
              : "border-mut hover:scale-110 hover:border-gold"
          }`}
        >
          {l.feita && <Check className="size-3" strokeWidth={3} />}
        </span>
      </button>
    </>
  );
}

function EditarHoraModal({
  edicao,
  hoje,
  materias,
  atividadePadrao,
  onSalvo,
  onErro,
  onClose,
}: {
  edicao: Edicao;
  hoje: string;
  materias: Materia[];
  atividadePadrao: AtividadeChave;
  onSalvo: (atividade: AtividadeChave) => void;
  onErro: (err: unknown) => void;
  onClose: () => void;
}) {
  const { data, hora, linha } = edicao;
  const salvar = useSalvarHora();
  const limpar = useLimparHora();
  const [atividade, setAtividade] = useState<AtividadeChave>(
    (linha?.atividade as AtividadeChave | undefined) ?? atividadePadrao
  );
  const [materiaId, setMateriaId] = useState<string | null>(linha?.materia_id ?? null);
  const [nota, setNota] = useState(linha?.nota ?? "");
  const { nome, data: dataCurta } = rotuloDoDia(data, hoje);
  // Texto livre: sem matéria; o texto (obrigatório) é o que vai fazer.
  const livre = atividade === "livre";
  const podeSalvar = !livre || nota.trim() !== "";

  function onSalvar() {
    if (!podeSalvar) return;
    salvar.mutate(
      {
        data,
        hora,
        atividade,
        materia_id: livre ? null : materiaId,
        nota: nota.trim(),
      },
      { onError: onErro }
    );
    onSalvo(atividade);
    onClose();
  }

  function onLimpar() {
    limpar.mutate({ data, hora }, { onError: onErro });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <>
          {nome} <span className="font-normal text-mut">{dataCurta}</span> · {hora}º bloco{" "}
          <span className="font-normal text-mut">
            ({linha ? fmtMinutos(minutosDe(linha)) : ROTULO_BLOCO})
          </span>
        </>
      }
      footer={
        <div className="flex w-full items-center gap-2">
          {linha && (
            <button
              type="button"
              onClick={onLimpar}
              className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm text-red transition-colors hover:bg-red/10"
            >
              <Trash2 className="size-3.5" /> Liberar bloco
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={onSalvar} disabled={!podeSalvar}>
              Salvar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mut">
            Atividade
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {ATIVIDADES.map((a) => {
              const ativo = atividade === a.chave;
              return (
                <button
                  key={a.chave}
                  type="button"
                  onClick={() => setAtividade(a.chave)}
                  aria-pressed={ativo}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    ativo
                      ? `border-current ${a.fundo} ${a.texto}`
                      : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
                  }`}
                >
                  <span className="leading-none">{a.icone}</span>
                  {a.label}
                </button>
              );
            })}
          </div>
        </section>

        {livre ? (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mut">
              O que vai fazer?
            </h3>
            <Input
              autoFocus
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSalvar();
              }}
              placeholder="Ex.: Revisão dos PDFs"
              maxLength={120}
            />
            <p className="mt-2 text-[11px] text-mut">
              Sem matéria — o texto vira o título do bloco. Feito, conta tempo de estudo normal.
            </p>
          </section>
        ) : (
          <>
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mut">
                Matéria
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {materias.map((m) => {
                  const ativo = materiaId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMateriaId(ativo ? null : m.id)}
                      aria-pressed={ativo}
                      className={`flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        ativo
                          ? "border-gold/50 bg-gold/15 text-gold"
                          : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
                      }`}
                    >
                      <span className="leading-none">{m.icone}</span>
                      <span className="truncate">{m.nome}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-mut">
                Opcional — sem matéria vale para tudo (ex.: Anki geral, simulado completo).
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mut">
                Detalhe (opcional)
              </h3>
              <Input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSalvar();
                }}
                placeholder="Ex.: crimes contra a pessoa, 30 questões"
                maxLength={120}
              />
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}
