import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Eye, EyeOff, PenLine, RotateCcw, Shuffle, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RedacaoParagrafo } from "@/types/db";
import {
  corrigirParagrafo,
  useExcluirParagrafo,
  useGastoIAMes,
  useParagrafosRecentes,
  useSalvarParagrafo,
  type CorrecaoParagrafo,
} from "@/api/paragrafos";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  TEMAS,
  CARACTERES_POR_LINHA,
  TIPOS,
  aberturaDoParagrafo,
  embasamentoDoParagrafo,
  linhasNaFolha,
  modeloDoParagrafo,
  notaDoConceito,
  notaFinal,
  pontosDoParagrafo,
  sortear,
  type Sorteio,
  type TipoParagrafo,
} from "./paragrafos";
import { Correcao, GastoIA, Proposta, Secao, corDaNota, fmtTempo, fmtUSD } from "./partes";
import { Repertorio } from "./repertorio";
import { FolhaRedacao } from "./FolhaRedacao";
import { NIVEIS, PARAGRAFOS_POR_MES, useNivelCorrecao, type NivelCorrecao } from "./modelos";

/** Um parágrafo corrigido em tela (o que acabou de sair da IA ou um do histórico). */
interface Resultado {
  /** Linha do histórico (chega quando o salvamento termina; do histórico já vem pronta). */
  id?: string;
  correcao: CorrecaoParagrafo;
  texto: string;
  nota: number;
  notaConteudo: number;
  linhas: number;
  segundos: number | null;
}

type Etapa =
  | { tipo: "inicio" }
  | { tipo: "escrevendo"; sorteio: Sorteio }
  | { tipo: "corrigido"; sorteio: Sorteio; resultado: Resultado; doHistorico: boolean };

// Rascunho do parágrafo em andamento: recarregar a aba não perde o que foi escrito.
const RASCUNHO = "paragrafos:rascunho";
interface Rascunho {
  tipo: TipoParagrafo;
  temaId: string;
  aspecto: number | null;
  texto: string;
  inicio: number;
  /** Abriu o "Ver resposta" (o repertório) antes de mandar corrigir. */
  consultou?: boolean;
}

function lerRascunho(): Rascunho | null {
  try {
    const r = JSON.parse(localStorage.getItem(RASCUNHO) ?? "null") as Rascunho | null;
    return r && TEMAS.some((t) => t.id === r.temaId) ? r : null;
  } catch {
    return null;
  }
}
function gravarRascunho(r: Rascunho | null) {
  try {
    if (r) localStorage.setItem(RASCUNHO, JSON.stringify(r));
    else localStorage.removeItem(RASCUNHO);
  } catch {
    /* sem armazenamento: só não guarda o rascunho */
  }
}

function sorteioDoRascunho(r: Rascunho): Sorteio {
  return { tipo: r.tipo, tema: TEMAS.find((t) => t.id === r.temaId)!, aspecto: r.aspecto };
}

/**
 * Treino de parágrafos de redação (aba própria, como Impressão e Resumo): escolhe o
 * tipo, sorteia um tema no estilo Cebraspe, escreve UM parágrafo, a IA corrige e dá a
 * nota, e logo abaixo aparece o repertório coringa daquele parágrafo.
 */
