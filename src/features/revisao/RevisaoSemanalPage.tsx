import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Repeat2,
  X,
} from "lucide-react";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Materia, RevisaoSemanalItem } from "@/types/db";
import { useItensRevisao, useResponderRevisao, useZerarRevisao } from "@/api/revisaoSemanal";
import { useMaterias } from "@/api/materias";
import { EmptyState } from "@/components/EmptyState";
import { FullScreenSpinner } from "@/components/Spinner";
import { MenuMais } from "@/components/MenuMais";
import { corDesempenho } from "@/features/conteudos/desempenho";

/**
 * Seção "Revisão semanal": revisão ATIVA do que foi visto na semana. O aluno manda no
 * chat as páginas dos cadernos (por matéria); o Claude acha onde ele errou ou ficou em
 * dúvida e cria premissas diretas de Certo/Errado. Aqui ele escolhe a matéria e responde
 * uma por vez; depois de responder aparece a explicação do caderno, a observação do
 * Claude e, se houver, uma imagem. Abre em aba própria.
 */
export function RevisaoSemanalPage() {
  const { semana, materiaId } = useParams();
  return semana && materiaId ? (
    <Sessao semana={semana} materiaId={materiaId} />
  ) : (
    <Lista />
  );
}

/** "2026-11-09" → "09/11 a 13/11" (segunda a sexta). */
function rotuloSemana(semana: string) {
  const ini = parseISO(semana);
  return `${format(ini, "dd/MM")} a ${format(addDays(ini, 4), "dd/MM")}`;
}

function placarDe(itens: RevisaoSemanalItem[]) {
  const respondidas = itens.filter((i) => i.resposta !== null);
  const acertos = respondidas.filter((i) => i.resposta === i.gabarito).length;
  return {
    total: itens.length,
    respondidas: respondidas.length,
    acertos,
    pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
  };
}

const MOTIVO: Record<string, { rotulo: string; classe: string }> = {
  erro: { rotulo: "Você errou no caderno", classe: "border-red/30 bg-red/10 text-red" },
  duvida: { rotulo: "Ficou em dúvida", classe: "border-amber/30 bg-amber/10 text-amber" },
  reforco: { rotulo: "Reforço", classe: "border-blue/30 bg-blue/10 text-blue" },
};

function Cabecalho({
  titulo,
  subtitulo,
  onVoltar,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onVoltar: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line/50 bg-navy-900/90 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
      <button
        onClick={onVoltar}
        className="shrink-0 cursor-pointer rounded-lg p-2 text-mut transition-colors hover:bg-navy-700 hover:text-txt sm:p-1.5"
        title="Voltar"
        aria-label="Voltar"
      >
        <ArrowLeft className="size-4" />
      </button>
      <Repeat2 className="size-4 shrink-0 text-gold max-sm:hidden" />
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold leading-snug text-txt sm:text-base">{titulo}</h1>
        {subtitulo && <p className="truncate text-[11px] text-mut">{subtitulo}</p>}
      </div>
      {children}
    </header>
  );
}

/** Texto do caderno/observação: uma linha por parágrafo, **negrito** e ==marca-texto==. */
function TextoRevisao({ texto }: { texto: string }) {
  const linhas = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed text-dim">
      {linhas.map((l, i) => (
        <p key={i} className={l.startsWith("•") ? "pl-3 -indent-3" : undefined}>
          {inline(l)}
        </p>
      ))}
    </div>
  );
}

