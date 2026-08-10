import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  MessageCircleQuestion,
  NotebookPen,
  RotateCcw,
  Shuffle,
} from "lucide-react";
import { toast } from "sonner";
import type { Materia, QuestaoCategoria, TopicoQuestao } from "@/types/db";
import {
  useMarcarRefazer,
  useResponderQuestao,
  useTodasQuestoes,
} from "@/api/topicoQuestoes";
import { useTopicos } from "@/api/topicos";
import { useMaterias } from "@/api/materias";
import { useResumosDeQuestoes, useTopicosComLei } from "@/api/topicoTextos";
import { useQuestaoLogsTodos, useRegistrarClique } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { FullScreenSpinner, Spinner } from "@/components/Spinner";
import { MenuMais } from "@/components/MenuMais";
import { EmptyState } from "@/components/EmptyState";
import { corDesempenho } from "./desempenho";
import { DesempenhoRecenteChip } from "./DesempenhoRecenteChip";
import { ResumoRapido } from "./ResumoRapido";
import { DuvidaIAModal } from "./DuvidaIAModal";
import { useAdicionarQuestaoAoResumo } from "./adicionarAoResumo";
import { BotaoBloquinhos, CabecalhoBloco, RodapeBloco, useBloquinhos } from "./bloquinhos";
import { ConferirNaLeiModal } from "./ConferirNaLeiModal";
import { EditarTrechoResumoModal } from "./EditarTrechoResumoModal";
import { idsNoResumo } from "./resumoBlocos";
import { BotaoRefazer, OrigemReformulada } from "./refazer";
import { CATEGORIAS_FILTRO } from "./categorias";
import { ehFonteQC, FonteQuestao, PillCategoria } from "./QuestoesPage";
import { embaralhar, gerarSemente } from "./embaralhar";
import { acertou as questaoAcertou, estaResolvida, valorAcerta } from "./questaoModelo";
import { BotoesResposta, ResultadoResposta } from "./RespostaQuestao";

const ABAS = [
  { chave: "responder", label: "Para responder" },
  { chave: "resolvidas", label: "Resolvidas" },
] as const;
type Aba = (typeof ABAS)[number]["chave"];

/**
 * Modo misturado — questões embaralhadas em ordem aleatória, do jeito que caem
 * na prova. Sem `:materiaId` na rota, traz todas as questões do site; com ele,
 * só as da matéria escolhida (misturando os assuntos dela). Abre em aba própria,
 * como o caderno de um assunto. Não revela o assunto (nem o número da questão),
 * para não dar pista; a fonte da questão real (cargo, banca e ano) aparece, pois
 * não entrega a resposta. Responder aqui grava na mesma questão do caderno e segue
 * a mesma regra: a 1ª resposta entra no desempenho do assunto.
 */