export function ParagrafosPage() {
  const navigate = useNavigate();
  const { data: historico, isLoading } = useParagrafosRecentes();
  const salvar = useSalvarParagrafo();
  const excluir = useExcluirParagrafo();

  const rascunhoInicial = useMemo(lerRascunho, []);
  const [etapa, setEtapa] = useState<Etapa>(() =>
    rascunhoInicial ? { tipo: "escrevendo", sorteio: sorteioDoRascunho(rascunhoInicial) } : { tipo: "inicio" }
  );
  const [texto, setTexto] = useState(rascunhoInicial?.texto ?? "");
  const [inicio, setInicio] = useState(rascunhoInicial?.inicio ?? Date.now());
  const [agora, setAgora] = useState(Date.now());
  const [corrigindo, setCorrigindo] = useState(false);
  // "Ver resposta": o repertório aberto durante a escrita. `consultou` fica marcado no
  // histórico, para separar o parágrafo feito de cabeça do feito com a resposta à vista.
  const [respostaAberta, setRespostaAberta] = useState(false);
  const [consultou, setConsultou] = useState(rascunhoInicial?.consultou ?? false);
  // O que apagar: uma linha do histórico, ou a correção aberta na tela (aí volta ao início).
  const [apagar, setApagar] = useState<{ id: string; daTela?: boolean } | null>(null);
  const [nivel, setNivel] = useNivelCorrecao();
  const abortRef = useRef<AbortController | null>(null);
  // Linhas que o parágrafo ocupa na caixa (cada linha da tela = uma linha da folha).
  const linhasRef = useRef(0);
  const guardarLinhas = useCallback((n: number) => {
    linhasRef.current = n;
  }, []);

  useEffect(() => {
    const anterior = document.title;
    document.title = "Redação";
    return () => {
      document.title = anterior;
      abortRef.current?.abort();
    };
  }, []);

  // Cronômetro (só enquanto escreve).
  useEffect(() => {
    if (etapa.tipo !== "escrevendo" || corrigindo) return;
    const id = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [etapa.tipo, corrigindo]);

  useEffect(() => {
    if (etapa.tipo !== "escrevendo") return;
    const s = etapa.sorteio;
    gravarRascunho({ tipo: s.tipo, temaId: s.tema.id, aspecto: s.aspecto, texto, inicio, consultou });
  }, [etapa, texto, inicio, consultou]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [etapa.tipo]);

  function comecar(tipo: TipoParagrafo) {
    setTexto("");
    setInicio(Date.now());
    setAgora(Date.now());
    setRespostaAberta(false);
    setConsultou(false);
    setEtapa({ tipo: "escrevendo", sorteio: sortear(tipo, historico ?? []) });
  }

  function recomecar(sorteio: Sorteio) {
    setTexto("");
    setInicio(Date.now());
    setAgora(Date.now());
    setRespostaAberta(false);
    setConsultou(false);
    setEtapa({ tipo: "escrevendo", sorteio });
  }

  function irParaInicio() {
    abortRef.current?.abort();
    gravarRascunho(null);
    setEtapa({ tipo: "inicio" });
  }

  function voltar() {
    if (etapa.tipo === "inicio") {
      window.close();
      window.setTimeout(() => navigate("/"), 150);
    } else irParaInicio();
  }

  async function corrigir() {
    if (etapa.tipo !== "escrevendo") return;
    const { sorteio } = etapa;
    const { tema, tipo, aspecto } = sorteio;
    const limpo = texto.trim();
    if (!limpo) return;
    const linhas = linhasRef.current || linhasNaFolha(limpo);
    const segundos = Math.round((Date.now() - inicio) / 1000);
    const meta = TIPOS[tipo].meta;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setCorrigindo(true);
    try {
      const correcao = await corrigirParagrafo(
        {
          tipo,
          tema: tema.tema,
          textos: tema.textos,
          aspectos: tema.aspectos.map((a) => a.texto),
          aspecto,
          texto: limpo,
          linhas,
          meta,
          caracteresPorLinha: CARACTERES_POR_LINHA,
          paragrafoModelo: modeloDoParagrafo(tema, tipo, aspecto),
          modelo: NIVEIS[nivel].modelo,
          esforco: NIVEIS[nivel].esforco,
          repertorio: [
            ...pontosDoParagrafo(tema, tipo, aspecto),
            ...embasamentoDoParagrafo(tema, tipo, aspecto),
            ...tema.decorar.map((d) => `${d.titulo} ${d.texto}`.trim()),
          ],
        },
        ctrl.signal
      );
      const nc = notaDoConceito(correcao.conceito);
      const nota = notaFinal(nc, correcao.erros.length, linhas);
      gravarRascunho(null);
      setEtapa({
        tipo: "corrigido",
        sorteio,
        resultado: { correcao, texto: limpo, nota, notaConteudo: nc, linhas, segundos },
        doHistorico: false,
      });
      salvar.mutate(
        {
          tipo,
          tema_id: tema.id,
          aspecto,
          texto: limpo,
          linhas,
          segundos,
          conceito: correcao.conceito,
          nota_conteudo: nc,
          erros: correcao.erros.length,
          nota,
          correcao: { ...correcao, consultou_repertorio: consultou },
        },
        {
          onSuccess: (linha) =>
            setEtapa((atual) =>
              atual.tipo === "corrigido" && !atual.resultado.id && atual.resultado.texto === limpo
                ? { ...atual, resultado: { ...atual.resultado, id: linha.id } }
                : atual
            ),
          onError: (e) => toast.error(`A correção não foi salva no histórico: ${e.message}`),
        }
      );
    } catch (e) {
      if (!ctrl.signal.aborted) toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCorrigindo(false);
    }
  }

  function abrirDoHistorico(p: RedacaoParagrafo) {
    const tema = TEMAS.find((t) => t.id === p.tema_id);
    if (!tema || !p.correcao) return;
    const correcao = p.correcao as unknown as CorrecaoParagrafo;
    setEtapa({
      tipo: "corrigido",
      sorteio: { tema, tipo: p.tipo as TipoParagrafo, aspecto: p.aspecto },
      resultado: {
        id: p.id,
        correcao,
        texto: p.texto,
        nota: Number(p.nota ?? 0),
        notaConteudo: Number(p.nota_conteudo ?? 0),
        linhas: p.linhas,
        segundos: p.segundos,
      },
      doHistorico: true,
    });
  }

  const titulo =
    etapa.tipo === "inicio"
      ? "Redação"
      : `${TIPOS[etapa.sorteio.tipo].nome}${
          etapa.sorteio.tipo === "desenvolvimento" ? ` · aspecto ${(etapa.sorteio.aspecto ?? 0) + 1}` : ""
        }`;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line/50 bg-navy-900/90 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
        <button
          onClick={voltar}
          className="shrink-0 cursor-pointer rounded-lg p-2 text-mut transition-colors hover:bg-navy-700 hover:text-txt sm:p-1.5"
          title="Voltar"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
        <PenLine className="size-4 shrink-0 text-gold" />
        <h1 className="min-w-0 truncate text-base font-semibold text-txt">{titulo}</h1>
        {etapa.tipo === "escrevendo" && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm tabular-nums text-dim" title="Tempo escrevendo">
            <Timer className="size-4" />
            {fmtTempo(Math.max(0, Math.round((agora - inicio) / 1000)))}
          </span>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-24 pt-4 sm:px-6 sm:py-6">
        {etapa.tipo === "inicio" && (
          <Inicio
            historico={historico ?? []}
            carregando={isLoading}
            onComecar={comecar}
            nivel={nivel}
            onNivel={setNivel}
            onAbrir={abrirDoHistorico}
            onApagar={setApagar}
          />
        )}

        {etapa.tipo === "escrevendo" && (
          <Escrevendo
            sorteio={etapa.sorteio}
            texto={texto}
            setTexto={setTexto}
            corrigindo={corrigindo}
            onLinhas={guardarLinhas}
            nivel={nivel}
            respostaAberta={respostaAberta}
            onVerResposta={() => {
              setRespostaAberta((v) => !v);
              setConsultou(true);
            }}
            onCorrigir={corrigir}
            onTrocar={() => comecar(etapa.sorteio.tipo)}
            onCancelar={() => {
              abortRef.current?.abort();
              setCorrigindo(false);
            }}
          />
        )}

        {etapa.tipo === "corrigido" && (
          <div className="space-y-4">
            <Proposta tema={etapa.sorteio.tema} tipo={etapa.sorteio.tipo} aspecto={etapa.sorteio.aspecto} recolherTextos />
            <Correcao {...etapa.resultado} meta={TIPOS[etapa.sorteio.tipo].meta} />
            <Repertorio tema={etapa.sorteio.tema} tipo={etapa.sorteio.tipo} aspecto={etapa.sorteio.aspecto} />
            <div className="sticky bottom-3 z-10 flex flex-wrap justify-center gap-2 rounded-2xl border border-line/50 bg-navy-900/90 p-2 shadow-card backdrop-blur-sm">
              <Button onClick={() => comecar(etapa.sorteio.tipo)}>
                <Shuffle className="size-4" />
                Novo tema ({TIPOS[etapa.sorteio.tipo].nome.toLowerCase()})
              </Button>
              <Button variant="secondary" onClick={() => recomecar(etapa.sorteio)}>
                <RotateCcw className="size-4" />
                Refazer este
              </Button>
              <Button variant="ghost" onClick={irParaInicio}>
                Outro tipo
              </Button>
              <Button
                variant="danger"
                onClick={() => etapa.resultado.id && setApagar({ id: etapa.resultado.id, daTela: true })}
                disabled={!etapa.resultado.id}
                title={etapa.resultado.id ? "Apagar esta correção do histórico" : "Salvando no histórico…"}
              >
                <Trash2 className="size-4" />
                Apagar
              </Button>
            </div>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={apagar !== null}
        title="Apagar esta correção?"
        message="O parágrafo e a correção saem do histórico (e da média), e o tema volta a poder ser sorteado."
        confirmLabel="Apagar"
        danger
        onConfirm={() => {
          if (apagar) {
            excluir.mutate(apagar.id, {
              onSuccess: () => toast.success("Correção apagada"),
              onError: (e) => toast.error(e.message),
            });
            if (apagar.daTela) irParaInicio();
          }
          setApagar(null);
        }}
        onClose={() => setApagar(null)}
      />
    </div>
  );
}

function Inicio({
  historico,
  carregando,
  onComecar,
  nivel,
  onNivel,
  onAbrir,
  onApagar,
}: {
  historico: RedacaoParagrafo[];
  carregando: boolean;
  onComecar: (t: TipoParagrafo) => void;
  nivel: NivelCorrecao;
  onNivel: (n: NivelCorrecao) => void;
  onAbrir: (p: RedacaoParagrafo) => void;
  onApagar: (p: RedacaoParagrafo) => void;
}) {
  const tipos = Object.keys(TIPOS) as TipoParagrafo[];
  const { data: gasto } = useGastoIAMes();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-txt">Um parágrafo por vez</h2>
        <p className="mt-1 text-sm leading-relaxed text-dim">
          Escolha o tipo, sorteie um tema no estilo Cebraspe e escreva só aquele parágrafo. A IA corrige e dá a nota, e
          depois aparece o repertório coringa para você ver como poderia ter feito.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {tipos.map((t) => {
          const feitos = historico.filter((h) => h.tipo === t);
          const ultimos = feitos.slice(0, 10).filter((h) => h.nota != null);
          const media = ultimos.length ? ultimos.reduce((s, h) => s + Number(h.nota), 0) / ultimos.length : null;
          return (
            <button
              key={t}
              onClick={() => onComecar(t)}
              className="group cursor-pointer rounded-card border border-line/50 bg-navy-800/80 px-4 py-4 text-left shadow-card transition-all hover:border-gold/50 hover:bg-navy-700/80"
            >
              <span className="flex items-center justify-between">
                <span className="text-base font-bold text-txt">{TIPOS[t].nome}</span>
                <Shuffle className="size-4 text-mut transition-colors group-hover:text-gold" />
              </span>
              <span className="mt-0.5 block text-xs font-semibold text-gold">
                {TIPOS[t].meta[0]} a {TIPOS[t].meta[1]} linhas
              </span>
              <span className="mt-2 block text-sm leading-snug text-dim">{TIPOS[t].descricao}</span>
              <span className="mt-3 block text-xs text-mut">
                {feitos.length === 0 ? (
                  "Nenhum feito ainda"
                ) : (
                  <>
                    {feitos.length} {feitos.length === 1 ? "feito" : "feitos"}
                    {media != null && (
                      <>
                        {" · média "}
                        <span className={`font-bold ${corDaNota(media)}`}>
                          {media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                        </span>
                      </>
                    )}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-mut">
        {TEMAS.length} temas do seu PDF de Atualidades. O sorteio evita repetir o que você já fez.
      </p>

      <ComoCebraspeCorrige />

      <Secao titulo="Correção da IA">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Nível de correção">
          {(Object.keys(NIVEIS) as NivelCorrecao[]).map((n) => (
            <CartaoNivel key={n} nivel={n} ativo={n === nivel} onEscolher={() => onNivel(n)} />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-mut">
          Estimativas dos testes com o mesmo parágrafo (12 erros de português). Custo do mês para 10 parágrafos por dia.
        </p>
        {gasto && gasto.correcoes > 0 && (
          <div className="mt-4 border-t border-line/40 pt-3">
            <p className="text-sm text-txt">
              Neste mês: {gasto.correcoes} {gasto.correcoes === 1 ? "correção" : "correções"} ·{" "}
              <GastoIA uso={{ entrada: gasto.entrada, saida: gasto.saida, custo_usd: gasto.custo }} />
            </p>
            <p className="mt-1 text-xs text-mut">Média de {fmtUSD(gasto.custo / gasto.correcoes)} por correção.</p>
          </div>
        )}
      </Secao>

      <Secao titulo="Histórico">
        {carregando ? (
          <div className="flex justify-center py-4">
            <Spinner className="size-5" />
          </div>
        ) : historico.length === 0 ? (
          <p className="text-sm text-mut">Os parágrafos corrigidos aparecem aqui.</p>
        ) : (
          <ul className="divide-y divide-line/40">
            {historico.slice(0, 30).map((p) => {
              const tema = TEMAS.find((t) => t.id === p.tema_id);
              return (
                <li key={p.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onAbrir(p)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 text-left"
                  >
                    <span className={`w-10 shrink-0 text-right text-base font-extrabold tabular-nums ${corDaNota(Number(p.nota ?? 0))}`}>
                      {Number(p.nota ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-txt">{tema?.tema ?? p.tema_id}</span>
                      <span className="block text-[11px] text-mut">
                        {TIPOS[p.tipo as TipoParagrafo]?.nome ?? p.tipo}
                        {p.tipo === "desenvolvimento" && ` · aspecto ${(p.aspecto ?? 0) + 1}`} ·{" "}
                        {new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        {(p.correcao as { consultou_repertorio?: boolean } | null)?.consultou_repertorio && (
                          <span className="text-amber"> · viu a resposta</span>
                        )}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onApagar(p)}
                    className="shrink-0 cursor-pointer rounded-lg p-2 text-mut transition-colors hover:bg-navy-700 hover:text-red"
                    title="Apagar"
                    aria-label="Apagar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Secao>
    </div>
  );
}

/** Resumo da pesquisa em tools/cebraspe-redacao-criterios.md (fontes oficiais). */
function ComoCebraspeCorrige() {
  const fontes = [
    ["Edital PC PE 2026, item 9", "https://cdn.cebraspe.org.br/concursos/PC_PE_26/arquivos/D70610824B6BDD9266B820E9F9E5A3527D9125712B300C4F3A4A49DB948553E2.html"],
    ["Padrão de resposta 2024 (Agente)", "https://cdn.cebraspe.org.br/concursos/PC_PE_23/arquivos/PC_PE_23_PADRAO_PRELIMINAR_DE_RESPOSTAS_CARGO_1.PDF"],
    ["Padrão de resposta 2024 (Escrivão)", "https://cdn.cebraspe.org.br/concursos/PC_PE_23/arquivos/PC_PE_23_PADRAO_PRELIMINAR_DE_RESPOSTAS_CARGO_3.PDF"],
    ["Critérios de redação da Cebraspe", "https://cdn.cebraspe.org.br/arquivos/PAS/Guia/Prova_de_Redacao_do_PAS_V11.pdf"],
  ];
  const itens: [string, string][] = [
    [
      "A nota",
      "Até 30 linhas, 30 pontos; aprova com 15. Nota = conteúdo − 6 × erros ÷ linhas escritas. Fuga ao tema dá zero, e o que passa da linha 30 é ignorado.",
    ],
    [
      "Cada aspecto",
      "0 = não abordou · 1 = só mencionou · 2 = desenvolveu de forma insuficiente ou desarticulada · 3 = desenvolveu articulado ao tema. Os 3 aspectos valem cerca de 28,5 pontos; os outros 1,5 são de apresentação: letra legível, margens e recuo de parágrafo.",
    ],
    [
      "Aspecto de exemplo",
      "Vale o exemplo eficaz e já implementado, com nome e lugar. O que \"ainda vai ser implementado\" perde ponto.",
    ],
    [
      "Desenvolver",
      "Afirme, explique com informação concreta (lei pelo nome e ano, dado com fonte, exemplo com resultado) e feche ligando ao tema. Só citar ou listar vale 1 de 3.",
    ],
    [
      "Erros que descontam",
      "Grafia e acentuação; morfossintaxe (vírgula, concordância, regência — cada ocorrência conta); propriedade vocabular (estrangeirismo ou gíria sem aspas, \"onde\" fora de lugar, palavra repetida no parágrafo, falar com o leitor). Com 30 linhas, cada erro tira 0,2 ponto.",
    ],
  ];
  return (
    <details className="group rounded-card border border-line/50 bg-navy-800/80 shadow-card">
      <summary className="cursor-pointer list-none px-4 py-3.5 sm:px-5">
        <span className="text-[13px] font-bold uppercase tracking-wide text-dim">Como a Cebraspe corrige</span>
        <span className="ml-2 text-xs text-mut group-open:hidden">· abrir</span>
      </summary>
      <div className="border-t border-line/40 px-4 pb-4 pt-3 sm:px-5">
        <dl className="space-y-2.5">
          {itens.map(([t, d]) => (
            <div key={t}>
              <dt className="text-sm font-semibold text-txt">{t}</dt>
              <dd className="text-sm leading-relaxed text-dim">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-mut">
          Fontes oficiais:{" "}
          {fontes.map(([nome, url], i) => (
            <span key={url}>
              {i > 0 && " · "}
              <a href={url} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                {nome}
              </a>
            </span>
          ))}
          . A IA corrige com esses mesmos critérios.
        </p>
      </div>
    </details>
  );
}

function CartaoNivel({ nivel, ativo, onEscolher }: { nivel: NivelCorrecao; ativo: boolean; onEscolher: () => void }) {
  const info = NIVEIS[nivel];
  return (
    <button
      role="radio"
      aria-checked={ativo}
      onClick={onEscolher}
      className={`flex h-full cursor-pointer flex-col rounded-xl border px-3 py-2.5 text-left transition-colors ${
        ativo ? "border-gold/60 bg-gold/10" : "border-line/50 bg-navy-900/60 hover:border-line"
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className={`text-sm font-bold ${ativo ? "text-gold" : "text-txt"}`}>{info.nome}</span>
        <span className="text-[11px] text-mut">{info.rotulo}</span>
      </span>
      <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-mut">Custo estimado</span>
      <span className="block text-sm font-semibold tabular-nums text-txt">~{fmtUSD(info.custo)} por parágrafo</span>
      <span className="block text-xs tabular-nums text-dim">~{fmtUSD(info.custo * PARAGRAFOS_POR_MES)} por mês</span>
      <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-mut">Precisão estimada</span>
      <span className="block text-sm tracking-[0.2em] text-gold" aria-label={`${info.precisao} de 5`}>
        {"●".repeat(info.precisao)}
        <span className="text-line">{"●".repeat(5 - info.precisao)}</span>
      </span>
      <span className="block text-xs text-dim">achou {info.errosNoTeste} de 12 erros no teste</span>
      <span className="mt-2 block text-xs leading-snug text-mut">{info.descricao}</span>
    </button>
  );
}

function Escrevendo({
  sorteio,
  texto,
  setTexto,
  corrigindo,
  onLinhas,
  nivel,
  respostaAberta,
  onVerResposta,
  onCorrigir,
  onTrocar,
  onCancelar,
}: {
  sorteio: Sorteio;
  texto: string;
  setTexto: (t: string) => void;
  corrigindo: boolean;
  onLinhas: (n: number) => void;
  nivel: NivelCorrecao;
  respostaAberta: boolean;
  onVerResposta: () => void;
  onCorrigir: () => void;
  onTrocar: () => void;
  onCancelar: () => void;
}) {
  const { tema, tipo, aspecto } = sorteio;
  const info = TIPOS[tipo];
  const [linhas, setLinhas] = useState(0);
  const contarLinhas = useCallback(
    (n: number) => {
      setLinhas(n);
      onLinhas(n);
    },
    [onLinhas]
  );
  const dentro = linhas >= info.meta[0] && linhas <= info.meta[1];
  const abertura = aberturaDoParagrafo(tipo, aspecto);
  const respostaRef = useRef<HTMLDivElement>(null);

  // Abriu a resposta: rola até ela (o campo de escrita continua logo acima).
  useEffect(() => {
    if (respostaAberta) respostaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [respostaAberta]);
  const pedido =
    tipo === "introducao"
      ? "Escreva só a introdução: apresente o tema e anuncie os 3 aspectos."
      : tipo === "conclusao"
        ? "Escreva só a conclusão, respondendo ao aspecto 3."
        : `Escreva só o parágrafo do aspecto ${(aspecto ?? 0) + 1}.`;

  return (
    <div className="space-y-4">
      <Proposta tema={tema} tipo={tipo} aspecto={aspecto} />

      <section className="rounded-card border border-gold/40 bg-navy-800/80 px-4 py-4 shadow-card sm:px-5">
        <p className="text-sm font-semibold text-txt">{pedido}</p>
        <p className="mt-0.5 text-xs text-dim">
          {info.meta[0]} a {info.meta[1]} linhas · abertura do seu esqueleto: {abertura}
        </p>
        <FolhaRedacao value={texto} onChange={setTexto} disabled={corrigindo} meta={info.meta} onLinhas={contarLinhas} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs font-semibold tabular-nums ${linhas === 0 ? "text-mut" : dentro ? "text-green" : "text-amber"}`}>
            {linhas} {linhas === 1 ? "linha" : "linhas"} · meta {info.meta[0]}–{info.meta[1]}
          </span>
          <span className="text-[11px] text-mut">
            Cada linha cabe o que cabe numa linha da folha (cerca de {CARACTERES_POR_LINHA} caracteres). Corretor
            ortográfico desligado, como na prova.
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {corrigindo ? (
            <>
              <Button disabled loading>
                Corrigindo… (leva uns 20 a 30 s)
              </Button>
              <Button variant="ghost" onClick={onCancelar}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onCorrigir} disabled={!texto.trim()}>
                Corrigir com IA
              </Button>
              <Button variant="secondary" onClick={onVerResposta} title="Mostra o repertório deste parágrafo">
                {respostaAberta ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                {respostaAberta ? "Esconder resposta" : "Ver resposta"}
              </Button>
              <Button variant="ghost" onClick={onTrocar}>
                <Shuffle className="size-4" />
                Sortear outro tema
              </Button>
            </>
          )}
        </div>
        <p className="mt-2 text-[11px] text-mut">
          Correção {NIVEIS[nivel].nome.toLowerCase()} ({NIVEIS[nivel].rotulo}, ~{fmtUSD(NIVEIS[nivel].custo)}). Troque o
          nível na tela inicial.
        </p>
      </section>

      {respostaAberta && (
        <div ref={respostaRef} className="scroll-mt-20">
          <Repertorio tema={tema} tipo={tipo} aspecto={aspecto} />
        </div>
      )}
    </div>
  );
}