function inline(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|==[^=]+==)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-txt">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (p.startsWith("==") && p.endsWith("==")) {
      return (
        <mark key={i} className="rounded bg-gold/25 px-0.5 font-semibold text-txt">
          {p.slice(2, -2)}
        </mark>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

/** A lista: a semana escolhida e as matérias dela, com o placar de cada uma. */
function Lista() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: itens, isLoading } = useItensRevisao();
  const { data: materias, isLoading: carregandoMaterias } = useMaterias();

  useEffect(() => {
    const anterior = document.title;
    document.title = "Revisão semanal";
    return () => {
      document.title = anterior;
    };
  }, []);

  const semanas = useMemo(
    () => [...new Set((itens ?? []).map((i) => i.semana))].sort().reverse(),
    [itens]
  );
  const semana = params.get("semana") ?? semanas[0];

  // Matérias da semana na ordem em que foram criadas (a ordem em que ele mandou).
  const grupos = useMemo(() => {
    const mapa = new Map<string, RevisaoSemanalItem[]>();
    const primeira = new Map<string, string>();
    for (const i of itens ?? []) {
      if (i.semana !== semana) continue;
      const l = mapa.get(i.materia_id) ?? [];
      l.push(i);
      mapa.set(i.materia_id, l);
      const p = primeira.get(i.materia_id);
      if (!p || i.created_at < p) primeira.set(i.materia_id, i.created_at);
    }
    return [...mapa.entries()].sort((a, b) =>
      (primeira.get(a[0]) ?? "").localeCompare(primeira.get(b[0]) ?? "")
    );
  }, [itens, semana]);

  if (isLoading || carregandoMaterias) return <FullScreenSpinner />;

  const materiaPorId = new Map((materias ?? []).map((m) => [m.id, m]));
  const daSemana = grupos.flatMap(([, l]) => l);
  const geral = placarDe(daSemana);

  function voltar() {
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho titulo="Revisão semanal" onVoltar={voltar} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 pb-24 pt-4 sm:px-6 sm:py-6">
        {!semanas.length ? (
          <EmptyState
            icon="🔁"
            title="Nenhuma revisão ainda"
            message="No fim da semana, mande no chat as páginas dos cadernos que você estudou, uma matéria por vez. O Claude acha onde você errou ou ficou em dúvida e cria aqui as premissas de Certo ou Errado."
          />
        ) : (
          <>
            {semanas.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {semanas.map((s) => (
                  <button
                    key={s}
                    onClick={() => setParams({ semana: s })}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors ${
                      s === semana
                        ? "border-gold/60 bg-gold/15 text-gold"
                        : "border-line/60 text-dim hover:border-line hover:text-txt"
                    }`}
                  >
                    {rotuloSemana(s)}
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-line/50 bg-navy-900/60 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                Semana de {rotuloSemana(semana)}
              </p>
              <p className="mt-1 text-xs text-dim">
                <strong className="tabular-nums text-txt">
                  {geral.respondidas}/{geral.total}
                </strong>{" "}
                premissas respondidas
                {geral.pct !== null && (
                  <span className={`ml-2 font-semibold tabular-nums ${corDesempenho(geral.pct).texto}`}>
                    {geral.acertos} {geral.acertos === 1 ? "acerto" : "acertos"} · {geral.pct}%
                  </span>
                )}
              </p>
            </div>

            <ul className="space-y-2.5">
              {grupos.map(([mId, lista]) => (
                <ItemMateria
                  key={mId}
                  semana={semana}
                  materiaId={mId}
                  materia={materiaPorId.get(mId)}
                  itens={lista}
                />
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  );
}

function ItemMateria({
  semana,
  materiaId,
  materia,
  itens,
}: {
  semana: string;
  materiaId: string;
  materia?: Materia;
  itens: RevisaoSemanalItem[];
}) {
  const p = placarDe(itens);
  const cor = p.pct !== null ? corDesempenho(p.pct) : null;
  const erros = itens.filter((i) => i.motivo === "erro").length;
  const duvidas = itens.filter((i) => i.motivo === "duvida").length;
  const terminou = p.respondidas === p.total;
  return (
    <li>
      <Link
        to={`/revisao-semanal/${semana}/${materiaId}`}
        className="flex items-center gap-3 rounded-xl border border-line/50 bg-navy-900/40 p-3.5 transition-colors hover:border-line hover:bg-navy-800/60"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-700/70 text-xl">
          {materia?.icone ?? "📘"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-txt">{materia?.nome ?? "Matéria"}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
            <span className="tabular-nums">
              {p.total} {p.total === 1 ? "premissa" : "premissas"}
            </span>
            <span className="tabular-nums">
              Respondidas{" "}
              <strong className="text-txt">
                {p.respondidas}/{p.total}
              </strong>
            </span>
            {p.pct !== null && cor && (
              <span className={`font-semibold tabular-nums ${cor.texto}`}>
                {p.acertos} {p.acertos === 1 ? "acerto" : "acertos"} · {p.pct}%
              </span>
            )}
          </p>
          {(erros > 0 || duvidas > 0) && (
            <p className="mt-1 text-[11px] text-mut">
              {[
                erros && `${erros} do que você errou`,
                duvidas && `${duvidas} do que ficou em dúvida`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        {terminou ? (
          <Check className="size-4 shrink-0 text-green" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-mut" />
        )}
      </Link>
    </li>
  );
}

/** Uma matéria aberta: as premissas uma por vez e, no fim, o placar. */
function Sessao({ semana, materiaId }: { semana: string; materiaId: string }) {
  const navigate = useNavigate();
  const { data: todos, isLoading } = useItensRevisao();
  const { data: materias, isLoading: carregandoMaterias } = useMaterias();
  const responder = useResponderRevisao();
  const zerar = useZerarRevisao();

  const itens = useMemo(
    () => (todos ?? []).filter((i) => i.semana === semana && i.materia_id === materiaId),
    [todos, semana, materiaId]
  );
  const materia = materias?.find((m) => m.id === materiaId);

  // Começa na primeira sem resposta; se já respondeu tudo, abre o placar.
  const [atual, setAtual] = useState<number | null>(null);
  useEffect(() => {
    if (atual !== null || !itens.length) return;
    const i = itens.findIndex((x) => x.resposta === null);
    setAtual(i === -1 ? itens.length : i);
  }, [itens, atual]);

  useEffect(() => {
    if (!materia) return;
    const anterior = document.title;
    document.title = `Revisão · ${materia.nome}`;
    return () => {
      document.title = anterior;
    };
  }, [materia]);

  const idx = atual ?? 0;
  const item = idx < itens.length ? itens[idx] : null;

  // Teclado no computador: C = Certo, E = Errado, ← → navegam.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (item && item.resposta === null && (e.key === "c" || e.key === "C")) responderItem(true);
      else if (item && item.resposta === null && (e.key === "e" || e.key === "E")) responderItem(false);
      else if (e.key === "ArrowRight") setAtual((a) => Math.min((a ?? 0) + 1, itens.length));
      else if (e.key === "ArrowLeft") setAtual((a) => Math.max((a ?? 0) - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (isLoading || carregandoMaterias) return <FullScreenSpinner />;

  const irParaLista = () => navigate(`/revisao-semanal?semana=${semana}`);
  const titulo = materia ? `${materia.icone} ${materia.nome}` : "Revisão semanal";
  const subtitulo = `Revisão da semana de ${rotuloSemana(semana)}`;

  if (!itens.length) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Cabecalho titulo={titulo} subtitulo={subtitulo} onVoltar={irParaLista} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-3 pt-4 sm:px-6 sm:py-6">
          <EmptyState
            icon="🔁"
            title="Nada para revisar aqui"
            message="Essa matéria não tem premissas nesta semana."
            action={
              <Link to="/revisao-semanal" className="text-sm font-semibold text-gold hover:underline">
                Ver a revisão semanal
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  function erro(err: unknown) {
    toast.error(err instanceof Error ? err.message : String(err));
  }

  function responderItem(valor: boolean) {
    if (!item) return;
    responder.mutate({ id: item.id, resposta: valor }, { onError: erro });
  }

  function refazer(ids: string[], msg: string) {
    zerar.mutate(ids, {
      onSuccess: () => toast.success(msg),
      onError: erro,
    });
    const primeiro = itens.findIndex((i) => ids.includes(i.id));
    setAtual(primeiro === -1 ? 0 : primeiro);
  }

  const placar = placarDe(itens);
  const erradas = itens.filter((i) => i.resposta !== null && i.resposta !== i.gabarito);

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho titulo={titulo} subtitulo={subtitulo} onVoltar={irParaLista}>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="text-xs tabular-nums text-dim">
            <strong className="text-txt">{placar.respondidas}</strong>/{placar.total}
          </span>
          <MenuMais
            itens={[
              {
                icone: <RotateCcw className="size-3.5" />,
                label: "Refazer as que errei",
                onClick: () =>
                  erradas.length
                    ? refazer(
                        erradas.map((i) => i.id),
                        "As que você errou estão prontas para refazer"
                      )
                    : toast("Você não errou nenhuma até aqui"),
              },
              {
                icone: <RotateCcw className="size-3.5" />,
                label: "Refazer tudo",
                onClick: () => {
                  if (!window.confirm(`Apagar as respostas das ${itens.length} premissas para refazer?`)) return;
                  refazer(
                    itens.map((i) => i.id),
                    "Respostas apagadas: pode refazer do começo"
                  );
                },
              },
            ]}
          />
        </div>
      </Cabecalho>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-3 pb-24 pt-4 sm:px-6 sm:py-6">
        {/* Uma bolinha por premissa: verde acertou, vermelha errou, cinza falta */}
        <div className="flex flex-wrap gap-1.5">
          {itens.map((i, n) => {
            const feita = i.resposta !== null;
            const certo = feita && i.resposta === i.gabarito;
            return (
              <button
                key={i.id}
                onClick={() => setAtual(n)}
                title={`Premissa ${n + 1}${feita ? (certo ? " · acertou" : " · errou") : ""}`}
                className={`flex size-7 cursor-pointer items-center justify-center rounded-full border text-[11px] font-bold tabular-nums transition-all ${
                  n === idx ? "ring-2 ring-gold/70 ring-offset-1 ring-offset-navy-950" : ""
                } ${
                  !feita
                    ? "border-line/60 bg-navy-800 text-dim hover:text-txt"
                    : certo
                      ? "border-green/40 bg-green/20 text-green"
                      : "border-red/40 bg-red/20 text-red"
                }`}
              >
                {n + 1}
              </button>
            );
          })}
          <button
            onClick={() => setAtual(itens.length)}
            title="Placar"
            className={`flex h-7 cursor-pointer items-center rounded-full border border-line/60 px-2.5 text-[11px] font-semibold text-dim transition-colors hover:text-txt ${
              idx >= itens.length ? "ring-2 ring-gold/70 ring-offset-1 ring-offset-navy-950" : ""
            }`}
          >
            Placar
          </button>
        </div>

        {item ? (
          <CartaoPremissa
            key={item.id}
            item={item}
            numero={idx + 1}
            total={itens.length}
            onResponder={responderItem}
            onRefazer={() => responder.mutate({ id: item.id, resposta: null }, { onError: erro })}
          />
        ) : (
          <Placar
            placar={placar}
            erradas={erradas}
            indice={(id) => itens.findIndex((i) => i.id === id)}
            onIr={setAtual}
            onRefazerErradas={() =>
              refazer(
                erradas.map((i) => i.id),
                "As que você errou estão prontas para refazer"
              )
            }
            onVoltar={irParaLista}
          />
        )}

        {item && (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setAtual(Math.max(idx - 1, 0))}
              disabled={idx === 0}
              className="flex h-10 cursor-pointer items-center gap-1 rounded-xl border border-line/60 px-3 text-sm font-semibold text-dim transition-colors hover:border-line hover:text-txt disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Anterior
            </button>
            <button
              onClick={() => setAtual(idx + 1)}
              className={`flex h-10 cursor-pointer items-center gap-1 rounded-xl px-4 text-sm font-semibold transition-colors ${
                item.resposta !== null
                  ? "bg-gold text-navy-950 hover:bg-gold-soft"
                  : "border border-line/60 text-dim hover:border-line hover:text-txt"
              }`}
            >
              {idx === itens.length - 1 ? "Ver placar" : "Próxima"} <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function CartaoPremissa({
  item,
  numero,
  total,
  onResponder,
  onRefazer,
}: {
  item: RevisaoSemanalItem;
  numero: number;
  total: number;
  onResponder: (valor: boolean) => void;
  onRefazer: () => void;
}) {
  const respondida = item.resposta !== null;
  const acertou = respondida && item.resposta === item.gabarito;
  const motivo = MOTIVO[item.motivo] ?? MOTIVO.erro;
  const [zoom, setZoom] = useState(false);

  return (
    <article className="animar-surgir rounded-2xl border border-line/50 bg-navy-900/60 p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold tabular-nums text-mut">
          Premissa {numero} de {total}
        </span>
        {item.tema && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
            {item.tema}
          </span>
        )}
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${motivo.classe}`}>
          {motivo.rotulo}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-txt">{item.premissa}</p>

      {!respondida ? (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onResponder(true)}
            className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-green/30 bg-green/10 text-sm font-semibold text-green transition-all hover:bg-green/20 active:scale-[0.97]"
          >
            <Check className="size-4" /> Certo
          </button>
          <button
            onClick={() => onResponder(false)}
            className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red/30 bg-red/10 text-sm font-semibold text-red transition-all hover:bg-red/20 active:scale-[0.97]"
          >
            <X className="size-4" /> Errado
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${
              acertou ? "border-green/40 bg-green/10 text-green" : "border-red/40 bg-red/10 text-red"
            }`}
          >
            {acertou ? <Check className="size-4 shrink-0" /> : <X className="size-4 shrink-0" />}
            <span className="min-w-0 flex-1">
              {acertou ? "Acertou" : "Errou"} · a premissa está {item.gabarito ? "CERTA" : "ERRADA"}
            </span>
            <button
              onClick={onRefazer}
              className="shrink-0 cursor-pointer rounded-lg p-1 text-mut transition-colors hover:text-txt"
              title="Responder de novo"
              aria-label="Responder de novo"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>

          <section className="rounded-xl border border-line/40 bg-navy-800/50 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue">
              <BookOpen className="size-3.5" /> No caderno
              {item.origem && (
                <span className="font-semibold normal-case tracking-normal text-mut">· {item.origem}</span>
              )}
            </p>
            <TextoRevisao texto={item.explicacao} />
          </section>

          {item.complemento && (
            <section className="rounded-xl border border-gold/30 bg-gold/5 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                <Sparkles className="size-3.5" /> Observação
              </p>
              <TextoRevisao texto={item.complemento} />
            </section>
          )}

          {item.imagem_url && (
            <>
              <button
                onClick={() => setZoom(true)}
                className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line/40 bg-navy-950"
                title="Ampliar"
              >
                <img src={item.imagem_url} alt="" loading="lazy" className="mx-auto max-h-[420px] w-auto" />
              </button>
              {zoom && (
                <div
                  className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-3"
                  onClick={() => setZoom(false)}
                >
                  <img src={item.imagem_url} alt="" className="max-h-full max-w-full rounded-lg" />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function Placar({
  placar,
  erradas,
  indice,
  onIr,
  onRefazerErradas,
  onVoltar,
}: {
  placar: ReturnType<typeof placarDe>;
  erradas: RevisaoSemanalItem[];
  indice: (id: string) => number;
  onIr: (n: number) => void;
  onRefazerErradas: () => void;
  onVoltar: () => void;
}) {
  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;
  const faltam = placar.total - placar.respondidas;
  return (
    <article className="animar-surgir space-y-4 rounded-2xl border border-line/50 bg-navy-900/60 p-5 text-center shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-wide text-mut">Placar da matéria</p>
      <p className={`text-4xl font-extrabold tabular-nums ${cor?.texto ?? "text-txt"}`}>
        {placar.acertos}/{placar.respondidas}
      </p>
      <p className="text-sm text-dim">
        {placar.pct !== null ? `${placar.pct}% de acerto` : "Nenhuma respondida ainda"}
        {faltam > 0 && ` · faltam ${faltam}`}
      </p>

      {erradas.length > 0 && (
        <div className="space-y-1.5 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wide text-red">Para rever</p>
          <ul className="space-y-1.5">
            {erradas.map((i) => (
              <li key={i.id}>
                <button
                  onClick={() => onIr(indice(i.id))}
                  className="w-full cursor-pointer rounded-lg border border-red/25 bg-red/5 px-3 py-2 text-left text-xs leading-snug text-dim transition-colors hover:bg-red/10 hover:text-txt"
                >
                  <span className="line-clamp-2">
                    <span className="mr-1.5 font-bold tabular-nums text-red">{indice(i.id) + 1}.</span>
                    {i.tema ? <strong className="text-txt">{i.tema}: </strong> : null}
                    {i.premissa}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {erradas.length > 0 && (
          <button
            onClick={onRefazerErradas}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-soft"
          >
            <RotateCcw className="size-4" /> Refazer as que errei
          </button>
        )}
        <button
          onClick={onVoltar}
          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-line/60 px-4 text-sm font-semibold text-dim transition-colors hover:border-line hover:text-txt"
        >
          Outras matérias
        </button>
      </div>
    </article>
  );
}
