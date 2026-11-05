import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronRight, ListChecks, Printer, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Bateria, TopicoQuestao } from "@/types/db";
import {
  useBaterias,
  useExcluirBateria,
  useQuestoesDaBateria,
  useSituacaoBaterias,
  useZerarBateria,
} from "@/api/baterias";
import {
  useMarcarRefazer,
  useQuestoesPorIds,
  useResponderQuestao,
  useSalvarGrifos,
} from "@/api/topicoQuestoes";
import { useTopicos } from "@/api/topicos";
import { useMaterias } from "@/api/materias";
import { useResumosDeQuestoes, useTopicosComLei } from "@/api/topicoTextos";
import { useRegistrarClique } from "@/api/questaoLogs";
import { hojeISO, fmtData } from "@/lib/dates";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { MenuMais } from "@/components/MenuMais";
import { FullScreenSpinner } from "@/components/Spinner";
import { corDesempenho } from "@/features/conteudos/desempenho";
import { ResumoRapido } from "@/features/conteudos/ResumoRapido";
import {
  GrifosLayer,
  comCampoAtualizado,
  alternativasRiscadas,
  comAlternativasRiscadas,
  type CampoGrifavel,
  type Grifo,
} from "@/features/conteudos/grifos";
import { DuvidaIAModal } from "@/features/conteudos/DuvidaIAModal";
import { useAdicionarQuestaoAoResumo } from "@/features/conteudos/adicionarAoResumo";
import { ConferirNaLeiModal } from "@/features/conteudos/ConferirNaLeiModal";
import { EditarTrechoResumoModal } from "@/features/conteudos/EditarTrechoResumoModal";
import { idsNoResumo } from "@/features/conteudos/resumoBlocos";
import {
  acertou as questaoAcertou,
  estaResolvida,
  valorAcerta,
} from "@/features/conteudos/questaoModelo";
import { QuestaoImpressaoCard } from "@/features/impressao/ImpressaoPage";
import { FolhaImpressao } from "@/features/impressao/FolhaImpressao";
import { useOpcoesFolha } from "@/features/impressao/opcoes";
import type { MateriaImpressao } from "@/features/impressao/organizar";
import {
  avisarQuestaoRespondida,
  TemporizadorQuestao,
} from "@/features/conteudos/TemporizadorQuestao";

/**
 * Seção "Baterias": cada bateria é uma prova (ou parte dela) separada para resolver de
 * uma vez — as questões na ordem da prova, com o número dela. Resolvida no papel (o PDF
 * ou o "Imprimir" daqui), a correção é aqui pelo mesmo número, com tudo do caderno
 * (comentário, resumo, dúvida com IA). As questões continuam no caderno do assunto;
 * a bateria só as junta. Quem cria é a importação do QConcursos. Abre em aba própria.
 */
export function BateriasPage() {
  const { bateriaId } = useParams();
  return bateriaId ? <BateriaAberta bateriaId={bateriaId} /> : <ListaBaterias />;
}

function placarDe(lista: Parameters<typeof questaoAcertou>[0][]) {
  const respondidas = lista.filter((q) => estaResolvida(q));
  const acertos = respondidas.filter((q) => questaoAcertou(q)).length;
  return {
    respondidas: respondidas.length,
    acertos,
    pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
  };
}

function Cabecalho({
  titulo,
  onVoltar,
  children,
}: {
  titulo: string;
  onVoltar: () => void;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line/50 bg-navy-900/90 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3 print:hidden">
      <button
        onClick={onVoltar}
        className="shrink-0 cursor-pointer rounded-lg p-2 text-mut transition-colors hover:bg-navy-700 hover:text-txt sm:p-1.5"
        title="Voltar"
        aria-label="Voltar"
      >
        <ArrowLeft className="size-4" />
      </button>
      <ListChecks className="size-4 shrink-0 text-gold max-sm:hidden" />
      {/* No celular o nome vai em até 2 linhas: o espaço é do cronômetro e do Imprimir */}
      <h1 className="min-w-0 text-sm font-semibold leading-snug text-txt max-sm:line-clamp-2 sm:truncate sm:text-base">
        {titulo}
      </h1>
      {children}
    </header>
  );
}

