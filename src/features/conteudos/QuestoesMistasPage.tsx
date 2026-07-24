import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  MessageCircleQuestion,
  NotebookPen,
  RotateCcw,
  Shuffle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { Materia, QuestaoDificuldade, TopicoQuestao } from "@/types/db";
import {
  useResponderQuestao,
  useSetQuestaoDificuldade,
  useTodasQuestoes,
} from "@/api/topicoQuestoes";
import { useTopicos } from "@/api/topicos";
import { useMaterias } from "@/api/materias";
import { useTopicosComLei } from "@/api/topicoTextos";
import { useRegistrarClique } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { FullScreenSpinner, Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { corDesempenho } from "./desempenho";
import { ResumoRapido } from "./ResumoRapido";
import { DuvidaIAModal } from "./DuvidaIAModal";
import { useAdicionarQuestaoAoResumo } from "./adicionarAoResumo";
import { BotaoBloquinhos, CabecalhoBloco, RodapeBloco, useBloquinhos } from "./bloquinhos";
import { ConferirNaLeiModal } from "./ConferirNaLeiModal";
import { BadgeDificuldade, SeletorDificuldade } from "./dificuldade";

const ABAS = [
  { chave: "responder", label: "Para responder" },
  { chave: "resolvidas", label: "Resolvidas" },
] as const;
type Aba = (typeof ABAS)[number]["chave"];

function gerarSemente() {
  return Math.floor(Math.random() * 2 ** 31);
}

/** RNG determinístico (mulberry32): mesma semente → mesma sequência. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar<T>(itens: T[], semente: number): T[] {
  const arr = [...itens];
  const rnd = mulberry32(semente);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Modo misturado — todas as questões do site, de todas as matérias, em ordem
 * embaralhada. Abre em aba própria, como o caderno de um assunto, mas cada
 * questão mostra só a matéria no topo (sem assunto nem fonte, para não dar
 * pista). Responder aqui grava na mesma questão do caderno e segue a mesma
 * regra: a 1ª resposta entra no desempenho do assunto.
 */
export function QuestoesMistasPage() {
  const navigate = useNavigate();
  const { data: questoes, isLoading: carregandoQuestoes } = useTodasQuestoes();
  const { data: topicos, isLoading: carregandoTopicos } = useTopicos();
  const { data: materias, isLoading: carregandoMaterias } = useMaterias();

  const responder = useResponderQuestao();
  const setDificuldade = useSetQuestaoDificuldade();
  const clique = useRegistrarClique();

  const [semente, setSemente] = useState(gerarSemente);
  const [aba, setAba] = useState<Aba>("responder");
  const [duvida, setDuvida] = useState<TopicoQuestao | null>(null);
  const [naLei, setNaLei] = useState<TopicoQuestao | null>(null);
  // Quais assuntos têm lei salva — o "Conferir na lei" só aparece nesses.
  const { data: comLei } = useTopicosComLei();
  const { adicionar: adicionarAoResumo, pendenteId: resumindoId } = useAdicionarQuestaoAoResumo();
  // Respondidas nesta sessão seguem à mostra em "Para responder", para dar
  // tempo de ler o gabarito comentado antes de irem para "Resolvidas".
  const [respondidasAgora, setRespondidasAgora] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const anterior = document.title;
    document.title = "Questões · Todas as matérias";
    return () => {
      document.title = anterior;
    };
  }, []);

  const topicoPorId = useMemo(() => new Map((topicos ?? []).map((t) => [t.id, t])), [topicos]);
  const materiaPorId = useMemo(() => new Map((materias ?? []).map((m) => [m.id, m])), [materias]);

  // Ordena por id antes de embaralhar: a mesma semente reproduz a mesma ordem
  // mesmo após os refetches disparados pelas respostas.
  const misturadas = useMemo(() => {
    const vivas = (questoes ?? []).filter((q) => q.status !== "arquivada");
    vivas.sort((a, b) => a.id.localeCompare(b.id));
    return embaralhar(vivas, semente);
  }, [questoes, semente]);

  // Placar de tudo que já foi respondido, em qualquer aba.
  const placar = useMemo(() => {
    const respondidas = misturadas.filter((q) => q.resposta !== null);
    const acertos = respondidas.filter((q) => q.resposta === q.gabarito).length;
    return {
      respondidas: respondidas.length,
      acertos,
      pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
    };
  }, [misturadas]);

  const paraResponder = misturadas.filter(
    (q) => q.resposta === null || respondidasAgora.has(q.id)
  );
  const resolvidas = misturadas.filter(
    (q) => q.resposta !== null && !respondidasAgora.has(q.id)
  );
  const lista = aba === "responder" ? paraResponder : resolvidas;
  const contagem: Record<Aba, number> = {
    responder: paraResponder.length,
    resolvidas: resolvidas.length,
  };
  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;
  // Modo bloquinhos: resolve de 5 em 5. Embaralhar recomeça do primeiro bloco.
  const bloco = useBloquinhos(lista, `${aba}-${semente}`);

  if (carregandoQuestoes || carregandoTopicos || carregandoMaterias) {
    return <FullScreenSpinner />;
  }

  function voltar() {
    // Aba aberta direto no modo misturado não tem histórico: tenta fechar a aba.
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  function reembaralhar() {
    setSemente(gerarSemente());
    setRespondidasAgora(new Set());
    window.scrollTo({ top: 0 });
  }

  /** `resposta: null` é o "refazer": limpa o gabarito e devolve a questão ao início. */
  async function onResponder(q: TopicoQuestao, resposta: boolean | null) {
    const estreia = resposta !== null && q.resposta === null;
    try {
      await responder.mutateAsync({ id: q.id, resposta });
      if (resposta !== null) {
        setRespondidasAgora((s) => new Set(s).add(q.id));
      }
      // Mesma regra do caderno: só a estreia conta no desempenho do assunto.
      if (estreia) {
        clique.mutate({
          data: hojeISO(),
          materiaId: topicoPorId.get(q.topico_id)?.materia_id ?? null,
          topicoId: q.topico_id,
          acerto: resposta === q.gabarito,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function mudarDificuldade(q: TopicoQuestao, dificuldade: QuestaoDificuldade | null) {
    setDificuldade.mutate(
      { id: q.id, dificuldade },
      {
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      }
    );
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
        <Shuffle className="size-4 shrink-0 text-gold" />
        <h1 className="min-w-0 truncate text-base font-semibold text-txt">
          Questões · Todas as matérias
        </h1>
        <button
          onClick={reembaralhar}
          className="ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line/60 px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-line hover:bg-navy-700/60 hover:text-txt"
          title="Embaralhar as questões de novo"
        >
          <Shuffle className="size-3.5" />
          <span className="max-sm:hidden">Embaralhar</span>
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
        {misturadas.length === 0 ? (
          <EmptyState
            icon="🎲"
            title="Nenhuma questão no site ainda"
            message="Peça questões à IA dentro dos assuntos de cada matéria e elas aparecem aqui, todas misturadas."
          />
        ) : (
          <div className="space-y-4">
            {/* Placar geral */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line/50 bg-navy-900/60 px-3 py-2.5">
              <span className="text-xs text-dim">
                Resolvidas{" "}
                <strong className="tabular-nums text-txt">
                  {placar.respondidas}/{misturadas.length}
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

            {/* Abas — rolam na horizontal em telas estreitas */}
            <div className="flex gap-1 overflow-x-auto border-b border-line/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {ABAS.map((a) => (
                <button
                  key={a.chave}
                  onClick={() => setAba(a.chave)}
                  className={`-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                    aba === a.chave
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
                {aba === "responder"
                  ? "Tudo resolvido 🎉 Use “Refazer” nas resolvidas para revisar."
                  : "Nenhuma questão resolvida ainda."}
              </p>
            ) : (
              <div className="space-y-3">
                <CabecalhoBloco b={bloco} />
                <ul className="space-y-3">
                  {bloco.lista.map((q) => (
                    <QuestaoMistaCard
                      key={q.id}
                      questao={q}
                      materia={materiaPorId.get(topicoPorId.get(q.topico_id)?.materia_id ?? "")}
                      onResponder={onResponder}
                      onDificuldade={mudarDificuldade}
                      onDuvida={() => setDuvida(q)}
                      onConferirLei={comLei?.has(q.topico_id) ? () => setNaLei(q) : undefined}
                      onAdicionarResumo={() => {
                        const topicoDaQuestao = topicoPorId.get(q.topico_id);
                        void adicionarAoResumo({
                          questao: q,
                          materiaNome: materiaPorId.get(topicoDaQuestao?.materia_id ?? "")?.nome,
                          assunto: topicoDaQuestao?.titulo,
                          destino: { materiaId: topicoDaQuestao?.materia_id },
                        });
                      }}
                      resumindo={resumindoId === q.id}
                    />
                  ))}
                </ul>
                <RodapeBloco b={bloco} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bloco de resumo sempre à mão — escolhe a matéria onde a nota entra */}
      <ResumoRapido />

      {duvida && (
        <DuvidaIAModal
          questao={duvida}
          materiaNome={materiaPorId.get(topicoPorId.get(duvida.topico_id)?.materia_id ?? "")?.nome}
          assunto={topicoPorId.get(duvida.topico_id)?.titulo}
          onClose={() => setDuvida(null)}
        />
      )}

      {naLei && (
        <ConferirNaLeiModal
          questao={naLei}
          topicoId={naLei.topico_id}
          onClose={() => setNaLei(null)}
        />
      )}
    </div>
  );
}

interface CardProps {
  questao: TopicoQuestao;
  materia: Materia | undefined;
  onResponder: (q: TopicoQuestao, resposta: boolean | null) => void;
  onDificuldade: (q: TopicoQuestao, dificuldade: QuestaoDificuldade | null) => void;
  onDuvida: () => void;
  /** Ausente quando o assunto da questão não tem texto de lei salvo. */
  onConferirLei?: () => void;
  onAdicionarResumo: () => void;
  resumindo: boolean;
}

/** Card do modo misturado: só a matéria no topo — sem assunto, fonte ou número. */
function QuestaoMistaCard({
  questao: q,
  materia,
  onResponder,
  onDificuldade,
  onDuvida,
  onConferirLei,
  onAdicionarResumo,
  resumindo,
}: CardProps) {
  const resolvida = q.resposta !== null;
  const acertou = q.resposta === q.gabarito;

  return (
    <li className="rounded-xl border border-line/50 bg-navy-900/40 p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-navy-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-dim">
          {materia && <span className="text-xs leading-none">{materia.icone}</span>}
          <span className="truncate">{materia?.nome ?? "Matéria"}</span>
        </span>
        <BadgeDificuldade dificuldade={q.dificuldade} />
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

          <div className="border-t border-line/30 pt-2.5">
            <SeletorDificuldade
              valor={q.dificuldade}
              onSelecionar={(nivel) => onDificuldade(q, nivel)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {onConferirLei && (
              <Acao icone={<BookOpen className="size-3.5 text-blue" />} onClick={onConferirLei}>
                Conferir na lei
              </Acao>
            )}
            <Acao icone={<MessageCircleQuestion className="size-3.5 text-gold" />} onClick={onDuvida}>
              Tirar dúvida com IA
            </Acao>
            <Acao
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
            </Acao>
            <Acao icone={<RotateCcw className="size-3.5" />} onClick={() => onResponder(q, null)}>
              Refazer
            </Acao>
          </div>
        </div>
      )}
    </li>
  );
}

function Acao({
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
