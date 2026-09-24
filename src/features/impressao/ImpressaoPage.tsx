import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  MessageCircleQuestion,
  NotebookPen,
  Printer,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { TopicoQuestao } from "@/types/db";
import {
  useMarcarRefazer,
  useQuestoesImpressao,
  useQuestoesPorIds,
  useResponderQuestao,
  useSalvarGrifos,
  useSalvarImpressao,
} from "@/api/topicoQuestoes";
import { useTopicos } from "@/api/topicos";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { concursoDeEstudo, useConcursos } from "@/api/concursos";
import { useResumosDeQuestoes, useTopicosComLei } from "@/api/topicoTextos";
import { useRegistrarClique } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { MenuMais } from "@/components/MenuMais";
import { FullScreenSpinner, Spinner } from "@/components/Spinner";
import { corDesempenho } from "@/features/conteudos/desempenho";
import { ResumoRapido } from "@/features/conteudos/ResumoRapido";
import { TextoAssociado } from "@/features/conteudos/TextoAssociado";
import {
  Grifavel,
  GrifosLayer,
  grifosDoCampo,
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
import { BotaoRefazer, OrigemReformulada } from "@/features/conteudos/refazer";
import { AcaoQuestao, FonteQuestao, PillCategoria } from "@/features/conteudos/QuestoesPage";
import {
  acertou as questaoAcertou,
  estaResolvida,
  valorAcerta,
} from "@/features/conteudos/questaoModelo";
import { BotoesResposta, ResultadoResposta } from "@/features/conteudos/RespostaQuestao";
import { CaixaImpressao } from "./CaixaImpressao";
import { FolhaImpressao } from "./FolhaImpressao";
import { useOpcoesFolha, type OpcoesFolha, type TamanhoLetra } from "./opcoes";
import {
  agruparEmSequencia,
  numerarImpressao,
  ordenarParaImpressao,
  type MateriaImpressao,
} from "./organizar";

type Aba = "todas" | "novas" | "corrigir" | "corrigidas";

const ABAS: { chave: Aba; label: string }[] = [
  { chave: "todas", label: "Todas" },
  { chave: "novas", label: "Não impressas" },
  { chave: "corrigir", label: "Para corrigir" },
  { chave: "corrigidas", label: "Corrigidas" },
];

const LETRAS: { chave: TamanhoLetra; label: string; dica: string }[] = [
  { chave: "p", label: "P", dica: "Letra pequena — cabe mais por página" },
  { chave: "m", label: "M", dica: "Letra média" },
  { chave: "g", label: "G", dica: "Letra grande — mais confortável de ler" },
];

/**
 * Seção "Impressão": junta as questões marcadas pela caixinha 🖨 (em qualquer caderno)
 * e as organiza como uma prova — matéria → assunto → ordem do caderno — numa folha só
 * com as questões, pronta para imprimir. Resolvidas no papel, voltam aqui para a
 * correção, que tem o mesmo que o caderno (responder, comentário, resumo, dúvida com IA,
 * conferir na lei, refazer). O número de cada questão é gravado na hora de imprimir e
 * não muda mais, então a tela sempre bate com o papel. Os filtros de matéria e de
 * situação valem para a tela E para o que vai ao papel. Abre em aba própria.
 */
export function ImpressaoPage() {
  const navigate = useNavigate();
  const { data: questoes, isLoading: carregandoQuestoes } = useQuestoesImpressao();
  const { data: topicos, isLoading: carregandoTopicos } = useTopicos();
  const { data: materias, isLoading: carregandoMaterias } = useMaterias();
  const { data: concursos, isLoading: carregandoConcursos } = useConcursos();
  const { data: vinculos, isLoading: carregandoVinculos } = useConcursoMaterias();

  const responder = useResponderQuestao();
  const marcarRefazer = useMarcarRefazer();
  const salvarImpressao = useSalvarImpressao();
  const clique = useRegistrarClique();
  const salvarGrifos = useSalvarGrifos();

  const [opcoes, mudarOpcoes] = useOpcoesFolha();
  const [previa, setPrevia] = useState(false);
  const [aba, setAba] = useState<Aba>("todas");
  // Matérias em foco (multi-seleção). Conjunto vazio = "Todas".
  const [mats, setMats] = useState<ReadonlySet<string>>(new Set());
  // Respondidas nesta sessão seguem em "Para corrigir", para dar tempo de ler o
  // comentário antes de irem para "Corrigidas".
  const [respondidasAgora, setRespondidasAgora] = useState<ReadonlySet<string>>(new Set());
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
  // Todos os resumos de questões: a nota de cada questão vai para o resumo do assunto
  // dela (o botão "No resumo" varre todos), como no modo misturado.
  const { data: resumos } = useResumosDeQuestoes();
  const idsNoBanco = useMemo(() => {
    const set = new Set<string>();
    for (const r of resumos ?? []) {
      for (const id of idsNoResumo(r.conteudo)) set.add(id);
    }
    return set;
  }, [resumos]);
  const resumoDoTopico = (tId: string) => (resumos ?? []).find((r) => r.topico_id === tId) ?? null;

  // Na hora de imprimir (botão ou Ctrl+P), grava os números das questões da folha.
  const congelarNumeros = useRef<() => void>(() => {});

  // Nome da aba; ao imprimir (ou salvar em PDF) vira o nome do arquivo.
  useEffect(() => {
    const anterior = document.title;
    const naTela = "Impressão · questões marcadas";
    const noPapel = `Caderno de questões ${hojeISO().split("-").reverse().join("-")}`;
    document.title = naTela;
    const antes = () => {
      document.title = noPapel;
      congelarNumeros.current();
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
  }, []);

  const concursoAtivo = useMemo(() => concursoDeEstudo(concursos ?? []), [concursos]);
  const topicoPorId = useMemo(() => new Map((topicos ?? []).map((t) => [t.id, t])), [topicos]);
  const materiaPorId = useMemo(() => new Map((materias ?? []).map((m) => [m.id, m])), [materias]);

  // Desmarcar aqui tira a questão da lista na hora: no cache ela fica com `imprimir_em` nulo.
  const marcadas = useMemo(() => (questoes ?? []).filter((q) => q.imprimir_em), [questoes]);

  // Ordem de prova, pela ordem do edital do concurso em estudo.
  const ordemProva = useMemo(
    () =>
      ordenarParaImpressao(
        marcadas,
        topicos ?? [],
        materias ?? [],
        (vinculos ?? []).filter((v) => v.concurso_id === concursoAtivo?.id)
      ),
    [marcadas, topicos, materias, vinculos, concursoAtivo?.id]
  );

  // Originais das reformuladas (reveladas só após responder): as que não estão
  // marcadas vêm do banco pelo id.
  const idsOriginais = useMemo(() => {
    const marc = new Set(marcadas.map((q) => q.id));
    const ids = marcadas
      .map((q) => q.reformulada_de)
      .filter((id): id is string => !!id && !marc.has(id));
    return [...new Set(ids)];
  }, [marcadas]);
  const { data: originais } = useQuestoesPorIds(idsOriginais);
  const porId = useMemo(
    () => new Map([...(originais ?? []), ...marcadas].map((q) => [q.id, q])),
    [originais, marcadas]
  );

  // Matérias com questões marcadas, na ordem de prova — as pílulas do filtro.
  const materiasMarcadas = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const q of ordemProva) {
      const id = topicoPorId.get(q.topico_id)?.materia_id ?? "";
      contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }
    return [...contagem].map(([id, total]) => ({ id, total, materia: materiaPorId.get(id) }));
  }, [ordemProva, topicoPorId, materiaPorId]);

  // Recorte por matéria: a base do placar e das contagens das abas.
  const base = useMemo(
    () =>
      mats.size === 0
        ? ordemProva
        : ordemProva.filter((q) => mats.has(topicoPorId.get(q.topico_id)?.materia_id ?? "")),
    [ordemProva, mats, topicoPorId]
  );

  // O que aparece (e vai ao papel): o recorte por matéria e pela aba de situação,
  // na ordem dos números — os já impressos com o número gravado, os novos em seguida.
  const { visiveis, numeroDe, contagem } = useMemo(() => {
    const paraCorrigir = (q: TopicoQuestao) => !estaResolvida(q) || respondidasAgora.has(q.id);
    const naAba = (q: TopicoQuestao) =>
      aba === "todas" ||
      (aba === "novas" && q.impressao_numero == null) ||
      (aba === "corrigir" && paraCorrigir(q)) ||
      (aba === "corrigidas" && !paraCorrigir(q));
    const naTela = new Set(base.filter(naAba).map((q) => q.id));
    const { ordem, numeroDe } = numerarImpressao(ordemProva, (q) => naTela.has(q.id));
    const corrigir = base.filter(paraCorrigir).length;
    return {
      visiveis: ordem.filter((q) => naTela.has(q.id)),
      numeroDe,
      contagem: {
        todas: base.length,
        novas: base.filter((q) => q.impressao_numero == null).length,
        corrigir,
        corrigidas: base.length - corrigir,
      } satisfies Record<Aba, number>,
    };
  }, [base, ordemProva, aba, respondidasAgora]);

  // Na tela, as já impressas vêm primeiro; as ainda não impressas, separadas logo abaixo.
  const grupos = useMemo(() => {
    const agrupar = (lista: TopicoQuestao[]) =>
      agruparEmSequencia(lista, topicos ?? [], materias ?? []);
    return {
      folha: agrupar(visiveis),
      impressas: agrupar(visiveis.filter((q) => q.impressao_numero != null)),
      novas: agrupar(visiveis.filter((q) => q.impressao_numero == null)),
    };
  }, [visiveis, topicos, materias]);

  // Placar da correção: tudo que já foi respondido no recorte, em qualquer aba.
  const placar = useMemo(() => {
    const respondidas = base.filter((q) => estaResolvida(q));
    const acertos = respondidas.filter((q) => questaoAcertou(q)).length;
    return {
      respondidas,
      acertos,
      pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
    };
  }, [base]);

  // As novas que estão na folha gravam o número que receberam; a partir daí ele não
  // muda mais (desmarcar ou marcar outras não renumera o que já está no papel).
  useEffect(() => {
    congelarNumeros.current = () => {
      const novas = visiveis.filter((q) => q.impressao_numero == null);
      if (novas.length === 0) return;
      salvarImpressao.mutate(
        {
          itens: novas.map((q) => ({
            questao: q,
            imprimir_em: q.imprimir_em,
            impressao_numero: numeroDe.get(q.id) ?? null,
          })),
        },
        {
          onError: () =>
            toast.error(
              "Não consegui gravar a numeração desta folha. Confira os números antes de corrigir."
            ),
        }
      );
    };
  });

  if (
    carregandoQuestoes ||
    carregandoTopicos ||
    carregandoMaterias ||
    carregandoConcursos ||
    carregandoVinculos
  ) {
    return <FullScreenSpinner />;
  }

  function voltar() {
    // Aba aberta direto na impressão não tem histórico: tenta fechar a aba.
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  function alternarMateria(id: string) {
    setMats((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function erro(err: unknown) {
    toast.error(err instanceof Error ? err.message : String(err));
  }

  // Não se perde nada ao desmarcar: o aviso traz o "Desfazer", que devolve a marca e o
  // número da folha de cada uma.
  function desmarcar(lista: TopicoQuestao[], aviso: string) {
    if (lista.length === 0) return;
    salvarImpressao.mutate(
      { itens: lista.map((q) => ({ questao: q, imprimir_em: null, impressao_numero: null })) },
      {
        onSuccess: () =>
          toast.success(aviso, {
            action: {
              label: "Desfazer",
              onClick: () =>
                salvarImpressao.mutate(
                  {
                    itens: lista.map((q) => ({
                      questao: q,
                      imprimir_em: q.imprimir_em,
                      impressao_numero: q.impressao_numero,
                    })),
                  },
                  { onError: erro }
                ),
            },
          }),
        onError: erro,
      }
    );
  }

  /**
   * `valor: null` é o "responder de novo": limpa a resposta e devolve a questão ao início.
   * boolean = Certo/Errado; string = letra marcada na múltipla escolha.
   */
  async function onResponder(q: TopicoQuestao, valor: boolean | string | null) {
    const estreia = valor !== null && !estaResolvida(q);
    setRespondidasAgora((s) => {
      const n = new Set(s);
      if (valor === null) n.delete(q.id);
      else n.add(q.id);
      return n;
    });
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
      setRespondidasAgora((s) => {
        const n = new Set(s);
        if (valor === null) n.add(q.id);
        else n.delete(q.id);
        return n;
      });
      erro(err);
    }
  }

  // Grifo do enunciado é da questão; o do "Texto associado" vale para as questões
  // marcadas com o mesmo texto (as irmãs que estão nesta lista).
  function aoGrifar(q: TopicoQuestao, campo: CampoGrifavel, novos: Grifo[]) {
    if (campo === "texto_associado" && q.texto_associado) {
      const irmas = marcadas.filter((x) => x.texto_associado === q.texto_associado);
      salvarGrifos.mutate({
        updates: (irmas.length ? irmas : [q]).map((x) => ({
          id: x.id,
          grifos: comCampoAtualizado(x.grifos, "texto_associado", novos),
        })),
      });
      return;
    }
    salvarGrifos.mutate({
      updates: [{ id: q.id, grifos: comCampoAtualizado(q.grifos, campo, novos) }],
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

  function mudarRefazer(q: TopicoQuestao, marcar: boolean) {
    marcarRefazer.mutate({ id: q.id, refazer: marcar }, { onError: erro });
  }

  const cor = placar.pct !== null ? corDesempenho(placar.pct) : null;
  // A aba "Não impressas" só aparece quando separa algo (parte já foi impressa).
  const abas = ABAS.filter(
    (a) =>
      a.chave !== "novas" ||
      aba === "novas" ||
      (contagem.novas > 0 && contagem.novas < contagem.todas)
  );

  /** Títulos de matéria e assunto e, dentro, os cards — na ordem dos números. */
  function secoes(lista: MateriaImpressao[], parte: string) {
    return lista.map((m, i) => (
      <section key={`${parte}-${m.materiaId}-${i}`} className="space-y-3">
        <h2 className="flex items-center gap-2 border-b border-line/40 pb-2 pt-1 text-sm font-bold text-txt">
          <span className="text-base leading-none">{m.icone}</span>
          <span className="min-w-0 flex-1 truncate">{m.nome}</span>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-mut">
            {m.assuntos.reduce((s, a) => s + a.questoes.length, 0)}
          </span>
        </h2>
        {m.assuntos.map((a) => (
          <div key={a.questoes[0].id} className="space-y-2">
            <h3 className="px-0.5 text-[11px] font-bold uppercase tracking-wide text-gold/90">
              {a.titulo}
            </h3>
            <ul className="space-y-3">
              {a.questoes.map((q) => (
                <QuestaoImpressaoCard
                  key={q.id}
                  questao={q}
                  numero={numeroDe.get(q.id) ?? 0}
                  onResponder={onResponder}
                  onGrifar={(campo, g) => aoGrifar(q, campo, g)}
                  onToggleRisco={(letra) => aoRiscar(q, letra)}
                  onRefazer={mudarRefazer}
                  onTirar={() =>
                    desmarcar([q], `Questão ${numeroDe.get(q.id)} desmarcada da impressão`)
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
          </div>
        ))}
      </section>
    ));
  }

  return (
    // Na impressão a página vira bloco comum: como item de flex, a folha era medida antes
    // da paginação (colunas em sequência contadas como uma só) e sobravam folhas em branco.
    <div className="flex min-h-dvh flex-col print:block print:min-h-0">
      <GrifosLayer />
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-line/50 bg-navy-900/90 px-4 py-3 backdrop-blur-sm print:hidden">
        <button
          onClick={voltar}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-mut transition-colors hover:bg-navy-700 hover:text-txt"
          title="Voltar"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
        <Printer className="size-4 shrink-0 text-gold" />
        <h1 className="min-w-0 truncate text-base font-semibold text-txt">Impressão</h1>
        {marcadas.length > 0 && (
          <span className="shrink-0 text-xs tabular-nums text-mut max-sm:hidden">
            {marcadas.length} {marcadas.length === 1 ? "marcada" : "marcadas"}
          </span>
        )}
        <Button
          size="sm"
          className="ml-auto shrink-0"
          onClick={() => window.print()}
          disabled={visiveis.length === 0}
          title="Imprimir (ou salvar em PDF) as questões mostradas"
        >
          <Printer className="size-4" />
          Imprimir <span className="tabular-nums">({visiveis.length})</span>
        </Button>
      </header>

      <div className="flex-1">
        <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6 print:hidden">
          {marcadas.length === 0 ? (
            <EmptyState
              icon="🖨️"
              title="Nenhuma questão marcada para impressão"
              message="Marque a caixinha 🖨 no canto de qualquer questão — no caderno do assunto ou nas Questões misturadas. Ela aparece aqui organizada por matéria e assunto, pronta para imprimir e, depois, para corrigir."
              action={
                <a
                  href="/questoes"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-gold hover:underline"
                >
                  Abrir as questões
                </a>
              }
            />
          ) : (
            <div className="space-y-4">
              <PainelFolha
                opcoes={opcoes}
                onMudar={mudarOpcoes}
                previa={previa}
                onPrevia={() => setPrevia((v) => !v)}
              />

              {/* Placar da correção + limpeza da lista */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line/50 bg-navy-900/60 px-3 py-2.5">
                <span className="text-xs text-dim">
                  Corrigidas{" "}
                  <strong className="tabular-nums text-txt">
                    {placar.respondidas.length}/{base.length}
                  </strong>
                </span>
                {placar.pct !== null && cor && (
                  <span className={`text-xs font-semibold tabular-nums ${cor.texto}`}>
                    {placar.acertos} {placar.acertos === 1 ? "acerto" : "acertos"} · {placar.pct}%
                  </span>
                )}
                <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
                  {placar.respondidas.length > 0 && (
                    <BotaoLimpar
                      onClick={() =>
                        desmarcar(
                          placar.respondidas,
                          `${placar.respondidas.length} ${
                            placar.respondidas.length === 1 ? "corrigida desmarcada" : "corrigidas desmarcadas"
                          } da impressão`
                        )
                      }
                      title="Tira da impressão as questões que você já corrigiu (as outras mantêm o número)"
                    >
                      Desmarcar corrigidas
                    </BotaoLimpar>
                  )}
                  <BotaoLimpar
                    onClick={() =>
                      desmarcar(
                        base,
                        `${base.length} ${
                          base.length === 1 ? "questão desmarcada" : "questões desmarcadas"
                        } da impressão`
                      )
                    }
                    title="Esvazia a lista de impressão (das matérias em foco)"
                  >
                    Desmarcar todas
                  </BotaoLimpar>
                </div>
              </div>

              {/* Filtro por matéria — várias ao mesmo tempo; "Todas" limpa */}
              {materiasMarcadas.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-mut">
                    Matéria
                  </span>
                  <PillCategoria
                    ativo={mats.size === 0}
                    onClick={() => setMats(new Set())}
                    label="Todas"
                    contagem={marcadas.length}
                  />
                  {materiasMarcadas.map((m) => (
                    <PillCategoria
                      key={m.id}
                      ativo={mats.has(m.id)}
                      onClick={() => alternarMateria(m.id)}
                      label={m.materia ? `${m.materia.icone} ${m.materia.nome}` : "Outras"}
                      contagem={m.total}
                    />
                  ))}
                </div>
              )}

              {/* Situação — o que aparece e vai para o papel */}
              <div className="flex gap-1 overflow-x-auto border-b border-line/40 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {abas.map((a) => (
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

              {visiveis.length === 0 ? (
                <p className="py-8 text-center text-sm text-mut">
                  {base.length === 0
                    ? "Nenhuma questão marcada nas matérias escolhidas."
                    : aba === "novas"
                      ? "Todas as marcadas já foram impressas."
                      : aba === "corrigir"
                        ? "Tudo corrigido 🎉 As já respondidas ficam na aba “Corrigidas”."
                        : "Nenhuma questão corrigida ainda. Resolva no papel e responda aqui para corrigir."}
                </p>
              ) : (
                !previa && (
                  <>
                    {secoes(grupos.impressas, "impressas")}
                    {grupos.impressas.length > 0 && grupos.novas.length > 0 && (
                      <div className="flex items-center gap-3 pt-2">
                        <span className="h-px flex-1 bg-line/50" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                          Ainda não impressas
                        </span>
                        <span className="h-px flex-1 bg-line/50" />
                      </div>
                    )}
                    {secoes(grupos.novas, "novas")}
                  </>
                )
              )}
            </div>
          )}
        </main>

        {/* A folha: escondida na tela (salvo na prévia), é o que sai na impressão */}
        <div className={previa && visiveis.length > 0 ? "px-2 pb-24 sm:px-6 print:p-0" : "hidden print:block"}>
          <p className="mx-auto mb-2 max-w-[210mm] px-1 text-[11px] text-mut print:hidden">
            Prévia aproximada: a quebra das páginas e das colunas (a 1ª enche antes da 2ª)
            aparece exata na janela de impressão.
          </p>
          <FolhaImpressao
            materias={grupos.folha}
            numeroDe={numeroDe}
            opcoes={opcoes}
            concurso={concursoAtivo?.nome_curto ?? concursoAtivo?.nome}
          />
        </div>
      </div>

      {/* Bloco de resumo sempre à mão — escolhe a matéria onde a nota entra */}
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

/** Opções da folha (colunas e tamanho da letra) e a prévia. Só as questões vão ao papel. */
function PainelFolha({
  opcoes,
  onMudar,
  previa,
  onPrevia,
}: {
  opcoes: OpcoesFolha;
  onMudar: (mudanca: Partial<OpcoesFolha>) => void;
  previa: boolean;
  onPrevia: () => void;
}) {
  return (
    <div className="space-y-2.5 rounded-xl border border-line/50 bg-navy-900/60 px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-dim">Folha de impressão</span>
        <button
          onClick={onPrevia}
          aria-pressed={previa}
          title={previa ? "Voltar a corrigir as questões" : "Ver como a folha vai sair no papel"}
          className={`ml-auto flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
            previa
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
          }`}
        >
          {previa ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {previa ? "Voltar às questões" : "Ver prévia"}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2.5">
        <Opcao rotulo="Colunas">
          {([2, 1] as const).map((n) => (
            <PillCategoria
              key={n}
              ativo={opcoes.colunas === n}
              onClick={() => onMudar({ colunas: n })}
              label={n === 1 ? "1 coluna" : "2 colunas"}
              title={n === 2 ? "Duas colunas por página — economiza papel" : "Uma coluna, leitura corrida"}
            />
          ))}
        </Opcao>
        <Opcao rotulo="Letra">
          {LETRAS.map((l) => (
            <PillCategoria
              key={l.chave}
              ativo={opcoes.letra === l.chave}
              onClick={() => onMudar({ letra: l.chave })}
              label={l.label}
              title={l.dica}
            />
          ))}
        </Opcao>
      </div>
      <p className="text-[11px] leading-relaxed text-mut">
        Sai só com as questões, sem gabarito. Resolvido no papel, corrija aqui pelo mesmo número:
        a resposta e o comentário aparecem ao responder.
      </p>
    </div>
  );
}

function Opcao({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-mut">
        {rotulo}
      </span>
      {children}
    </div>
  );
}

function BotaoLimpar({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="shrink-0 cursor-pointer rounded-lg border border-line/60 px-2.5 py-1.5 text-[11px] font-semibold text-dim transition-colors hover:border-line hover:bg-navy-700/60 hover:text-txt"
    >
      {children}
    </button>
  );
}

interface CardProps {
  questao: TopicoQuestao;
  numero: number;
  onResponder: (q: TopicoQuestao, valor: boolean | string | null) => void;
  /** Grava um grifo do aluno (o do texto associado vale para as irmãs marcadas). */
  onGrifar: (campo: CampoGrifavel, novos: Grifo[]) => void;
  /** Risca/desrisca (elimina) uma alternativa da múltipla escolha. */
  onToggleRisco: (letra: string) => void;
  onRefazer: (q: TopicoQuestao, marcar: boolean) => void;
  /** Desmarca a questão da impressão (a caixinha, já marcada aqui). */
  onTirar: () => void;
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

/** Card da correção: o número da folha no topo e, depois de responder, tudo do caderno. */
function QuestaoImpressaoCard({
  questao: q,
  numero,
  onResponder,
  onGrifar,
  onToggleRisco,
  onRefazer,
  onTirar,
  origem,
  onDuvida,
  onConferirLei,
  onAdicionarResumo,
  resumindo,
  naResumo,
  onVerResumo,
}: CardProps) {
  const resolvida = estaResolvida(q);

  return (
    <li className="rounded-xl border border-line/50 bg-navy-900/40 p-3.5">
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-mut">
            Questão {numero}
          </span>
          {q.status === "arquivada" && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mut">
              Arquivada
            </span>
          )}
          <CaixaImpressao className="ml-auto" marcada onToggle={onTirar} />
        </div>
        {q.fonte && <FonteQuestao fonte={q.fonte} />}
      </div>

      <TextoAssociado
        qid={q.id}
        texto={q.texto_associado}
        grifos={grifosDoCampo(q.grifos, "texto_associado")}
        onChange={(g) => onGrifar("texto_associado", g)}
      />

      {q.contexto && (
        <p className="mb-2 whitespace-pre-wrap border-l-2 border-line pl-2.5 text-xs italic leading-relaxed text-mut">
          {q.contexto}
        </p>
      )}

      <Grifavel
        qid={q.id}
        campo="enunciado"
        className="whitespace-pre-wrap text-sm leading-relaxed text-txt"
        partes={[{ tipo: "texto", texto: q.enunciado, base: 0 }]}
        grifos={grifosDoCampo(q.grifos, "enunciado")}
        onChange={(g) => onGrifar("enunciado", g)}
      />

      {!resolvida ? (
        <BotoesResposta
          questao={q}
          onResponder={(v) => onResponder(q, v)}
          onToggleRisco={onToggleRisco}
        />
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
              <AcaoQuestao icone={<Check className="size-3.5 text-green" />} ativo onClick={onVerResumo}>
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
              ]}
            />
          </div>
        </div>
      )}
    </li>
  );
}