/** A lista: cada bateria com o placar da correção. */
function ListaBaterias() {
  const navigate = useNavigate();
  const { data: baterias, isLoading: carregandoBaterias } = useBaterias();
  const { data: situacao, isLoading: carregandoSituacao } = useSituacaoBaterias();

  useEffect(() => {
    const anterior = document.title;
    document.title = "Baterias de questões";
    return () => {
      document.title = anterior;
    };
  }, []);

  const porBateria = useMemo(() => {
    const mapa = new Map<string, NonNullable<typeof situacao>>();
    for (const q of situacao ?? []) {
      if (!q.bateria_id) continue;
      const lista = mapa.get(q.bateria_id) ?? [];
      lista.push(q);
      mapa.set(q.bateria_id, lista);
    }
    return mapa;
  }, [situacao]);

  if (carregandoBaterias || carregandoSituacao) return <FullScreenSpinner />;

  function voltar() {
    // Aba aberta direto aqui não tem histórico: tenta fechar a aba.
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Cabecalho titulo="Baterias" onVoltar={voltar} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-24 pt-4 sm:px-6 sm:py-6">
        {!baterias?.length ? (
          <EmptyState
            icon="📋"
            title="Nenhuma bateria ainda"
            message="Uma bateria junta as questões de uma prova na ordem dela, para resolver no papel e corrigir aqui pelo número. Para criar, cole as questões do QConcursos no chat e peça para separar como bateria."
          />
        ) : (
          <ul className="space-y-2.5">
            {baterias.map((b) => (
              <ItemBateria key={b.id} bateria={b} questoes={porBateria.get(b.id) ?? []} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function ItemBateria({
  bateria: b,
  questoes,
}: {
  bateria: Bateria;
  questoes: Parameters<typeof questaoAcertou>[0][];
}) {
  const placar = placarDe(questoes);
  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;
  return (
    <li>
      <Link
        to={`/baterias/${b.id}`}
        className="flex items-center gap-3 rounded-xl border border-line/50 bg-navy-900/40 p-3.5 transition-colors hover:border-line hover:bg-navy-800/60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-txt">{b.nome}</p>
          {b.origem && <p className="mt-0.5 truncate text-[11px] text-mut">{b.origem}</p>}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
            <span className="tabular-nums">
              {questoes.length} {questoes.length === 1 ? "questão" : "questões"}
            </span>
            <span className="tabular-nums">
              Corrigidas{" "}
              <strong className="text-txt">
                {placar.respondidas}/{questoes.length}
              </strong>
            </span>
            {placar.pct !== null && cor && (
              <span className={`font-semibold tabular-nums ${cor.texto}`}>
                {placar.acertos} {placar.acertos === 1 ? "acerto" : "acertos"} · {placar.pct}%
              </span>
            )}
            <span className="text-mut">criada em {fmtData(b.created_at.slice(0, 10))}</span>
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-mut" />
      </Link>
    </li>
  );
}

/** Uma bateria aberta: a correção pelo número da prova e a folha para imprimir. */
function BateriaAberta({ bateriaId }: { bateriaId: string }) {
  const navigate = useNavigate();
  const { data: baterias, isLoading: carregandoBaterias } = useBaterias();
  const { data: questoes, isLoading: carregandoQuestoes } = useQuestoesDaBateria(bateriaId);
  const { data: topicos, isLoading: carregandoTopicos } = useTopicos();
  const { data: materias, isLoading: carregandoMaterias } = useMaterias();
  const bateria = baterias?.find((b) => b.id === bateriaId);

  const responder = useResponderQuestao();
  const marcarRefazer = useMarcarRefazer();
  const clique = useRegistrarClique();
  const salvarGrifos = useSalvarGrifos();
  const zerar = useZerarBateria();
  const excluir = useExcluirBateria();
  const [opcoes] = useOpcoesFolha();

  const [duvida, setDuvida] = useState<TopicoQuestao | null>(null);
  const [naLei, setNaLei] = useState<TopicoQuestao | null>(null);
  const [verResumoDe, setVerResumoDe] = useState<TopicoQuestao | null>(null);

  const { data: comLei } = useTopicosComLei();
  const {
    adicionar: adicionarAoResumo,
    pendenteId: resumindoId,
    adicionadas,
    esquecer,
  } = useAdicionarQuestaoAoResumo();
  const { data: resumos } = useResumosDeQuestoes();
  const idsNoBanco = useMemo(() => {
    const set = new Set<string>();
    for (const r of resumos ?? []) {
      for (const id of idsNoResumo(r.conteudo)) set.add(id);
    }
    return set;
  }, [resumos]);
  const resumoDoTopico = (tId: string) => (resumos ?? []).find((r) => r.topico_id === tId) ?? null;

  // Nome da aba; ao imprimir (ou salvar em PDF) vira o nome do arquivo.
  useEffect(() => {
    if (!bateria) return;
    const anterior = document.title;
    const naTela = `Bateria · ${bateria.nome}`;
    document.title = naTela;
    const antes = () => {
      document.title = `Bateria ${bateria.nome}`;
    };
    const depois = () => {
      document.title = naTela;
    };
    window.addEventListener("beforeprint", antes);
    window.addEventListener("afterprint", depois);
    return () => {
      window.removeEventListener("beforeprint", antes);
      window.removeEventListener("afterprint", depois);
      document.title = anterior;
    };
  }, [bateria]);

  const lista = useMemo(() => questoes ?? [], [questoes]);
  const topicoPorId = useMemo(() => new Map((topicos ?? []).map((t) => [t.id, t])), [topicos]);
  const materiaPorId = useMemo(() => new Map((materias ?? []).map((m) => [m.id, m])), [materias]);
  const numeroDe = useMemo(
    () => new Map(lista.map((q, i) => [q.id, q.bateria_numero ?? i + 1])),
    [lista]
  );

  // Originais das reformuladas (reveladas só após responder).
  const idsOriginais = useMemo(() => {
    const aqui = new Set(lista.map((q) => q.id));
    const ids = lista.map((q) => q.reformulada_de).filter((id): id is string => !!id && !aqui.has(id));
    return [...new Set(ids)];
  }, [lista]);
  const { data: originais } = useQuestoesPorIds(idsOriginais);
  const porId = useMemo(
    () => new Map([...(originais ?? []), ...lista].map((q) => [q.id, q])),
    [originais, lista]
  );

  // A folha segue a ordem da prova: um bloco por matéria seguida (numa bateria de
  // Português, um só), com a prova de origem como título.
  const folha = useMemo(() => {
    const out: MateriaImpressao[] = [];
    for (const q of lista) {
      const mId = topicoPorId.get(q.topico_id)?.materia_id ?? "";
      const ultimo = out[out.length - 1];
      if (ultimo && ultimo.materiaId === mId) {
        ultimo.assuntos[0].questoes.push(q);
        continue;
      }
      const m = materiaPorId.get(mId);
      out.push({
        materiaId: mId,
        nome: m?.nome ?? "Questões",
        icone: m?.icone ?? "📋",
        assuntos: [
          { topicoId: bateriaId, titulo: bateria?.origem ?? bateria?.nome ?? "", questoes: [q] },
        ],
      });
    }
    return out;
  }, [lista, topicoPorId, materiaPorId, bateria, bateriaId]);

  if (carregandoBaterias || carregandoQuestoes || carregandoTopicos || carregandoMaterias) {
    return <FullScreenSpinner />;
  }

  const irParaLista = () => navigate("/baterias");

  if (!bateria) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Cabecalho titulo="Baterias" onVoltar={irParaLista} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-3 pt-4 sm:px-6 sm:py-6">
          <EmptyState
            icon="📋"
            title="Bateria não encontrada"
            message="Ela pode ter sido apagada. As questões continuam no caderno de cada assunto."
            action={
              <Link to="/baterias" className="text-sm font-semibold text-gold hover:underline">
                Ver as baterias
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

  /** `valor: null` é o "responder de novo"; boolean = Certo/Errado; string = letra. */
  async function onResponder(q: TopicoQuestao, valor: boolean | string | null) {
    const estreia = valor !== null && !estaResolvida(q);
    // Igual às Questões: responder com o cronômetro de 3 min rodando pausa ele.
    if (estreia) avisarQuestaoRespondida();
    try {
      await responder.mutateAsync({
        id: q.id,
        resposta: typeof valor === "boolean" ? valor : null,
        respostaLetra: typeof valor === "string" ? valor : null,
      });
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
      erro(err);
    }
  }

  // O grifo do "Texto associado" vale para as questões da bateria com o mesmo texto.
  function aoGrifar(q: TopicoQuestao, campo: CampoGrifavel, novos: Grifo[]) {
    const irmas =
      campo === "texto_associado" && q.texto_associado
        ? lista.filter((x) => x.texto_associado === q.texto_associado)
        : [q];
    salvarGrifos.mutate({
      updates: irmas.map((x) => ({ id: x.id, grifos: comCampoAtualizado(x.grifos, campo, novos) })),
    });
  }

  function aoRiscar(q: TopicoQuestao, letra: string) {
    const atuais = new Set(alternativasRiscadas(q.grifos));
    if (atuais.has(letra)) atuais.delete(letra);
    else atuais.add(letra);
    salvarGrifos.mutate({
      updates: [{ id: q.id, grifos: comAlternativasRiscadas(q.grifos, [...atuais]) }],
    });
  }

  function zerarRespostas() {
    if (!window.confirm(`Apagar as respostas das ${lista.length} questões para resolver a bateria de novo?`)) return;
    zerar.mutate(bateriaId, {
      onSuccess: () => toast.success("Respostas zeradas — a bateria está pronta para resolver de novo"),
      onError: erro,
    });
  }

  function apagarBateria() {
    if (
      !window.confirm(
        `Apagar a bateria “${bateria!.nome}”? As questões continuam no caderno de cada assunto.`
      )
    )
      return;
    excluir.mutate(bateriaId, {
      onSuccess: () => {
        toast.success("Bateria apagada");
        navigate("/baterias");
      },
      onError: erro,
    });
  }

  const placar = placarDe(lista);
  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;

  return (
    <div className="flex min-h-dvh flex-col print:block print:min-h-0">
      <GrifosLayer />
      <Cabecalho titulo={bateria.nome} onVoltar={irParaLista}>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <TemporizadorQuestao />
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => window.print()}
            disabled={lista.length === 0}
            title="Imprimir (ou salvar em PDF) a bateria, só com as questões"
          >
            <Printer className="size-4" />
            Imprimir
          </Button>
        </div>
      </Cabecalho>

      <div className="flex-1">
        <main className="mx-auto w-full max-w-3xl space-y-4 px-3 pb-24 pt-4 sm:px-6 sm:py-6 print:hidden">
          {bateria.origem && <p className="text-xs text-mut">{bateria.origem}</p>}

          {/* Placar da correção */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line/50 bg-navy-900/60 px-3 py-2.5">
            <span className="text-xs text-dim">
              Corrigidas{" "}
              <strong className="tabular-nums text-txt">
                {placar.respondidas}/{lista.length}
              </strong>
            </span>
            {placar.pct !== null && cor && (
              <span className={`text-xs font-semibold tabular-nums ${cor.texto}`}>
                {placar.acertos} {placar.acertos === 1 ? "acerto" : "acertos"} · {placar.pct}%
              </span>
            )}
            <div className="ml-auto">
              <MenuMais
                itens={[
                  {
                    icone: <RotateCcw className="size-3.5" />,
                    label: "Zerar respostas",
                    onClick: zerarRespostas,
                  },
                  {
                    icone: <Trash2 className="size-3.5" />,
                    label: "Apagar bateria",
                    onClick: apagarBateria,
                    danger: true,
                  },
                ]}
              />
            </div>
          </div>

          {lista.length === 0 ? (
            <p className="py-8 text-center text-sm text-mut">Esta bateria está vazia.</p>
          ) : (
            <ul className="space-y-3">
              {lista.map((q) => (
                <QuestaoImpressaoCard
                  key={q.id}
                  questao={q}
                  numero={numeroDe.get(q.id) ?? 0}
                  onResponder={onResponder}
                  onGrifar={(campo, g) => aoGrifar(q, campo, g)}
                  onToggleRisco={(letra) => aoRiscar(q, letra)}
                  onRefazer={(x, marcar) =>
                    marcarRefazer.mutate({ id: x.id, refazer: marcar }, { onError: erro })
                  }
                  origem={q.reformulada_de ? porId.get(q.reformulada_de) : undefined}
                  onDuvida={() => setDuvida(q)}
                  onConferirLei={comLei?.has(q.topico_id) ? () => setNaLei(q) : undefined}
                  onAdicionarResumo={() =>
                    void adicionarAoResumo({
                      questao: q,
                      materiaNome: materiaPorId.get(topicoPorId.get(q.topico_id)?.materia_id ?? "")
                        ?.nome,
                      assunto: topicoPorId.get(q.topico_id)?.titulo,
                      destino: { topicoId: q.topico_id },
                    })
                  }
                  resumindo={resumindoId === q.id}
                  naResumo={idsNoBanco.has(q.id) || adicionadas.has(q.id)}
                  onVerResumo={() => setVerResumoDe(q)}
                />
              ))}
            </ul>
          )}
        </main>

        {/* A folha: só aparece ao imprimir, com as opções (colunas, letra) da seção Impressão */}
        <div className="hidden print:block">
          <FolhaImpressao
            materias={folha}
            numeroDe={numeroDe}
            opcoes={opcoes}
            concurso={bateria.nome}
          />
        </div>
      </div>

      <div className="print:hidden">
        <ResumoRapido />
      </div>

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
          numero={numeroDe.get(naLei.id)}
          onClose={() => setNaLei(null)}
        />
      )}

      {verResumoDe &&
        (() => {
          const resumoTexto = resumoDoTopico(verResumoDe.topico_id);
          return (
            <EditarTrechoResumoModal
              questaoId={verResumoDe.id}
              destino={{ topicoId: verResumoDe.topico_id }}
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
