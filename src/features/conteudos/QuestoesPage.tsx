import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  ChevronRight,
  MessageCircleQuestion,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { QuestaoStatus, Topico, TopicoQuestao } from "@/types/db";
import {
  useCriarQuestoesEmLote,
  useExcluirQuestao,
  useResponderQuestao,
  useSetQuestaoStatus,
  useTopicoQuestoes,
} from "@/api/topicoQuestoes";
import { useTopicos } from "@/api/topicos";
import { useMaterias } from "@/api/materias";
import { useIndiceTextosDoTopico } from "@/api/topicoTextos";
import { useRegistrarClique } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { Button } from "@/components/Button";
import { FullScreenSpinner, Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { corDesempenho } from "./desempenho";
import { parsearQuestoesJson } from "./questoesJson";
import { ResumoRapido } from "./ResumoRapido";
import { DuvidaIAModal } from "./DuvidaIAModal";
import { useAdicionarQuestaoAoResumo } from "./adicionarAoResumo";
import { BotaoBloquinhos, CabecalhoBloco, RodapeBloco, useBloquinhos } from "./bloquinhos";
import { ConferirNaLeiModal } from "./ConferirNaLeiModal";

// "Para responder" e "Resolvidas" dividem as questões ativas pela resposta:
// o que você acabou de responder segue à mostra (para ler o comentário), mas
// na próxima visita já está guardado em "Resolvidas" — sem rolagem inútil.
type AbaCaderno = "responder" | "resolvidas" | "reforco" | "arquivada";

const ABAS: { chave: AbaCaderno; label: string }[] = [
  { chave: "responder", label: "Para responder" },
  { chave: "resolvidas", label: "Resolvidas" },
  { chave: "reforco", label: "Reforço com IA" },
  { chave: "arquivada", label: "Arquivadas" },
];

/** Em qual aba a questão aparece agora (as respondidas nesta sessão ainda não "somem"). */
function abaDe(q: TopicoQuestao, respondidasAgora: ReadonlySet<string>): AbaCaderno {
  if (q.status === "reforco") return "reforco";
  if (q.status === "arquivada") return "arquivada";
  return q.resposta === null || respondidasAgora.has(q.id) ? "responder" : "resolvidas";
}

const EXEMPLO_JSON = `[
  {
    "contexto": "Com relação à história de Alagoas, julgue o item a seguir.",
    "enunciado": "A vila do Penedo foi fundada às margens do rio São Francisco.",
    "gabarito": "C",
    "comentario": "Penedo, na foz do São Francisco, foi o marco inicial da ocupação efetiva.",
    "fonte": "Aula 01 — Colonização portuguesa"
  }
]`;

/** Página dedicada do caderno — abre em aba própria, com espaço para ler e resolver. */
export function QuestoesPage() {
  const { topicoId } = useParams();
  const navigate = useNavigate();
  const { data: topicos, isLoading } = useTopicos();

  const topico = (topicos ?? []).find((t) => t.id === topicoId);

  // Nome do assunto na aba do navegador, já que a página vive em aba própria.
  useEffect(() => {
    if (!topico) return;
    const anterior = document.title;
    document.title = `Questões · ${topico.titulo}`;
    return () => {
      document.title = anterior;
    };
  }, [topico]);

  if (isLoading) return <FullScreenSpinner />;

  if (!topico) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon="🔍"
          title="Assunto não encontrado"
          message="Ele pode ter sido excluído."
          action={
            <Link to="/" className="text-sm font-semibold text-gold hover:underline">
              ← Ir para o painel
            </Link>
          }
        />
      </div>
    );
  }

  function voltar() {
    // Aba aberta direto no caderno não tem histórico: tenta fechar a aba.
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-line/50 bg-navy-900/90 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={voltar}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-mut transition-colors hover:bg-navy-700 hover:text-txt"
          title="Voltar"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Sparkles className="size-4 shrink-0 text-gold" />
        <h1 className="min-w-0 truncate text-base font-semibold text-txt">
          Questões por IA · {topico.titulo}
        </h1>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        <Caderno topico={topico} />
      </main>

      {/* Bloco de resumo sempre à mão durante a rolagem */}
      <ResumoRapido topico={topico} />
    </div>
  );
}

