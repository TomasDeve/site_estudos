import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  ListOrdered,
  MessageCircleQuestion,
  NotebookPen,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  QuestaoCategoria,
  QuestaoStatus,
  Topico,
  TopicoQuestao,
} from "@/types/db";
import {
  useCriarQuestoesEmLote,
  useExcluirQuestao,
  useMarcarRefazer,
  useResponderQuestao,
  useSetQuestaoStatus,
  useTopicoQuestoes,
} from "@/api/topicoQuestoes";
import { useTopicos } from "@/api/topicos";
import { useMaterias } from "@/api/materias";
import { useIndiceTextosDoTopico, useResumoQuestoes } from "@/api/topicoTextos";
import { useQuestaoLogsTodos, useRegistrarClique } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { Button } from "@/components/Button";
import { MenuMais } from "@/components/MenuMais";
import { FullScreenSpinner, Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { corDesempenho } from "./desempenho";
import { DesempenhoRecenteChip } from "./DesempenhoRecenteChip";
import { parsearQuestoesJson } from "./questoesJson";
import { CATEGORIAS, CATEGORIAS_FILTRO, CATEGORIA_PADRAO } from "./categorias";
import { ResumoRapido } from "./ResumoRapido";
import { DuvidaIAModal } from "./DuvidaIAModal";
import { useAdicionarQuestaoAoResumo } from "./adicionarAoResumo";
import { BotaoBloquinhos, CabecalhoBloco, RodapeBloco, useBloquinhos } from "./bloquinhos";
import { ConferirNaLeiModal } from "./ConferirNaLeiModal";
import { EditarTrechoResumoModal } from "./EditarTrechoResumoModal";
import { idsNoResumo } from "./resumoBlocos";
import { BotaoRefazer, OrigemReformulada } from "./refazer";
import { embaralhar, gerarSemente } from "./embaralhar";
import { acertou as questaoAcertou, estaResolvida, valorAcerta } from "./questaoModelo";
import { BotoesResposta, ResultadoResposta } from "./RespostaQuestao";

// "Para responder" e "Resolvidas" dividem as questões ativas pela resposta:
// o que você acabou de responder segue à mostra (para ler o comentário), mas
// na próxima visita já está guardado em "Resolvidas" — sem rolagem inútil.
type AbaCaderno = "responder" | "resolvidas" | "arquivada";

const ABAS: { chave: AbaCaderno; label: string }[] = [
  { chave: "responder", label: "Para responder" },
  { chave: "resolvidas", label: "Resolvidas" },
  { chave: "arquivada", label: "Arquivadas" },
];

/** Em qual aba a questão aparece agora (as respondidas nesta sessão ainda não "somem"). */
function abaDe(q: TopicoQuestao, respondidasAgora: ReadonlySet<string>): AbaCaderno {
  if (q.status === "arquivada") return "arquivada";
  // Respondida nesta sessão segue à mostra em "Para responder" — dá tempo de ler o
  // comentário e (se quiser) marcar para refazer antes de migrar para "Resolvidas".
  if (!estaResolvida(q) || respondidasAgora.has(q.id)) return "responder";
  return "resolvidas";
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
 * no estilo da banca (certo/errado); resolvido, abre o gabarito comentado, o
 * botão "Refazer questão futuramente" (marca para a IA reformular depois) e as
 * opções: responder de novo, arquivar ou apagar. A primeira resposta de cada
 * questão também entra no desempenho do assunto.
 */
function Caderno({ topico }: { topico: Topico }) {
  const { data: questoes, isLoading } = useTopicoQuestoes(topico.id);
  const { data: materias } = useMaterias();
  const responder = useResponderQuestao();
  const setStatus = useSetQuestaoStatus();
  const marcarRefazer = useMarcarRefazer();
  const excluir = useExcluirQuestao();
  const criarEmLote = useCriarQuestoesEmLote();
  const clique = useRegistrarClique();
  const { data: todosLogs } = useQuestaoLogsTodos();

  const [filtro, setFiltro] = useState<AbaCaderno>("responder");
  // Origens em foco (multi-seleção). Conjunto vazio = "Todas" (sem filtro); o
  // escopo mostra a união das categorias marcadas. `catImport` é o destino ao importar.
  const [cats, setCats] = useState<ReadonlySet<QuestaoCategoria>>(new Set());
  const [catImport, setCatImport] = useState<QuestaoCategoria>(CATEGORIA_PADRAO);

  /** Liga/desliga uma origem no filtro — várias podem ficar ativas ao mesmo tempo. */
  function alternarCategoria(chave: QuestaoCategoria) {
    setCats((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }

  // Ordem de exibição das questões: `null` = ordem do caderno; uma semente =
  // embaralhada. Misturar quebra sequências em que uma questão entrega a
  // resposta da seguinte; "Ordem original" volta ao natural.
  const [semente, setSemente] = useState<number | null>(null);
  function misturar() {
    setSemente(gerarSemente());
    window.scrollTo({ top: 0 });
  }
  function ordemOriginal() {
    setSemente(null);
    window.scrollTo({ top: 0 });
  }

  const [importando, setImportando] = useState(false);
  const [json, setJson] = useState("");
  const [aExcluir, setAExcluir] = useState<TopicoQuestao | null>(null);
  const [duvida, setDuvida] = useState<TopicoQuestao | null>(null);
  const [naLei, setNaLei] = useState<TopicoQuestao | null>(null);
  const [verResumoDe, setVerResumoDe] = useState<TopicoQuestao | null>(null);
  // Respondidas nesta sessão seguem em "Para responder", para dar tempo de ler
  // o gabarito comentado antes de irem para "Resolvidas".
  const [respondidasAgora, setRespondidasAgora] = useState<ReadonlySet<string>>(new Set());
  const {
    adicionar: adicionarAoResumo,
    pendenteId: resumindoId,
    adicionadas,
    esquecer,
  } = useAdicionarQuestaoAoResumo();

  // Resumo das questões deste assunto: diz quais já entraram no resumo (botão
  // "No resumo") e alimenta a edição do trecho de cada uma. Mesma query do painel.
  const { data: resumo } = useResumoQuestoes({ topicoId: topico.id });
  const idsNoBanco = useMemo(() => idsNoResumo(resumo?.conteudo), [resumo?.conteudo]);
  // Índice leve (sem o conteúdo) só para saber se há lei salva neste assunto —
  // sem texto, o "Conferir na lei" nem aparece. Já deixa o modal pronto também.
  const { data: indiceLei } = useIndiceTextosDoTopico(topico.id);
  const temLei = (indiceLei ?? []).length > 0;

  const materiaNome = (materias ?? []).find((m) => m.id === topico.materia_id)?.nome;

  const todas = useMemo(() => questoes ?? [], [questoes]);
  // Índice por id — acha a questão original de uma reformulada (revelado só após responder).
  const porId = useMemo(() => new Map(todas.map((x) => [x.id, x])), [todas]);

  // Recorte por origem: a base é a união das categorias marcadas (placar, abas e
  // numeração escopados). Conjunto vazio = "Todas" (junta tudo).
  const escopoBase = useMemo(
    () =>
      cats.size === 0
        ? todas
        : todas.filter((q) => cats.has(q.categoria as QuestaoCategoria)),
    [todas, cats]
  );

  // Ordem de exibição: a do caderno (natural) ou embaralhada por uma semente.
  // Com semente, ordena por id antes de embaralhar para a mesma semente reproduzir
  // a mesma ordem mesmo após os refetches disparados ao responder. Alimenta o resto.
  const escopo = useMemo(() => {
    if (semente === null) return escopoBase;
    return embaralhar([...escopoBase].sort((a, b) => a.id.localeCompare(b.id)), semente);
  }, [escopoBase, semente]);

  // Quantas questões há em cada categoria — número mostrado nas pílulas de filtro.
  const contagemCategoria = useMemo(() => {
    const c = { doutrina_jurisprudencia: 0, baseada_questoes: 0, ia: 0, real: 0 } as Record<
      QuestaoCategoria,
      number
    >;
    for (const q of todas) {
      const k = q.categoria as QuestaoCategoria;
      if (k in c) c[k]++;
    }
    return c;
  }, [todas]);

  // Histórico deste assunto (questao_logs) para a janela das últimas 30 questões.
  const logsDoTopico = useMemo(
    () => (todosLogs ?? []).filter((l) => l.topico_id === topico.id),
    [todosLogs, topico.id]
  );

  // Número da questão na ordem de exibição atual (do caderno ou embaralhada) da
  // categoria em foco; não muda ao trocar de aba, mas se renumera ao misturar.
  const numeroDe = useMemo(
    () => new Map(escopo.map((q, i) => [q.id, i + 1])),
    [escopo]
  );

  const contagem = useMemo(() => {
    const c: Record<AbaCaderno, number> = { responder: 0, resolvidas: 0, arquivada: 0 };
    for (const q of escopo) c[abaDe(q, respondidasAgora)]++;
    return c;
  }, [escopo, respondidasAgora]);

  // Placar considera tudo que já foi respondido na categoria em foco, em qualquer aba.
  const placar = useMemo(() => {
    const respondidas = escopo.filter((q) => estaResolvida(q));
    const acertos = respondidas.filter((q) => questaoAcertou(q)).length;
    return {
      respondidas: respondidas.length,
      acertos,
      pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
    };
  }, [escopo]);

  const lista = escopo.filter((q) => abaDe(q, respondidasAgora) === filtro);
  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;
  // Rótulo das origens marcadas (na ordem das pílulas), para o texto de "vazio".
  const catsLabel = CATEGORIAS_FILTRO.filter((c) => cats.has(c.chave))
    .map((c) => c.curto)
    .join(", ");
  // Chave estável do conjunto (ordenada) para o modo bloquinhos: resolve de 5 em 5.
  const catsKey = [...cats].sort().join(",");
  const bloco = useBloquinhos(lista, `${catsKey}:${filtro}:${semente ?? "orig"}`);

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
      setRespondidasAgora((s) => {
        const n = new Set(s);
        if (valor === null) n.delete(q.id);
        else n.add(q.id);
        return n;
      });
      // Só a estreia conta no desempenho — refazer a questão não infla a estatística.
      if (estreia && valor !== null) {
        clique.mutate({
          data: hojeISO(),
          materiaId: topico.materia_id,
          topicoId: topico.id,
          acerto: valorAcerta(q, valor),
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

  function mudarRefazer(q: TopicoQuestao, marcar: boolean) {
    marcarRefazer.mutate(
      { id: q.id, refazer: marcar },
      {
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      }
    );
  }

  async function onImportar() {
    try {
      // A ordem segue a lista inteira do assunto (todas as categorias), para não colidir.
      const ordemInicial = todas.reduce((m, q) => Math.max(m, q.ordem), -1) + 1;
      const linhas = parsearQuestoesJson(json, topico.id, ordemInicial, catImport);
      const n = await criarEmLote.mutateAsync(linhas);
      toast.success(`${n} ${n === 1 ? "questão importada" : "questões importadas"} 🎯`);
      setJson("");
      setImportando(false);
      // Leva o foco só para a categoria recém-importada, senão as novas ficariam escondidas.
      setCats(new Set([catImport]));
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
              <DesempenhoRecenteChip logs={logsDoTopico} />
              <span className="text-[11px] text-mut">
                A 1ª resposta entra no desempenho do assunto
              </span>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                {semente !== null && (
                  <button
                    onClick={ordemOriginal}
                    title="Voltar à ordem original do caderno"
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line/60 px-2.5 py-1.5 text-[11px] font-semibold text-dim transition-colors hover:border-line hover:bg-navy-700/60 hover:text-txt"
                  >
                    <ListOrdered className="size-3.5" />
                    <span className="max-sm:hidden">Ordem original</span>
                  </button>
                )}
                <button
                  onClick={misturar}
                  aria-pressed={semente !== null}
                  title={
                    semente !== null
                      ? "Embaralhar as questões de novo"
                      : "Misturar a ordem das questões (quebra sequências que entregam a resposta)"
                  }
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    semente !== null
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
                  }`}
                >
                  <Shuffle className="size-3.5" />
                  Misturar
                </button>
                <BotaoBloquinhos b={bloco} />
              </div>
            </div>
          )}

          {/* Filtro por origem — pílulas, distintas das abas de status (sublinhado).
              Dá para marcar várias ao mesmo tempo (o escopo vira a união delas);
              "Todas" limpa a seleção e junta tudo. */}
          {todas.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-mut">
                Tipo
              </span>
              <PillCategoria
                ativo={cats.size === 0}
                onClick={() => setCats(new Set())}
                label="Todas"
                contagem={todas.length}
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
                : escopo.length === 0
                  ? `Nenhuma questão em “${catsLabel}” ainda. Ajuste o filtro por tipo ou importe mais questões abaixo.`
                  : filtro === "responder"
                    ? "Tudo respondido 🎉 As já resolvidas ficam na aba “Resolvidas”."
                    : filtro === "resolvidas"
                      ? "Nenhuma questão resolvida ainda."
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
                    onRefazer={mudarRefazer}
                    origem={q.reformulada_de ? porId.get(q.reformulada_de) : undefined}
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
                    naResumo={idsNoBanco.has(q.id) || adicionadas.has(q.id)}
                    onVerResumo={() => setVerResumoDe(q)}
                  />
                ))}
              </ul>
              <RodapeBloco b={bloco} logs={logsDoTopico} />
            </div>
          )}

          {/* Entrada das questões geradas pela IA */}
          <div className="rounded-xl border border-line/50 bg-navy-900/60">
            <button
              onClick={() => {
                // Ao abrir, se há exatamente uma origem em foco e ela é produzível
                // pela IA (não "real"), sugere-a como destino da leva.
                if (!importando && cats.size === 1) {
                  const [unica] = [...cats];
                  if (CATEGORIAS.some((c) => c.chave === unica)) setCatImport(unica);
                }
                setImportando((v) => !v);
              }}
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
                  <code className="text-dim">fonte</code>. A categoria abaixo vale para toda a
                  leva (cada questão pode sobrescrever com um campo{" "}
                  <code className="text-dim">tipo</code>).
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-mut">Categoria destas questões:</span>
                  {CATEGORIAS.map((c) => (
                    <PillCategoria
                      key={c.chave}
                      ativo={catImport === c.chave}
                      onClick={() => setCatImport(c.chave)}
                      label={c.curto}
                      title={c.label}
                    />
                  ))}
                </div>
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

      {verResumoDe && (
        <EditarTrechoResumoModal
          questaoId={verResumoDe.id}
          destino={{ topicoId: topico.id }}
          resumoTextoId={resumo?.id}
          conteudoBanco={resumo?.conteudo ?? ""}
          onRemovido={() => esquecer(verResumoDe.id)}
          onClose={() => setVerResumoDe(null)}
        />
      )}
    </>
  );
}

interface CardProps {
  questao: TopicoQuestao;
  numero: number;
  onResponder: (q: TopicoQuestao, valor: boolean | string | null) => void;
  onStatus: (q: TopicoQuestao, status: QuestaoStatus, aviso: string) => void;
  onRefazer: (q: TopicoQuestao, marcar: boolean) => void;
  /** A questão original, quando esta é uma reformulação (revelada só após responder). */
  origem?: TopicoQuestao;
  onExcluir: () => void;
  onDuvida: () => void;
  /** Ausente quando o assunto não tem nenhum texto de lei salvo. */
  onConferirLei?: () => void;
  onAdicionarResumo: () => void;
  resumindo: boolean;
  /** A questão já tem um trecho no resumo — o botão vira "No resumo". */
  naResumo: boolean;
  onVerResumo: () => void;
}

/**
 * Quebra a fonte de uma questão do QConcursos nas suas partes. Formato canônico:
 * "QConcursos — Q{id} (BANCA) · {ano} · {cargo}" — mas é tolerante às variações antigas
 * ("Q{id} (BANCA)" e "Q{id} (BANCA) · {cargo} · C/E {X}"): extrai o que houver.
 */
function parseFonteQC(fonte: string) {
  const codM = fonte.match(/Q(\d+)/);
  const codigo = codM ? codM[0] : null; // "Q4023266" (só a parte numérica; ignora sufixo "-a")
  const id = codM ? codM[1] : null;
  const bancaM = fonte.match(/\(([^)]+)\)/); // primeiro parêntese = banca
  const banca = bancaM ? bancaM[1].trim() : null;
  // ano: primeiro "19xx/20xx" fora do código Q (assim o ID numérico não vira "ano")
  const anoM = (codigo ? fonte.replace(codigo, "") : fonte).match(/\b(?:19|20)\d{2}\b/);
  const ano = anoM ? anoM[0] : null;
  // cargo: o que vem depois do parêntese da banca, sem ano, sem marcador C/E e sem separadores
  let cargo: string | null = null;
  if (bancaM) {
    let depois = fonte.slice((bancaM.index ?? 0) + bancaM[0].length);
    depois = depois.replace(/\s*·?\s*(?:C\/E|item)\b.*$/i, ""); // tira "· C/E A" / "· item I"
    if (ano) depois = depois.replace(ano, "");
    cargo =
      depois.replace(/^[\s·\-–—]+/, "").replace(/[\s·\-–—]+$/, "").replace(/\s{2,}/g, " ").trim() ||
      null;
  }
  return { codigo, id, banca, ano, cargo };
}

/**
 * Linha de origem da questão. Em questões do QConcursos mostra "ano (BANCA) - cargo" e torna o
 * "Q{id}" um link que PESQUISA a questão no Google: a URL direta do QConcursos usa um slug
 * interno (ex.: /questoes/776a040b-43) que não dá pra montar a partir do ID numérico, então a
 * busca pelo "Q{id}" cai na página certa.
 */
function FonteQuestao({ fonte }: { fonte: string }) {
  const { codigo, id, banca, ano, cargo } = parseFonteQC(fonte);
  if (!id || !codigo) {
    return <p className="mt-1 text-[10px] leading-relaxed text-mut">{fonte}</p>;
  }
  const prefixo = fonte.slice(0, fonte.indexOf(codigo)); // "QConcursos — "
  const cabecalho = [ano, banca ? `(${banca})` : null].filter(Boolean).join(" "); // "2026 (BANCA)"
  const meta = [cabecalho || null, cargo].filter(Boolean).join(" - "); // "2026 (BANCA) - Cargo"
  return (
    <p className="mt-1 text-[10px] leading-relaxed text-mut">
      {prefixo}
      <a
        href={`https://www.google.com/search?q=${encodeURIComponent(codigo)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-cyan hover:underline"
        title="Pesquisar esta questão no Google (a busca leva à página do QConcursos)"
      >
        {codigo}
        <ExternalLink className="ml-0.5 inline size-2.5 align-[-1px]" />
      </a>
      {meta && ` · ${meta}`}
    </p>
  );
}

function QuestaoCard({
  questao: q,
  numero,
  onResponder,
  onStatus,
  onRefazer,
  origem,
  onExcluir,
  onDuvida,
  onConferirLei,
  onAdicionarResumo,
  resumindo,
  naResumo,
  onVerResumo,
}: CardProps) {
  const resolvida = estaResolvida(q);
  const status = q.status as QuestaoStatus;

  return (
    <li className="group/q rounded-xl border border-line/50 bg-navy-900/40 p-3.5">
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-mut">
            Questão {numero}
          </span>
          {status === "arquivada" && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mut">
              Arquivada
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
        {q.fonte && <FonteQuestao fonte={q.fonte} />}
      </div>

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
            {resumindo ? (
              <AcaoQuestao icone={<Spinner className="size-3.5" />} onClick={() => {}}>
                Adicionando…
              </AcaoQuestao>
            ) : naResumo ? (
              <AcaoQuestao
                icone={<Check className="size-3.5 text-green" />}
                ativo
                onClick={onVerResumo}
              >
                No resumo
              </AcaoQuestao>
            ) : (
              <AcaoQuestao
                icone={<NotebookPen className="size-3.5 text-gold" />}
                onClick={onAdicionarResumo}
              >
                Adicionar ao resumo
              </AcaoQuestao>
            )}
            <MenuMais
              itens={[
                {
                  icone: <RotateCcw className="size-3.5" />,
                  label: "Responder de novo",
                  onClick: () => onResponder(q, null),
                },
                status === "arquivada"
                  ? {
                      icone: <ArchiveRestore className="size-3.5" />,
                      label: "Desarquivar",
                      onClick: () => onStatus(q, "ativa", "Questão desarquivada."),
                    }
                  : {
                      icone: <Archive className="size-3.5" />,
                      label: "Arquivar",
                      onClick: () => onStatus(q, "arquivada", "Questão arquivada."),
                    },
              ]}
            />
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

/** Pílula de filtro por categoria — usada no topo do caderno e no seletor de importação. */
export function PillCategoria({
  ativo,
  onClick,
  label,
  title,
  contagem,
}: {
  ativo: boolean;
  onClick: () => void;
  label: string;
  title?: string;
  contagem?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={ativo}
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        ativo
          ? "border-gold/40 bg-gold/15 text-gold"
          : "border-line/60 text-mut hover:border-line hover:bg-navy-700/60 hover:text-dim"
      }`}
    >
      {label}
      {contagem !== undefined && <span className="tabular-nums opacity-70">{contagem}</span>}
    </button>
  );
}