export function QuestoesMistasPage() {
  const navigate = useNavigate();
  const { materiaId } = useParams();
  const { data: questoes, isLoading: carregandoQuestoes } = useTodasQuestoes();
  const { data: topicos, isLoading: carregandoTopicos } = useTopicos();
  const { data: materias, isLoading: carregandoMaterias } = useMaterias();

  const responder = useResponderQuestao();
  const marcarRefazer = useMarcarRefazer();
  const clique = useRegistrarClique();
  const { data: todosLogs } = useQuestaoLogsTodos();

  const [semente, setSemente] = useState(gerarSemente);
  const [aba, setAba] = useState<Aba>("responder");
  // Filtro por origem (mesmas pílulas do caderno do assunto), com multi-seleção.
  // Conjunto vazio = "Todas" (sem filtro); o escopo vira a união das marcadas.
  const [cats, setCats] = useState<ReadonlySet<QuestaoCategoria>>(new Set());

  /** Liga/desliga uma origem no filtro — várias podem ficar ativas ao mesmo tempo. */
  function alternarCategoria(chave: QuestaoCategoria) {
    setCats((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }
  const [duvida, setDuvida] = useState<TopicoQuestao | null>(null);
  const [naLei, setNaLei] = useState<TopicoQuestao | null>(null);
  const [verResumoDe, setVerResumoDe] = useState<TopicoQuestao | null>(null);
  // Quais assuntos têm lei salva — o "Conferir na lei" só aparece nesses.
  const { data: comLei } = useTopicosComLei();
  const {
    adicionar: adicionarAoResumo,
    pendenteId: resumindoId,
    adicionadas,
    esquecer,
  } = useAdicionarQuestaoAoResumo();

  // Resumos de questões de todas as matérias: aqui a nota de cada questão vai
  // para o resumo geral da matéria dela. Serve ao botão "No resumo" e à edição.
  const { data: resumos } = useResumosDeQuestoes();
  const idsNoBanco = useMemo(() => {
    const set = new Set<string>();
    for (const r of resumos ?? []) {
      for (const id of idsNoResumo(r.conteudo)) set.add(id);
    }
    return set;
  }, [resumos]);
  const resumoDaMateria = (mId: string | null | undefined) =>
    (resumos ?? []).find((r) => r.materia_id === mId && r.topico_id === null) ?? null;
  // Respondidas nesta sessão seguem à mostra em "Para responder", para dar
  // tempo de ler o gabarito comentado antes de irem para "Resolvidas".
  const [respondidasAgora, setRespondidasAgora] = useState<ReadonlySet<string>>(new Set());

  // Com `:materiaId`, a página fica restrita a uma matéria; sem ele, é o site todo.
  const materiaEscopo = materiaId ? (materias ?? []).find((m) => m.id === materiaId) : undefined;
  const titulo = materiaEscopo
    ? `Questões · ${materiaEscopo.nome}`
    : "Questões · Todas as matérias";

  useEffect(() => {
    const anterior = document.title;
    document.title = titulo;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);

  const topicoPorId = useMemo(() => new Map((topicos ?? []).map((t) => [t.id, t])), [topicos]);
  const materiaPorId = useMemo(() => new Map((materias ?? []).map((m) => [m.id, m])), [materias]);
  // Índice por id — acha a questão original de uma reformulada (revelado só após responder).
  const porId = useMemo(() => new Map((questoes ?? []).map((x) => [x.id, x])), [questoes]);

  // Questões vivas no escopo da página (a matéria ou o site todo), antes do
  // filtro por origem — alimenta as contagens das pílulas e o total de "Todas".
  const base = useMemo(
    () =>
      (questoes ?? []).filter((q) => {
        if (q.status === "arquivada") return false;
        // No modo por matéria, só entram as questões dos assuntos dessa matéria.
        if (materiaId) return topicoPorId.get(q.topico_id)?.materia_id === materiaId;
        return true;
      }),
    [questoes, materiaId, topicoPorId]
  );

  // Quantas questões há em cada origem — número mostrado nas pílulas de filtro.
  const contagemCategoria = useMemo(() => {
    const c = { doutrina_jurisprudencia: 0, baseada_questoes: 0, ia: 0, real: 0 } as Record<
      QuestaoCategoria,
      number
    >;
    for (const q of base) {
      const k = q.categoria as QuestaoCategoria;
      if (k in c) c[k]++;
    }
    return c;
  }, [base]);

  // Ordena por id antes de embaralhar: a mesma semente reproduz a mesma ordem
  // mesmo após os refetches disparados pelas respostas. O filtro por origem
  // recorta antes do embaralho ("todas" = sem recorte).
  const misturadas = useMemo(() => {
    const vivas =
      cats.size === 0 ? base : base.filter((q) => cats.has(q.categoria as QuestaoCategoria));
    const arr = [...vivas].sort((a, b) => a.id.localeCompare(b.id));
    return embaralhar(arr, semente);
  }, [base, cats, semente]);

  // Histórico (questao_logs) no escopo da página — a matéria escolhida ou o site
  // todo — para a janela das últimas 30 questões.
  const logsEscopo = useMemo(() => {
    const todos = todosLogs ?? [];
    return materiaId ? todos.filter((l) => l.materia_id === materiaId) : todos;
  }, [todosLogs, materiaId]);

  // Placar de tudo que já foi respondido, em qualquer aba.
  const placar = useMemo(() => {
    const respondidas = misturadas.filter((q) => estaResolvida(q));
    const acertos = respondidas.filter((q) => questaoAcertou(q)).length;
    return {
      respondidas: respondidas.length,
      acertos,
      pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
    };
  }, [misturadas]);

  const paraResponder = misturadas.filter(
    (q) => !estaResolvida(q) || respondidasAgora.has(q.id)
  );
  const resolvidas = misturadas.filter(
    (q) => estaResolvida(q) && !respondidasAgora.has(q.id)
  );
  const lista = aba === "responder" ? paraResponder : resolvidas;
  const contagem: Record<Aba, number> = {
    responder: paraResponder.length,
    resolvidas: resolvidas.length,
  };
  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;
  // Rótulo das origens marcadas (na ordem das pílulas), para o texto de "vazio".
  const catsLabel = CATEGORIAS_FILTRO.filter((c) => cats.has(c.chave))
    .map((c) => c.curto)
    .join(", ");
  // Chave estável do conjunto (ordenada). Modo bloquinhos: resolve de 5 em 5;
  // trocar de origem, aba ou embaralhar recomeça do 1º bloco.
  const catsKey = [...cats].sort().join(",");
  const bloco = useBloquinhos(lista, `${catsKey}-${aba}-${semente}`);

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

  /**
   * `valor: null` é o "refazer": limpa a resposta e devolve a questão ao início.
   * boolean = Certo/Errado; string = letra marcada na múltipla escolha.
   */
  async function onResponder(q: TopicoQuestao, valor: boolean | string | null) {
    const estreia = valor !== null && !estaResolvida(q);
    try {
      await responder.mutateAsync({
        id: q.id,
        resposta: typeof valor === "boolean" ? valor : null,
        respostaLetra: typeof valor === "string" ? valor : null,
      });
      if (valor !== null) {
        setRespondidasAgora((s) => new Set(s).add(q.id));
      }
      // Mesma regra do caderno: só a estreia conta no desempenho do assunto.
      if (estreia && valor !== null) {
        clique.mutate({
          data: hojeISO(),
          materiaId: topicoPorId.get(q.topico_id)?.materia_id ?? null,
          topicoId: q.topico_id,
          acerto: valorAcerta(q, valor),
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function mudarRefazer(q: TopicoQuestao, marcar: boolean) {
    marcarRefazer.mutate(
      { id: q.id, refazer: marcar },
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
        {materiaEscopo ? (
          <span className="shrink-0 text-base leading-none">{materiaEscopo.icone}</span>
        ) : (
          <Shuffle className="size-4 shrink-0 text-gold" />
        )}
        <h1 className="min-w-0 truncate text-base font-semibold text-txt">{titulo}</h1>
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
        {base.length === 0 ? (
          <EmptyState
            icon="🎲"
            title={materiaEscopo ? "Nenhuma questão nesta matéria ainda" : "Nenhuma questão no site ainda"}
            message={
              materiaEscopo
                ? "Peça questões à IA dentro dos assuntos desta matéria e elas aparecem aqui, todas misturadas."
                : "Peça questões à IA dentro dos assuntos de cada matéria e elas aparecem aqui, todas misturadas."
            }
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
              <DesempenhoRecenteChip logs={logsEscopo} />
              <span className="text-[11px] text-mut">
                A 1ª resposta entra no desempenho do assunto
              </span>
              <BotaoBloquinhos b={bloco} className="ml-auto" />
            </div>

            {/* Filtro por origem — as mesmas pílulas do caderno do assunto. Dá para
                marcar várias (o escopo vira a união); "Todas" limpa e junta tudo. */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-mut">
                Tipo
              </span>
              <PillCategoria
                ativo={cats.size === 0}
                onClick={() => setCats(new Set())}
                label="Todas"
                contagem={base.length}
              />
              {CATEGORIAS_FILTRO.map((c) => (
                <PillCategoria
                  key={c.chave}
                  ativo={cats.has(c.chave)}
                  onClick={() => alternarCategoria(c.chave)}
                  label={c.curto}
                  title={c.label}
                  contagem={contagemCategoria[c.chave]}
                />
              ))}
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
                {misturadas.length === 0
                  ? `Nenhuma questão em “${catsLabel}” ainda.`
                  : aba === "responder"
                    ? "Tudo resolvido 🎉 Use “Responder de novo” nas resolvidas para revisar."
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
                      mostrarMateria={!materiaId}
                      onResponder={onResponder}
                      onRefazer={mudarRefazer}
                      origem={q.reformulada_de ? porId.get(q.reformulada_de) : undefined}
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
                      naResumo={idsNoBanco.has(q.id) || adicionadas.has(q.id)}
                      onVerResumo={() => setVerResumoDe(q)}
                    />
                  ))}
                </ul>
                <RodapeBloco b={bloco} logs={logsEscopo} />
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

      {verResumoDe &&
        (() => {
          const materiaIdDaQuestao = topicoPorId.get(verResumoDe.topico_id)?.materia_id;
          const resumoTexto = resumoDaMateria(materiaIdDaQuestao);
          return (
            <EditarTrechoResumoModal
              questaoId={verResumoDe.id}
              destino={{ materiaId: materiaIdDaQuestao ?? undefined }}
              resumoTextoId={resumoTexto?.id}
              conteudoBanco={resumoTexto?.conteudo ?? ""}
              onRemovido={() => esquecer(verResumoDe.id)}
              onClose={() => setVerResumoDe(null)}
            />
          );
        })()}
    </div>
  );
}

interface CardProps {
  questao: TopicoQuestao;
  materia: Materia | undefined;
  /** No modo por matéria a etiqueta some (é sempre a mesma, já vai no cabeçalho). */
  mostrarMateria: boolean;
  onResponder: (q: TopicoQuestao, valor: boolean | string | null) => void;
  onRefazer: (q: TopicoQuestao, marcar: boolean) => void;
  /** A questão original, quando esta é uma reformulação (revelada só após responder). */
  origem?: TopicoQuestao;
  onDuvida: () => void;
  /** Ausente quando o assunto da questão não tem texto de lei salvo. */
  onConferirLei?: () => void;
  onAdicionarResumo: () => void;
  resumindo: boolean;
  /** A questão já tem um trecho no resumo — o botão vira "No resumo". */
  naResumo: boolean;
  onVerResumo: () => void;
}

/** Card do modo misturado: matéria e a fonte real (cargo/banca/ano) no topo —
 *  sem revelar o assunto nem o número da questão. */
function QuestaoMistaCard({
  questao: q,
  materia,
  mostrarMateria,
  onResponder,
  onRefazer,
  origem,
  onDuvida,
  onConferirLei,
  onAdicionarResumo,
  resumindo,
  naResumo,
  onVerResumo,
}: CardProps) {
  const resolvida = estaResolvida(q);
  // Cargo, banca e ano da questão real (QConcursos) — não revelam o assunto, então
  // aparecem aqui no misturado igual ao caderno. Fonte de texto livre fica de fora
  // para não entregar o assunto.
  const fonteQC = q.fonte && ehFonteQC(q.fonte) ? q.fonte : null;

  return (
    <li className="rounded-xl border border-line/50 bg-navy-900/40 p-3.5">
      {(mostrarMateria || fonteQC) && (
        <div className="mb-2">
          {mostrarMateria && (
            <div className="flex items-center gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-navy-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-dim">
                {materia && <span className="text-xs leading-none">{materia.icone}</span>}
                <span className="truncate">{materia?.nome ?? "Matéria"}</span>
              </span>
            </div>
          )}
          {fonteQC && <FonteQuestao fonte={fonteQC} />}
        </div>
      )}

      {q.contexto && (
        <p className="mb-2 border-l-2 border-line pl-2.5 text-xs italic leading-relaxed text-mut">
          {q.contexto}
        </p>
      )}

      <p className="text-sm leading-relaxed text-txt">{q.enunciado}</p>

      {!resolvida ? (
        <BotoesResposta questao={q} onResponder={(v) => onResponder(q, v)} />
      ) : (
        <div className="mt-3 space-y-2.5">
          <ResultadoResposta questao={q} />

          {q.comentario && (
            <div className="border-l-2 border-gold/60 pl-2.5">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                Comentário
              </p>
              <p className="text-xs leading-relaxed text-dim">{q.comentario}</p>
            </div>
          )}

          {origem && <OrigemReformulada original={origem} />}

          <div className="border-t border-line/30 pt-2.5">
            <BotaoRefazer marcada={q.refazer} onToggle={(marcar) => onRefazer(q, marcar)} />
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
            {resumindo ? (
              <Acao icone={<Spinner className="size-3.5" />} onClick={() => {}}>
                Adicionando…
              </Acao>
            ) : naResumo ? (
              <Acao icone={<Check className="size-3.5 text-green" />} ativo onClick={onVerResumo}>
                No resumo
              </Acao>
            ) : (
              <Acao icone={<NotebookPen className="size-3.5 text-gold" />} onClick={onAdicionarResumo}>
                Adicionar ao resumo
              </Acao>
            )}
            <MenuMais
              itens={[
                {
                  icone: <RotateCcw className="size-3.5" />,
                  label: "Responder de novo",
                  onClick: () => onResponder(q, null),
                },
              ]}
            />
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