/**
 * Caderno de questões geradas por IA a partir do material do assunto. O item é
 * no estilo da banca (certo/errado); resolvido, abre o gabarito comentado e as
 * opções de destino: refazer, marcar para reforço com IA, arquivar ou apagar.
 * As marcadas para reforço formam o conjunto usado ao pedir novas questões de
 * reforço. A primeira resposta de cada questão também entra no desempenho do assunto.
 */
function Caderno({ topico }: { topico: Topico }) {
  const { data: questoes, isLoading } = useTopicoQuestoes(topico.id);
  const { data: materias } = useMaterias();
  const responder = useResponderQuestao();
  const setStatus = useSetQuestaoStatus();
  const excluir = useExcluirQuestao();
  const criarEmLote = useCriarQuestoesEmLote();
  const clique = useRegistrarClique();

  const [filtro, setFiltro] = useState<AbaCaderno>("responder");
  const [importando, setImportando] = useState(false);
  const [json, setJson] = useState("");
  const [aExcluir, setAExcluir] = useState<TopicoQuestao | null>(null);
  const [duvida, setDuvida] = useState<TopicoQuestao | null>(null);
  const [naLei, setNaLei] = useState<TopicoQuestao | null>(null);
  // Respondidas nesta sessão seguem em "Para responder", para dar tempo de ler
  // o gabarito comentado antes de irem para "Resolvidas".
  const [respondidasAgora, setRespondidasAgora] = useState<ReadonlySet<string>>(new Set());
  const { adicionar: adicionarAoResumo, pendenteId: resumindoId } = useAdicionarQuestaoAoResumo();
  // Índice leve (sem o conteúdo) só para saber se há lei salva neste assunto —
  // sem texto, o "Conferir na lei" nem aparece. Já deixa o modal pronto também.
  const { data: indiceLei } = useIndiceTextosDoTopico(topico.id);
  const temLei = (indiceLei ?? []).length > 0;

  const materiaNome = (materias ?? []).find((m) => m.id === topico.materia_id)?.nome;

  const todas = useMemo(() => questoes ?? [], [questoes]);

  // Número da questão fixo na ordem do caderno, não muda ao trocar de aba.
  const numeroDe = useMemo(
    () => new Map(todas.map((q, i) => [q.id, i + 1])),
    [todas]
  );

  const contagem = useMemo(() => {
    const c: Record<AbaCaderno, number> = { responder: 0, resolvidas: 0, reforco: 0, arquivada: 0 };
    for (const q of todas) c[abaDe(q, respondidasAgora)]++;
    return c;
  }, [todas, respondidasAgora]);

  // Placar considera tudo que já foi respondido, em qualquer aba.
  const placar = useMemo(() => {
    const respondidas = todas.filter((q) => q.resposta !== null);
    const acertos = respondidas.filter((q) => q.resposta === q.gabarito).length;
    return {
      respondidas: respondidas.length,
      acertos,
      pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
    };
  }, [todas]);

  const lista = todas.filter((q) => abaDe(q, respondidasAgora) === filtro);
  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;
  // Modo bloquinhos: resolve de 5 em 5, com placar próprio do bloco.
  const bloco = useBloquinhos(lista, filtro);

  /** `resposta: null` é o "refazer": limpa o gabarito e devolve a questão ao início. */
  async function onResponder(q: TopicoQuestao, resposta: boolean | null) {
    const estreia = resposta !== null && q.resposta === null;
    try {
      await responder.mutateAsync({ id: q.id, resposta });
      setRespondidasAgora((s) => {
        const n = new Set(s);
        if (resposta === null) n.delete(q.id);
        else n.add(q.id);
        return n;
      });
      // Só a estreia conta no desempenho — refazer a questão não infla a estatística.
      if (estreia) {
        clique.mutate({
          data: hojeISO(),
          materiaId: topico.materia_id,
          topicoId: topico.id,
          acerto: resposta === q.gabarito,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function mudarStatus(q: TopicoQuestao, status: QuestaoStatus, aviso: string) {
    setStatus.mutate(
      { id: q.id, status },
      {
        onSuccess: () => toast.success(aviso),
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      }
    );
  }

  async function onImportar() {
    try {
      const ordemInicial = todas.reduce((m, q) => Math.max(m, q.ordem), -1) + 1;
      const linhas = parsearQuestoesJson(json, topico.id, ordemInicial);
      const n = await criarEmLote.mutateAsync(linhas);
      toast.success(`${n} ${n === 1 ? "questão importada" : "questões importadas"} 🎯`);
      setJson("");
      setImportando(false);
      setFiltro("responder");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-6" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Placar do caderno */}
          {todas.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line/50 bg-navy-900/60 px-3 py-2.5">
              <span className="text-xs text-dim">
                Resolvidas{" "}
                <strong className="tabular-nums text-txt">
                  {placar.respondidas}/{todas.length}
                </strong>
              </span>
              {placar.pct !== null && cor && (
                <span className={`text-xs font-semibold tabular-nums ${cor.texto}`}>
                  {placar.acertos} acertos · {placar.pct}%
                </span>
              )}
              <span className="text-[11px] text-mut">
                A 1ª resposta entra no desempenho do assunto
              </span>
              <BotaoBloquinhos b={bloco} className="ml-auto" />
            </div>
          )}

          {/* Abas por destino da questão — rolam na horizontal em telas estreitas */}
          <div className="flex gap-1 overflow-x-auto border-b border-line/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ABAS.map((a) => (
              <button
                key={a.chave}
                onClick={() => setFiltro(a.chave)}
                className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  filtro === a.chave
                    ? "border-gold text-gold"
                    : "border-transparent text-mut hover:text-dim"
                }`}
              >
                {a.label}
                <span className="ml-1.5 tabular-nums opacity-70">{contagem[a.chave]}</span>
              </button>
            ))}
          </div>

          {lista.length === 0 ? (
            <p className="py-8 text-center text-sm text-mut">
              {todas.length === 0
                ? "Nenhuma questão ainda. Peça as questões à IA a partir do PDF ou do conteúdo deste assunto e importe o JSON abaixo."
                : filtro === "responder"
                  ? "Tudo respondido 🎉 As já resolvidas ficam na aba “Resolvidas”."
                  : filtro === "resolvidas"
                    ? "Nenhuma questão resolvida ainda."
                    : filtro === "reforco"
                      ? "Nenhuma questão marcada para reforço com IA."
                      : "Nenhuma questão arquivada."}
            </p>
          ) : (
            <div className="space-y-3">
              <CabecalhoBloco b={bloco} />
              <ul className="space-y-3">
                {bloco.lista.map((q) => (
                  <QuestaoCard
                    key={q.id}
                    questao={q}
                    numero={numeroDe.get(q.id) ?? 0}
                    onResponder={onResponder}
                    onStatus={mudarStatus}
                    onExcluir={() => setAExcluir(q)}
                    onDuvida={() => setDuvida(q)}
                    onConferirLei={temLei ? () => setNaLei(q) : undefined}
                    onAdicionarResumo={() =>
                      void adicionarAoResumo({
                        questao: q,
                        materiaNome,
                        assunto: topico.titulo,
                        destino: { topicoId: topico.id },
                      })
                    }
                    resumindo={resumindoId === q.id}
                  />
                ))}
              </ul>
              <RodapeBloco b={bloco} />
            </div>
          )}

          {/* Entrada das questões geradas pela IA */}
          <div className="rounded-xl border border-line/50 bg-navy-900/60">
            <button
              onClick={() => setImportando((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-dim">
                <Sparkles className="size-3.5 text-gold" /> Importar questões (JSON da IA)
              </span>
              <ChevronRight
                className={`size-4 shrink-0 text-mut transition-transform ${
                  importando ? "rotate-90" : ""
                }`}
              />
            </button>
            {importando && (
              <div className="space-y-2 border-t border-line/30 px-3 py-3">
                <p className="text-[11px] leading-relaxed text-mut">
                  Cole uma lista de objetos com <code className="text-dim">enunciado</code>,{" "}
                  <code className="text-dim">gabarito</code> (&quot;C&quot; ou &quot;E&quot;) e,
                  opcionalmente, <code className="text-dim">contexto</code>,{" "}
                  <code className="text-dim">comentario</code> e{" "}
                  <code className="text-dim">fonte</code>.
                </p>
                <textarea
                  value={json}
                  onChange={(e) => setJson(e.target.value)}
                  placeholder={EXEMPLO_JSON}
                  spellCheck={false}
                  className="h-40 w-full resize-y rounded-lg border border-line bg-navy-950 p-2.5 font-mono text-[11px] leading-relaxed text-txt outline-none placeholder:text-mut/60 focus:border-gold/60"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setImportando(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={criarEmLote.isPending}
                    disabled={!json.trim()}
                    onClick={onImportar}
                  >
                    Importar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!aExcluir}
        onClose={() => setAExcluir(null)}
        onConfirm={() => {
          if (aExcluir) excluir.mutate(aExcluir.id);
          setAExcluir(null);
        }}
        title="Apagar questão?"
        message={`A questão ${
          aExcluir ? numeroDe.get(aExcluir.id) : ""
        } será excluída para sempre. Para tirá-la do caderno sem perder o item, prefira arquivar.`}
        confirmLabel="Apagar"
        danger
      />

      {duvida && (
        <DuvidaIAModal
          questao={duvida}
          materiaNome={materiaNome}
          assunto={topico.titulo}
          onClose={() => setDuvida(null)}
        />
      )}

      {naLei && (
        <ConferirNaLeiModal
          questao={naLei}
          topicoId={topico.id}
          numero={numeroDe.get(naLei.id)}
          onClose={() => setNaLei(null)}
        />
      )}
    </>
  );
}

interface CardProps {
  questao: TopicoQuestao;
  numero: number;
  onResponder: (q: TopicoQuestao, resposta: boolean | null) => void;
  onStatus: (q: TopicoQuestao, status: QuestaoStatus, aviso: string) => void;
  onExcluir: () => void;
  onDuvida: () => void;
  /** Ausente quando o assunto não tem nenhum texto de lei salvo. */
  onConferirLei?: () => void;
  onAdicionarResumo: () => void;
  resumindo: boolean;
}

function QuestaoCard({
  questao: q,
  numero,
  onResponder,
  onStatus,
  onExcluir,
  onDuvida,
  onConferirLei,
  onAdicionarResumo,
  resumindo,
}: CardProps) {
  const resolvida = q.resposta !== null;
  const acertou = q.resposta === q.gabarito;
  const status = q.status as QuestaoStatus;

  return (
    <li className="group/q rounded-xl border border-line/50 bg-navy-900/40 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-mut">
          Questão {numero}
        </span>
        {status === "reforco" && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
            Reforço IA
          </span>
        )}
        {status === "arquivada" && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mut">
            Arquivada
          </span>
        )}
        {q.fonte && (
          <span className="min-w-0 truncate text-[10px] text-mut" title={q.fonte}>
            {q.fonte}
          </span>
        )}
        <button
          onClick={onExcluir}
          className="ml-auto shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-colors hover:bg-red/10 hover:text-red group-hover/q:opacity-100 max-md:opacity-100"
          title="Apagar questão"
          aria-label={`Apagar questão ${numero}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {q.contexto && (
        <p className="mb-2 border-l-2 border-line pl-2.5 text-xs italic leading-relaxed text-mut">
          {q.contexto}
        </p>
      )}

      <p className="text-sm leading-relaxed text-txt">{q.enunciado}</p>

      {!resolvida ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onResponder(q, true)}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-green/30 bg-green/15 text-sm font-semibold text-green transition-all hover:bg-green/25 active:scale-[0.97]"
          >
            <Check className="size-4" /> Certo
          </button>
          <button
            onClick={() => onResponder(q, false)}
            className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red/30 bg-red/15 text-sm font-semibold text-red transition-all hover:bg-red/25 active:scale-[0.97]"
          >
            <X className="size-4" /> Errado
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div
            className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-2 text-xs font-semibold ${
              acertou ? "bg-green/10 text-green" : "bg-red/10 text-red"
            }`}
          >
            {acertou ? <Check className="size-4" /> : <X className="size-4" />}
            {acertou ? "Você acertou" : "Você errou"}
            <span className="font-normal text-dim">
              Sua resposta: {q.resposta ? "Certo" : "Errado"} · Gabarito:{" "}
              <strong className="text-txt">{q.gabarito ? "CERTO" : "ERRADO"}</strong>
            </span>
          </div>

          {q.comentario && (
            <div className="border-l-2 border-gold/60 pl-2.5">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                Comentário
              </p>
              <p className="text-xs leading-relaxed text-dim">{q.comentario}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 border-t border-line/30 pt-2.5">
            {onConferirLei && (
              <AcaoQuestao icone={<BookOpen className="size-3.5 text-blue" />} onClick={onConferirLei}>
                Conferir na lei
              </AcaoQuestao>
            )}
            <AcaoQuestao
              icone={<MessageCircleQuestion className="size-3.5 text-gold" />}
              onClick={onDuvida}
            >
              Tirar dúvida com IA
            </AcaoQuestao>
            <AcaoQuestao
              icone={
                resumindo ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <NotebookPen className="size-3.5 text-gold" />
                )
              }
              onClick={onAdicionarResumo}
            >
              {resumindo ? "Adicionando…" : "Adicionar ao resumo"}
            </AcaoQuestao>
            <AcaoQuestao icone={<RotateCcw className="size-3.5" />} onClick={() => onResponder(q, null)}>
              Refazer
            </AcaoQuestao>
            <AcaoQuestao
              ativo={status === "reforco"}
              icone={
                status === "reforco" ? (
                  <BookmarkCheck className="size-3.5" />
                ) : (
                  <Bookmark className="size-3.5" />
                )
              }
              onClick={() =>
                status === "reforco"
                  ? onStatus(q, "ativa", "Removida do reforço com IA.")
                  : onStatus(q, "reforco", "Marcada para reforço com IA 🔖")
              }
            >
              {status === "reforco" ? "No reforço com IA" : "Marcar para reforço com IA"}
            </AcaoQuestao>
            <AcaoQuestao
              icone={
                status === "arquivada" ? (
                  <ArchiveRestore className="size-3.5" />
                ) : (
                  <Archive className="size-3.5" />
                )
              }
              onClick={() =>
                status === "arquivada"
                  ? onStatus(q, "ativa", "Questão desarquivada.")
                  : onStatus(q, "arquivada", "Questão arquivada.")
              }
            >
              {status === "arquivada" ? "Desarquivar" : "Arquivar"}
            </AcaoQuestao>
          </div>
        </div>
      )}
    </li>
  );
}

function AcaoQuestao({
  icone,
  ativo = false,
  onClick,
  children,
}: {
  icone: ReactNode;
  ativo?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        ativo
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
      }`}
    >
      {icone}
      {children}
    </button>
  );
}
