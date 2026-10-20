import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react";
import {
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Hourglass,
  LayoutGrid,
  MapPinOff,
  PencilLine,
  RotateCcw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Concurso, QuestaoAnkiStatus } from "@/types/db";
import { useResumosDeQuestoes } from "@/api/topicoTextos";
import { useQuestoesDoResumo } from "@/api/topicoQuestoes";
import { useMarcarAnki, useQuestoesAnki } from "@/api/questoesAnki";
import { useTopicos } from "@/api/topicos";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { concursoDeEstudo, useConcursos } from "@/api/concursos";
import { Spinner } from "@/components/Spinner";
import { EditarTrechoResumoModal } from "@/features/conteudos/EditarTrechoResumoModal";
import {
  appsPorMateria,
  cargaDaBateria,
  contar,
  criarFiltroEdital,
  extrairBlocos,
  montarItens,
  passaNoFiltro,
  secoesPorAssunto,
  type AppMateria,
  type Contagem,
  type EstadoAnki,
  type FiltroCelular,
  type ItemResumo,
} from "./itensResumo";
import { avisarQuestaoRemovida, ESCOPO_TUDO, type TelaCelular } from "./celularNavegacao";

/* ───────────────────────────── aparência ───────────────────────────── */

/** Cores dos apps (uma por matéria, na ordem do edital) — vivas como os ícones do GTA. */
const CORES_APP: readonly [string, string][] = [
  ["#4f9dde", "#24569c"],
  ["#e8925a", "#a14f22"],
  ["#3fbf7f", "#1d7046"],
  ["#b07ce8", "#5f35a3"],
  ["#e5564b", "#93271f"],
  ["#3fc8d6", "#16717f"],
  ["#e8b93e", "#9c6a12"],
  ["#e87cb5", "#9b376c"],
  ["#7c8ce8", "#3443a3"],
  ["#8fd14f", "#467f1c"],
  ["#5ad1b5", "#1f7a65"],
  ["#9db0c7", "#46586f"],
];

interface InfoEstado {
  rotulo: string;
  Icone: LucideIcon;
  cor: string;
  fundo: string;
  borda: string;
  /** Fica esmaecido (não entra na conta do que falta). */
  apagado?: boolean;
  tracejado?: boolean;
}

const ESTADO: Record<EstadoAnki, InfoEstado> = {
  falta: {
    rotulo: "Falta ir pro Anki",
    Icone: Hourglass,
    cor: "var(--color-gold-soft)",
    // o que falta é o que importa: o dourado chama mais que o verde
    fundo: "linear-gradient(150deg, rgb(240 200 116 / 0.42), rgb(224 168 62 / 0.13))",
    borda: "rgb(240 200 116 / 0.7)",
  },
  no_anki: {
    rotulo: "Já está no Anki",
    Icone: Check,
    cor: "var(--color-green)",
    fundo: "linear-gradient(150deg, rgb(63 191 127 / 0.24), rgb(63 191 127 / 0.06))",
    borda: "rgb(63 191 127 / 0.4)",
  },
  ignorada: {
    rotulo: "Não vai pro Anki",
    Icone: EyeOff,
    cor: "var(--color-mut)",
    fundo: "rgb(29 52 84 / 0.3)",
    borda: "rgb(37 64 95 / 0.65)",
    apagado: true,
  },
  fora: {
    rotulo: "Fora do edital",
    Icone: MapPinOff,
    cor: "var(--color-mut)",
    fundo: "rgb(15 29 51 / 0.55)",
    borda: "rgb(37 64 95 / 0.85)",
    apagado: true,
    tracejado: true,
  },
  apagada: {
    rotulo: "Questão apagada",
    Icone: Trash2,
    cor: "var(--color-red)",
    fundo: "rgb(229 86 75 / 0.1)",
    borda: "rgb(229 86 75 / 0.35)",
  },
};

const FILTROS: { valor: FiltroCelular; rotulo: string }[] = [
  { valor: "falta", rotulo: "Faltam" },
  { valor: "no_anki", rotulo: "No Anki" },
  { valor: "todas", rotulo: "Todas" },
];

const pl = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/* ───────────────────────────── dados ───────────────────────────── */

interface DadosCelular {
  itens: ItemResumo[];
  apps: AppMateria[];
  geral: Contagem;
  conteudoDoResumo: ReadonlyMap<string, string>;
  topicoPorId: ReadonlyMap<string, { id: string; titulo: string; ordem: number; materia_id: string }>;
  ordemMaterias: string[];
  rankTopico: ReadonlyMap<string, number>;
  concurso: Concurso | undefined;
  buscando: boolean;
}

/**
 * Tudo o que o celular mostra: os trechos dos resumos de questões (~250 KB, a mesma
 * consulta do modo misturado), as questões deles só com as colunas leves e as marcas
 * do Anki. Matérias, assuntos e concursos já estão em cache no resto do site.
 */
function useDadosCelular(): { dados: DadosCelular | null; carregando: boolean; erro: unknown; recarregar: () => void } {
  const resumos = useResumosDeQuestoes();
  const marcas = useQuestoesAnki();
  const topicos = useTopicos();
  const materias = useMaterias();
  const concursos = useConcursos();
  const vinculos = useConcursoMaterias();

  const ids = useMemo(() => {
    const set = new Set<string>();
    for (const r of resumos.data ?? []) for (const b of extrairBlocos(r.conteudo ?? "")) set.add(b.questaoId);
    return [...set];
  }, [resumos.data]);
  const questoes = useQuestoesDoResumo(ids);

  const base = useMemo<Omit<DadosCelular, "buscando"> | null>(() => {
    if (!resumos.data || !marcas.data || !topicos.data || !materias.data || !concursos.data || !vinculos.data)
      return null;
    if (ids.length > 0 && !questoes.data) return null;

    const topicoPorId = new Map(topicos.data.map((t) => [t.id, t]));
    const materiaPorId = new Map(materias.data.map((m) => [m.id, m]));
    const concurso = concursoDeEstudo(concursos.data);
    const doConcurso = vinculos.data
      .filter((v) => v.concurso_id === concurso?.id)
      .sort((a, b) => a.ordem - b.ordem);
    const ordemMaterias = doConcurso.map((v) => v.materia_id);
    // Ordem dos assuntos = recorte do edital do concurso em estudo (quando há recorte).
    const rankTopico = new Map<string, number>();
    for (const v of doConcurso) v.topicos_incluidos?.forEach((id, i) => rankTopico.set(id, i));

    const itens = montarItens({
      resumos: resumos.data,
      questoes: new Map((questoes.data ?? []).map((q) => [q.id, q])),
      marcas: new Map(marcas.data.map((m) => [m.questao_id, m])),
      topicoPorId,
      noEdital: criarFiltroEdital(concursos.data, vinculos.data, topicoPorId),
      questoesChegando: questoes.isPlaceholderData,
    });
    return {
      itens,
      apps: appsPorMateria(itens, materiaPorId, ordemMaterias),
      geral: contar(itens),
      conteudoDoResumo: new Map(resumos.data.map((r) => [r.id, r.conteudo ?? ""])),
      topicoPorId,
      ordemMaterias,
      rankTopico,
      concurso,
    };
  }, [
    resumos.data,
    marcas.data,
    topicos.data,
    materias.data,
    concursos.data,
    vinculos.data,
    questoes.data,
    questoes.isPlaceholderData,
    ids.length,
  ]);
  // Um trecho recém-adicionado pode ainda não ter chegado do banco.
  const buscando = resumos.isFetching || questoes.isFetching;
  const dados = useMemo(() => (base ? { ...base, buscando } : null), [base, buscando]);

  const consultas = [resumos, marcas, questoes, topicos, materias, concursos, vinculos];
  const erro = consultas.find((c) => c.error)?.error ?? null;
  return {
    dados,
    carregando: !dados && !erro,
    erro,
    recarregar: () => {
      for (const c of consultas) if (c.error) void c.refetch();
    },
  };
}

/* ───────────────────────────── navegação por teclado ───────────────────────────── */

type Direcao = "cima" | "baixo" | "esq" | "dir";
const DIRECAO: Record<string, Direcao> = {
  ArrowUp: "cima",
  ArrowDown: "baixo",
  ArrowLeft: "esq",
  ArrowRight: "dir",
};

/**
 * Anda na grade como no celular do GTA: ←/→ vão para o vizinho na ordem; ↑/↓ vão para
 * a linha de cima/de baixo (pela posição na tela — vale entre seções e no dock),
 * escolhendo o item mais perto na horizontal.
 */
function moverNaGrade(els: (HTMLElement | null)[], atual: number, dir: Direcao): number {
  const n = els.length;
  if (n === 0) return -1;
  if (atual < 0 || atual >= n) return 0;
  if (dir === "esq") return Math.max(0, atual - 1);
  if (dir === "dir") return Math.min(n - 1, atual + 1);
  const a = els[atual]?.getBoundingClientRect();
  if (!a) return atual;
  const cx = a.left + a.width / 2;
  let melhor = atual;
  let melhorDy = Infinity;
  let melhorDx = Infinity;
  els.forEach((el, i) => {
    if (!el || i === atual) return;
    const r = el.getBoundingClientRect();
    const dy = dir === "baixo" ? r.top - a.top : a.top - r.top;
    if (dy <= 4) return; // mesma linha ou do lado errado
    const dx = Math.abs(r.left + r.width / 2 - cx);
    if (dy < melhorDy - 4 || (Math.abs(dy - melhorDy) <= 4 && dx < melhorDx)) {
      melhor = i;
      melhorDy = dy;
      melhorDx = dx;
    }
  });
  return melhor;
}

function focar(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/** A tela trata a tecla e diz se usou (o celular chama `preventDefault`). */
type TeclaDaTela = MutableRefObject<((e: KeyboardEvent) => boolean) | null>;

/* ───────────────────────────── celular ───────────────────────────── */

interface Props {
  /** "pagina": a página /resumo (o celular é a página). "flutuante": puxado no canto das páginas de questões. */
  modo: "pagina" | "flutuante";
  tela: TelaCelular;
  irPara: (t: TelaCelular, opcoes?: { substituir?: boolean }) => void;
  voltar: () => void;
  /** Guarda o celular (só no flutuante). */
  onFechar?: () => void;
}

/**
 * O celular do resumo: as questões do "Adicionar ao resumo" como os apps do celular
 * do GTA. Tela inicial = uma matéria por app, com o selinho de quantas faltam ir para
 * o Anki; dentro do app, um quadradinho por questão — dourado falta, verde já está
 * no Anki. Anda com as setas, abre com Enter e volta com Esc (ou tocando).
 */
export function CelularResumo({ modo, tela, irPara, voltar, onFechar }: Props) {
  const { dados, carregando, erro, recarregar } = useDadosCelular();
  const marcar = useMarcarAnki();
  const [editando, setEditando] = useState<ItemResumo | null>(null);
  const teclaDaTela: TeclaDaTela = useRef(null);
  const raizRef = useRef<HTMLDivElement>(null);
  // O que estava selecionado, para voltar no mesmo lugar (como no GTA).
  const [selInicio, setSelInicio] = useState(0);
  const [ultimaQuestao, setUltimaQuestao] = useState<string | null>(null);

  // Abrir um app empurra a tela para dentro; voltar, para fora.
  const profundidade = tela.tipo === "inicio" ? 0 : tela.tipo === "app" ? 1 : 2;
  const anterior = useRef(profundidade);
  const animacao = profundidade >= anterior.current ? "celular-abrir" : "celular-voltar";
  useEffect(() => {
    anterior.current = profundidade;
  }, [profundidade]);

  const questaoAberta = tela.tipo === "questao" ? tela.questaoId : null;
  useEffect(() => {
    if (questaoAberta) setUltimaQuestao(questaoAberta);
  }, [questaoAberta]);

  const tratarTecla = useCallback(
    (e: KeyboardEvent) => {
      if (editando || e.ctrlKey || e.metaKey || e.altKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        if (tela.tipo === "inicio") onFechar?.();
        else voltar();
        return;
      }
      if (teclaDaTela.current?.(e)) e.preventDefault();
    },
    [editando, tela.tipo, onFechar, voltar]
  );

  // Na página, as teclas valem mesmo sem foco dentro do celular (clicou no fundo).
  useEffect(() => {
    if (modo !== "pagina") return;
    const h = (e: KeyboardEvent) => {
      if (!document.activeElement || document.activeElement === document.body) tratarTecla(e);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [modo, tratarTecla]);

  // Flutuante: o foco entra no celular ao puxá-lo (se a tela ainda não focou um app).
  useEffect(() => {
    const raiz = raizRef.current;
    if (modo === "flutuante" && raiz && !raiz.contains(document.activeElement)) raiz.focus({ preventScroll: true });
  }, [modo]);

  function mudarMarca(item: ItemResumo, status: QuestaoAnkiStatus | null) {
    marcar.mutate(
      { questaoIds: [item.questaoId], status },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
  }

  const carga = dados ? cargaDaBateria(dados.geral) : 0;
  const cor = dados?.concurso?.cor ?? "#e0a83e";
  const tamanho =
    modo === "pagina"
      ? "h-dvh w-full sm:h-[min(860px,calc(100dvh-3rem))] sm:w-[404px]"
      : "h-dvh w-full sm:h-[min(730px,calc(100dvh-2rem))] sm:w-[372px]";

  // Cada tela registra as suas teclas ao renderizar; sem tela (carregando, vazio), nenhuma.
  teclaDaTela.current = null;
  let conteudo: ReactNode;
  if (erro) {
    conteudo = (
      <Aviso icone="📵" titulo="Sem sinal" texto="Não consegui carregar o resumo.">
        <button
          onClick={recarregar}
          className="mt-3 cursor-pointer rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-txt hover:bg-white/15"
        >
          Tentar de novo
        </button>
      </Aviso>
    );
  } else if (carregando || !dados) {
    conteudo = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-xs text-mut">
        <Spinner />
        Ligando o celular…
      </div>
    );
  } else if (dados.itens.length === 0) {
    conteudo = (
      <Aviso
        icone="📭"
        titulo="Nenhuma questão no resumo"
        texto='Use o "Adicionar ao resumo" nas questões: cada uma vira um quadradinho aqui.'
      />
    );
  } else if (tela.tipo === "inicio") {
    conteudo = (
      <TelaInicio
        key="inicio"
        animacao={animacao}
        dados={dados}
        sel={selInicio}
        onSel={setSelInicio}
        abrir={(escopo, filtro) => irPara({ tipo: "app", escopo, filtro })}
        teclaDaTela={teclaDaTela}
      />
    );
  } else if (tela.tipo === "app") {
    conteudo = (
      <TelaApp
        key={`app-${tela.escopo}`}
        animacao={animacao}
        dados={dados}
        escopo={tela.escopo}
        filtro={tela.filtro}
        focoQuestao={ultimaQuestao}
        mudarFiltro={(filtro) => irPara({ ...tela, filtro }, { substituir: true })}
        abrirQuestao={(questaoId) => irPara({ tipo: "questao", escopo: tela.escopo, filtro: tela.filtro, questaoId })}
        voltar={voltar}
        teclaDaTela={teclaDaTela}
      />
    );
  } else {
    conteudo = (
      <TelaQuestao
        key="questao"
        animacao={animacao}
        dados={dados}
        tela={tela}
        irParaQuestao={(questaoId) => irPara({ ...tela, questaoId }, { substituir: true })}
        voltar={voltar}
        onMarcar={mudarMarca}
        onEditar={setEditando}
        teclaDaTela={teclaDaTela}
      />
    );
  }

  return (
    <div
      ref={raizRef}
      tabIndex={-1}
      onKeyDown={(e) => tratarTecla(e.nativeEvent)}
      className={`celular-moldura relative flex flex-col outline-none ${tamanho}`}
      role="region"
      aria-label="Celular do resumo"
    >
      {/* botões laterais da moldura */}
      <span aria-hidden className="absolute -left-[3px] top-[19%] hidden h-8 w-[3px] rounded-l-sm bg-[#2b3a55] sm:block" />
      <span aria-hidden className="absolute -left-[3px] top-[27%] hidden h-14 w-[3px] rounded-l-sm bg-[#2b3a55] sm:block" />
      <span aria-hidden className="absolute -left-[3px] top-[37%] hidden h-14 w-[3px] rounded-l-sm bg-[#2b3a55] sm:block" />
      <span aria-hidden className="absolute -right-[3px] top-[30%] hidden h-20 w-[3px] rounded-r-sm bg-[#2b3a55] sm:block" />

      <div
        className="celular-tela relative flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ "--cor-celular": cor } as CSSProperties}
      >
        <BarraStatus concurso={dados?.concurso} carga={dados ? carga : null} onFechar={onFechar} />
        {conteudo}
        <button
          onClick={() => irPara({ tipo: "inicio" })}
          className="group mx-auto flex w-40 shrink-0 cursor-pointer justify-center pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5 sm:pb-2"
          aria-label="Tela inicial"
          title="Tela inicial"
        >
          <span className="h-[5px] w-28 rounded-full bg-white/30 transition-colors group-hover:bg-white/55" />
        </button>
      </div>

      {editando && (
        <EditarTrechoResumoModal
          questaoId={editando.questaoId}
          destino={editando.destino}
          resumoTextoId={editando.resumoId}
          conteudoBanco={dados?.conteudoDoResumo.get(editando.resumoId) ?? ""}
          onRemovido={() => {
            avisarQuestaoRemovida(editando.questaoId);
            voltar();
          }}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

/* ───────────────────────────── barra de status ───────────────────────────── */

function useHora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 15_000);
    return () => window.clearInterval(t);
  }, []);
  return agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function BarraStatus({
  concurso,
  carga,
  onFechar,
}: {
  concurso: Concurso | undefined;
  carga: number | null;
  onFechar?: () => void;
}) {
  const hora = useHora();
  return (
    <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 px-5 pb-1.5 pt-[calc(0.6rem+env(safe-area-inset-top))] text-[12.5px] font-bold text-txt sm:h-12 sm:px-7 sm:pb-0 sm:pt-1">
      <span className="tabular-nums max-sm:hidden">{hora}</span>
      <span className="truncate text-[11px] font-semibold text-dim sm:hidden">
        {concurso ? `${concurso.icone} ${concurso.nome_curto ?? concurso.nome}` : "Resumo"}
      </span>
      {/* a "ilha" do celular */}
      <span aria-hidden className="absolute left-1/2 top-[10px] hidden h-[27px] w-[96px] -translate-x-1/2 rounded-full bg-black sm:block" />
      <span className="flex shrink-0 items-center gap-1.5">
        <Sinal />
        {carga !== null && <Bateria carga={carga} />}
        {onFechar && (
          <button
            onClick={onFechar}
            className="-mr-2 ml-0.5 cursor-pointer rounded-full p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-txt"
            aria-label="Guardar o celular"
            title="Guardar o celular (Esc)"
          >
            <X className="size-4" />
          </button>
        )}
      </span>
    </div>
  );
}

function Sinal() {
  return (
    <svg viewBox="0 0 17 11" className="h-[11px] w-[17px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 4.4} y={8 - i * 2.6} width="3" height={3 + i * 2.6} rx="0.8" fill="currentColor" />
      ))}
    </svg>
  );
}

/** A bateria = quanto do que importa no resumo já está no Anki. */
function Bateria({ carga }: { carga: number }) {
  const cor = carga >= 60 ? "var(--color-green)" : carga >= 25 ? "var(--color-gold)" : "var(--color-red)";
  return (
    <span
      className="flex items-center gap-1"
      title={`Bateria = ${carga}% das questões do resumo (no edital) já estão no Anki`}
    >
      <span className="text-[11px] tabular-nums">{carga}%</span>
      <svg viewBox="0 0 27 13" className="h-[13px] w-[27px]" aria-hidden>
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" strokeOpacity="0.5" />
        <rect x="2.2" y="2.2" width={Math.max(0, (19.6 * carga) / 100)} height="8.6" rx="2" fill={cor} />
        <path d="M25.2 4.4v4.2c.9-.3 1.6-1.1 1.6-2.1s-.7-1.8-1.6-2.1z" fill="currentColor" fillOpacity="0.5" />
      </svg>
    </span>
  );
}

function Aviso({ icone, titulo, texto, children }: { icone: string; titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="text-5xl">{icone}</span>
      <p className="mt-3 text-sm font-bold text-txt">{titulo}</p>
      <p className="mt-1 text-xs leading-relaxed text-mut">{texto}</p>
      {children}
    </div>
  );
}

/* ───────────────────────────── tela inicial ───────────────────────────── */

function TelaInicio({
  animacao,
  dados,
  sel,
  onSel,
  abrir,
  teclaDaTela,
}: {
  animacao: string;
  dados: DadosCelular;
  sel: number;
  onSel: (i: number) => void;
  abrir: (escopo: string, filtro: FiltroCelular) => void;
  teclaDaTela: TeclaDaTela;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const { apps, geral } = dados;
  const dock: { filtro: FiltroCelular; rotulo: string; n: number; Icone: LucideIcon; c: [string, string] }[] = [
    { filtro: "falta", rotulo: "Faltam", n: geral.falta, Icone: Hourglass, c: ["#f0c874", "#b07a1c"] },
    { filtro: "no_anki", rotulo: "No Anki", n: geral.no_anki, Icone: CheckCheck, c: ["#5fd99a", "#1f7a4f"] },
    { filtro: "todas", rotulo: "Todas", n: geral.total, Icone: LayoutGrid, c: ["#6fb3ec", "#24569c"] },
  ];

  useEffect(() => {
    refs.current[Math.min(sel, apps.length + dock.length - 1)]?.focus({ preventScroll: true });
    // só ao abrir a tela inicial (voltar de um app cai no app de onde saiu)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  teclaDaTela.current = (e) => {
    const dir = DIRECAO[e.key];
    if (dir) {
      const atual = refs.current.indexOf(document.activeElement as HTMLButtonElement);
      focar(refs.current[moverNaGrade(refs.current, atual < 0 ? sel : atual, dir)]);
      return true;
    }
    if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
      refs.current[sel]?.click();
      return true;
    }
    return false;
  };

  return (
    <div className={`${animacao} flex min-h-0 flex-1 flex-col`}>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3 pt-1">
        <WidgetResumo contagem={geral} onClick={() => abrir(ESCOPO_TUDO, "falta")} />
        <div className="mt-5 grid grid-cols-3 gap-x-2 gap-y-4">
          {apps.map((app, i) => (
            <IconeApp
              key={app.materiaId}
              app={app}
              cores={CORES_APP[i % CORES_APP.length]}
              refCb={(el) => {
                refs.current[i] = el;
              }}
              onFocus={() => onSel(i)}
              onClick={() => abrir(app.materiaId, "todas")}
            />
          ))}
        </div>
      </div>

      {/* dock: as três visões de tudo */}
      <div className="mx-3 mb-1 grid shrink-0 grid-cols-3 gap-1 rounded-[1.7rem] border border-white/[0.06] bg-white/[0.05] px-2 py-2.5 backdrop-blur-md">
        {dock.map((d, k) => {
          const i = apps.length + k;
          return (
            <button
              key={d.filtro}
              ref={(el) => {
                refs.current[i] = el;
              }}
              onFocus={() => onSel(i)}
              onClick={() => abrir(ESCOPO_TUDO, d.filtro)}
              data-anel
              className="group flex cursor-pointer flex-col items-center gap-1 rounded-2xl outline-none"
              aria-label={`${d.rotulo}: ${d.n}`}
            >
              <span
                className="relative flex size-12 items-center justify-center rounded-[0.95rem] shadow-[0_8px_16px_-8px_rgb(0_0_0/0.8)] transition-transform duration-150 group-hover:scale-[1.06] group-active:scale-95 group-focus-visible:scale-[1.08] group-focus-visible:ring-[3px] group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-navy-950"
                style={{ background: `linear-gradient(145deg, ${d.c[0]}, ${d.c[1]})` }}
              >
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/30 via-white/5 to-transparent" />
                <d.Icone className="relative size-[22px] text-white drop-shadow" strokeWidth={2.4} />
              </span>
              <span className="text-[10px] font-semibold leading-none text-txt/90">
                {d.rotulo} <span className="tabular-nums text-dim">{d.n}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** O "widget" do topo: quantas faltam, a bateria em anel e a barra de proporções. */
function WidgetResumo({ contagem, onClick }: { contagem: Contagem; onClick: () => void }) {
  const carga = cargaDaBateria(contagem);
  const outros = contagem.ignorada + contagem.fora + contagem.apagada;
  const total = Math.max(contagem.total, 1);
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <button
      onClick={onClick}
      data-anel
      className="relative w-full cursor-pointer overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-white/[0.05] p-4 text-left shadow-card backdrop-blur-md transition-colors hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white"
      title="Ver as que faltam"
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-mut">Resumo → Anki</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[42px] font-extrabold leading-none tabular-nums text-gold [text-shadow:0_0_22px_rgb(224_168_62/0.35)]">
              {contagem.falta}
            </span>
            <span className="text-[13px] font-semibold leading-tight text-dim">
              {contagem.falta === 1 ? "questão falta" : "questões faltam"}
            </span>
          </p>
          <p className="mt-1.5 text-[11.5px] text-mut">
            <span className="font-semibold text-green">{contagem.no_anki}</span> já no Anki
            {outros > 0 && <> · {outros} fora da conta</>}
          </p>
        </div>
        <AnelCarga pct={carga} />
      </div>
      <div className="mt-3.5 flex h-2 gap-[2px] overflow-hidden rounded-full bg-white/10">
        {contagem.no_anki > 0 && <span className="rounded-full bg-green" style={{ width: pct(contagem.no_anki) }} />}
        {contagem.falta > 0 && <span className="rounded-full bg-gold" style={{ width: pct(contagem.falta) }} />}
        {outros > 0 && <span className="rounded-full bg-mut/60" style={{ width: pct(outros) }} />}
      </div>
    </button>
  );
}

function AnelCarga({ pct }: { pct: number }) {
  const r = 26;
  const volta = 2 * Math.PI * r;
  return (
    <span className="relative flex size-[68px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--color-green)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * volta} ${volta}`}
        />
      </svg>
      <span className="text-center leading-none">
        <span className="block text-[15px] font-extrabold tabular-nums text-txt">{pct}%</span>
        <span className="text-[8.5px] font-bold uppercase tracking-wide text-mut">no Anki</span>
      </span>
    </span>
  );
}

function IconeApp({
  app,
  cores,
  refCb,
  onFocus,
  onClick,
}: {
  app: AppMateria;
  cores: readonly [string, string];
  refCb: (el: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onClick: () => void;
}) {
  const { falta, no_anki, total } = app.contagem;
  const carga = cargaDaBateria(app.contagem);
  return (
    <button
      ref={refCb}
      onFocus={onFocus}
      onClick={onClick}
      data-anel
      className="group flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-2xl outline-none"
      aria-label={`${app.nome}: ${pl(falta, "falta", "faltam")}, ${no_anki} no Anki`}
      title={`${app.nome} — ${pl(falta, "falta", "faltam")} · ${no_anki} no Anki · ${total} no resumo`}
    >
      <span
        className="relative flex aspect-square w-[74%] max-w-[76px] items-center justify-center rounded-[1.35rem] text-[30px] shadow-[0_10px_20px_-8px_rgb(0_0_0/0.75)] transition-transform duration-150 group-hover:scale-[1.06] group-active:scale-95 group-focus-visible:scale-[1.08] group-focus-visible:ring-[3px] group-focus-visible:ring-white group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-navy-950"
        style={{ background: `linear-gradient(145deg, ${cores[0]}, ${cores[1]})` }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/30 via-white/5 to-transparent" />
        <span className="relative leading-none drop-shadow-[0_2px_3px_rgb(0_0_0/0.35)]">{app.icone}</span>
        {falta > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-extrabold tabular-nums text-navy-950 shadow-[0_2px_6px_rgb(0_0_0/0.5)] ring-2 ring-navy-950">
            {falta > 99 ? "99+" : falta}
          </span>
        ) : (
          total > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-[22px] items-center justify-center rounded-full bg-green text-navy-950 shadow-[0_2px_6px_rgb(0_0_0/0.5)] ring-2 ring-navy-950">
              <Check className="size-3.5" strokeWidth={3.5} />
            </span>
          )
        )}
      </span>
      <span className="line-clamp-2 w-full text-center text-[10.5px] font-semibold leading-tight text-txt/90">
        {app.nome}
      </span>
      <span className="h-[3px] w-10 overflow-hidden rounded-full bg-white/12" aria-hidden>
        <span className="block h-full rounded-full bg-green" style={{ width: `${carga}%` }} />
      </span>
    </button>
  );
}

/* ───────────────────────────── app (os quadradinhos) ───────────────────────────── */

/** As questões de um escopo: a matéria do app ou todas (o dock). */
function itensDoEscopo(dados: DadosCelular, escopo: string): ItemResumo[] {
  if (escopo === ESCOPO_TUDO) return dados.itens;
  return dados.apps.find((a) => a.materiaId === escopo)?.itens ?? [];
}

function BarraDoApp({
  voltar,
  titulo,
  subtitulo,
  icone,
  direita,
}: {
  voltar: () => void;
  titulo: string;
  subtitulo: ReactNode;
  icone?: ReactNode;
  direita?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 px-2.5 pb-2 pt-1">
      <button
        onClick={voltar}
        className="cursor-pointer rounded-full p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-txt"
        aria-label="Voltar"
        title="Voltar (Esc)"
      >
        <ChevronLeft className="size-5" />
      </button>
      {icone}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold leading-tight text-txt">{titulo}</p>
        <p className="truncate text-[11px] text-mut">{subtitulo}</p>
      </div>
      {direita}
    </div>
  );
}

function TelaApp({
  animacao,
  dados,
  escopo,
  filtro,
  focoQuestao,
  mudarFiltro,
  abrirQuestao,
  voltar,
  teclaDaTela,
}: {
  animacao: string;
  dados: DadosCelular;
  escopo: string;
  filtro: FiltroCelular;
  focoQuestao: string | null;
  mudarFiltro: (f: FiltroCelular) => void;
  abrirQuestao: (questaoId: string) => void;
  voltar: () => void;
  teclaDaTela: TeclaDaTela;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const rolagemRef = useRef<HTMLDivElement>(null);
  const indiceApp = dados.apps.findIndex((a) => a.materiaId === escopo);
  const app = indiceApp >= 0 ? dados.apps[indiceApp] : undefined;
  const todos = escopo === ESCOPO_TUDO;
  const itens = itensDoEscopo(dados, escopo);
  const contagem = useMemo(() => contar(itens), [itens]);
  const secoes = useMemo(
    () =>
      secoesPorAssunto(
        itens.filter((it) => passaNoFiltro(it.estado, filtro)),
        dados.topicoPorId,
        dados.ordemMaterias,
        dados.rankTopico
      ),
    [itens, filtro, dados.topicoPorId, dados.ordemMaterias, dados.rankTopico]
  );
  const lista = useMemo(() => secoes.flatMap((s) => s.itens), [secoes]);
  const iconeDaMateria = useMemo(
    () => new Map(dados.apps.map((a) => [a.materiaId, a.icone])),
    [dados.apps]
  );
  refs.current.length = lista.length;

  // Ao abrir (ou voltar de uma questão), o foco vai para a questão de onde saiu;
  // trocar o filtro recomeça do topo.
  useEffect(() => {
    const i = focoQuestao ? lista.findIndex((it) => it.questaoId === focoQuestao) : -1;
    const el = refs.current[i >= 0 ? i : 0];
    el?.focus({ preventScroll: true });
    if (i >= 0) el?.scrollIntoView({ block: "center" });
    else rolagemRef.current?.scrollTo({ top: 0 });
    // só na montagem e ao trocar o filtro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  teclaDaTela.current = (e) => {
    const dir = DIRECAO[e.key];
    if (dir) {
      const atual = refs.current.indexOf(document.activeElement as HTMLButtonElement);
      focar(refs.current[moverNaGrade(refs.current, atual, dir)]);
      return true;
    }
    if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
      refs.current[0]?.click();
      return true;
    }
    return false;
  };

  const cores = app ? CORES_APP[indiceApp % CORES_APP.length] : (["#6fb3ec", "#24569c"] as const);

  return (
    <div className={`${animacao} flex min-h-0 flex-1 flex-col`}>
      <BarraDoApp
        voltar={voltar}
        titulo={todos ? "Todas as matérias" : (app?.nome ?? "Matéria")}
        subtitulo={
          <>
            <span className="font-semibold text-gold">{pl(contagem.falta, "falta", "faltam")}</span> ·{" "}
            <span className="font-semibold text-green">{contagem.no_anki} no Anki</span>
            {contagem.total > contagem.falta + contagem.no_anki && (
              <> · {contagem.total - contagem.falta - contagem.no_anki} fora da conta</>
            )}
          </>
        }
        icone={
          <span
            className="relative flex size-9 shrink-0 items-center justify-center rounded-[0.7rem] text-lg shadow-[0_6px_12px_-6px_rgb(0_0_0/0.8)]"
            style={{ background: `linear-gradient(145deg, ${cores[0]}, ${cores[1]})` }}
          >
            {todos ? <LayoutGrid className="size-[18px] text-white" /> : app?.icone}
          </span>
        }
      />

      {/* filtro: como as abas de um app */}
      <div className="mx-3 mb-2.5 grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-white/[0.06] p-1" role="tablist">
        {FILTROS.map((f) => {
          const ativo = f.valor === filtro;
          const n = f.valor === "todas" ? contagem.total : contagem[f.valor];
          return (
            <button
              key={f.valor}
              role="tab"
              aria-selected={ativo}
              onClick={() => mudarFiltro(f.valor)}
              className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg py-1.5 text-[11.5px] font-semibold transition-colors ${
                ativo ? "bg-navy-600 text-txt shadow-[0_2px_8px_rgb(0_0_0/0.35)]" : "text-dim hover:text-txt"
              }`}
            >
              {f.rotulo}
              <span
                className={`tabular-nums ${
                  ativo ? (f.valor === "falta" ? "text-gold" : f.valor === "no_anki" ? "text-green" : "text-dim") : "text-mut"
                }`}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <div ref={rolagemRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        {lista.length === 0 ? (
          <Aviso
            icone={filtro === "falta" ? "🎉" : "🗂️"}
            titulo={filtro === "falta" ? "Nada faltando aqui" : "Nenhuma questão"}
            texto={
              filtro === "falta"
                ? `Tudo o que está no resumo${todos ? "" : " desta matéria"} já foi para o Anki (ou ficou de fora).`
                : "Nenhuma questão com este filtro."
            }
          />
        ) : (
          secoes.map((s) => {
            const faltam = s.itens.filter((it) => it.estado === "falta").length;
            return (
              <section key={s.chave} className="mb-4">
                <h3 className="sticky top-0 z-10 -mx-3 mb-2 flex items-center gap-1.5 bg-navy-950/80 px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-dim backdrop-blur-md">
                  {todos && <span className="text-xs normal-case">{iconeDaMateria.get(s.materiaId ?? "") ?? "📄"}</span>}
                  <span className="min-w-0 flex-1 truncate" title={s.titulo}>
                    {s.titulo}
                  </span>
                  {faltam > 0 && (
                    <span className="shrink-0 rounded-full bg-gold/15 px-1.5 py-px text-[10px] tabular-nums text-gold">
                      {faltam}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {s.itens.map((it) => {
                    const i = lista.indexOf(it);
                    return (
                      <Quadradinho
                        key={it.questaoId}
                        item={it}
                        refCb={(el) => {
                          refs.current[i] = el;
                        }}
                        onClick={() => abrirQuestao(it.questaoId)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

function Quadradinho({
  item,
  refCb,
  onClick,
}: {
  item: ItemResumo;
  refCb: (el: HTMLButtonElement | null) => void;
  onClick: () => void;
}) {
  const info = ESTADO[item.estado];
  const rotulo = item.codigo ?? "Questão";
  return (
    <button
      ref={refCb}
      onClick={onClick}
      data-anel
      className={`group relative flex aspect-[4/5] min-w-0 cursor-pointer flex-col rounded-2xl border p-2 text-left transition duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-95 focus-visible:scale-[1.05] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950 ${
        info.apagado ? "opacity-60" : ""
      }`}
      style={{ background: info.fundo, borderColor: info.borda, borderStyle: info.tracejado ? "dashed" : "solid" }}
      aria-label={`${rotulo} — ${info.rotulo}${item.acertou === false ? " — você errou" : ""}: ${item.recorte}`}
      title={item.recorte}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-full"
          style={{ background: `color-mix(in srgb, ${info.cor} 24%, transparent)`, color: info.cor }}
        >
          <info.Icone className="size-3" strokeWidth={2.8} />
        </span>
        {item.acertou === false && (
          <span className="rounded-md bg-red/20 px-1 py-px text-[8.5px] font-extrabold uppercase tracking-wide text-red">
            errei
          </span>
        )}
      </span>
      <span className="mt-1.5 line-clamp-4 text-[10.5px] leading-[1.35] text-txt/90">{item.recorte}</span>
      <span className="mt-auto truncate pt-1 text-[9.5px] font-bold tabular-nums tracking-tight" style={{ color: info.cor }}>
        {rotulo}
        {item.ano ? ` · ${item.ano}` : ""}
      </span>
    </button>
  );
}

/* ───────────────────────────── questão aberta ───────────────────────────── */

function dataCurta(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** De onde veio a cor — a linha embaixo do estado. */
function explicacaoDoEstado(item: ItemResumo): string {
  const m = item.marca;
  const quando = dataCurta(m?.em);
  switch (item.estado) {
    case "no_anki":
      if (m?.origem === "importacao") return `Importada pela skill${quando ? ` em ${quando}` : ""}.`;
      if (m?.origem === "anki") return `Achada num card do Anki${item.codigo ? ` (${item.codigo})` : ""}.`;
      return `Você marcou${quando ? ` em ${quando}` : ""}.`;
    case "ignorada":
      return m?.origem === "site" ? `Você marcou que não vai importar${quando ? ` (${quando})` : ""}.` : "A importação deixou de fora.";
    case "fora":
      return "Fora do edital do concurso ativo — a importação só leva se você pedir.";
    case "apagada":
      return "A questão saiu do site; o trecho ainda está no resumo.";
    default:
      return "Ainda não virou card no Anki.";
  }
}

function TelaQuestao({
  animacao,
  dados,
  tela,
  irParaQuestao,
  voltar,
  onMarcar,
  onEditar,
  teclaDaTela,
}: {
  animacao: string;
  dados: DadosCelular;
  tela: Extract<TelaCelular, { tipo: "questao" }>;
  irParaQuestao: (questaoId: string) => void;
  voltar: () => void;
  onMarcar: (item: ItemResumo, status: QuestaoAnkiStatus | null) => void;
  onEditar: (item: ItemResumo) => void;
  teclaDaTela: TeclaDaTela;
}) {
  const rolagemRef = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const [lado, setLado] = useState<1 | -1 | 0>(0);

  // A fila de anterior/próxima = o app de onde veio, com o mesmo filtro. A questão
  // aberta fica na fila mesmo que a marca a tire do filtro (ex.: marcou "no Anki"
  // dentro de "Faltam"), para não sumir debaixo do dedo.
  const fila = useMemo(() => {
    let base = itensDoEscopo(dados, tela.escopo);
    if (!base.some((it) => it.questaoId === tela.questaoId)) base = dados.itens;
    return secoesPorAssunto(
      base.filter((it) => passaNoFiltro(it.estado, tela.filtro) || it.questaoId === tela.questaoId),
      dados.topicoPorId,
      dados.ordemMaterias,
      dados.rankTopico
    ).flatMap((s) => s.itens);
  }, [dados, tela.escopo, tela.filtro, tela.questaoId]);
  const pos = fila.findIndex((it) => it.questaoId === tela.questaoId);
  const item = pos >= 0 ? fila[pos] : undefined;

  function ir(d: 1 | -1) {
    const alvo = fila[pos + d];
    if (!alvo) return;
    setLado(d);
    irParaQuestao(alvo.questaoId);
  }

  useEffect(() => {
    rolagemRef.current?.scrollTo({ top: 0 });
  }, [tela.questaoId]);

  teclaDaTela.current = (e) => {
    if (e.key === "ArrowLeft") ir(-1);
    else if (e.key === "ArrowRight") ir(1);
    else if (e.key === "ArrowDown") rolagemRef.current?.scrollBy({ top: 80, behavior: "smooth" });
    else if (e.key === "ArrowUp") rolagemRef.current?.scrollBy({ top: -80, behavior: "smooth" });
    else return false;
    return true;
  };

  if (!item) {
    return (
      <div className={`${animacao} flex min-h-0 flex-1 flex-col`}>
        <BarraDoApp voltar={voltar} titulo="Questão" subtitulo={dados.buscando ? "Procurando no resumo…" : "Não está no resumo"} />
        {dados.buscando ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <Aviso icone="🫥" titulo="Essa questão não está no resumo" texto="O trecho dela foi apagado (ou ainda está sendo salvo)." />
        )}
      </div>
    );
  }

  const info = ESTADO[item.estado];
  const topico = item.topicoId ? dados.topicoPorId.get(item.topicoId) : undefined;
  const app = dados.apps.find((a) => a.materiaId === item.materiaId);
  const meta = [item.banca, item.ano].filter(Boolean).join(" · ");

  return (
    <div
      className={`${animacao} flex min-h-0 flex-1 flex-col`}
      onTouchStart={(e) => {
        const t = e.touches[0];
        toque.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const ini = toque.current;
        toque.current = null;
        if (!ini) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - ini.x;
        if (Math.abs(dx) > 70 && Math.abs(t.clientY - ini.y) < 45) ir(dx < 0 ? 1 : -1);
      }}
    >
      <BarraDoApp
        voltar={voltar}
        titulo={item.codigo ?? "Questão"}
        subtitulo={topico?.titulo ?? "Assunto não encontrado"}
        direita={
          <div className="flex shrink-0 items-center">
            <span className="mr-0.5 text-[11px] tabular-nums text-mut">
              {pos + 1}/{fila.length}
            </span>
            <button
              onClick={() => ir(-1)}
              disabled={pos === 0}
              className="cursor-pointer rounded-full p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-txt disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Questão anterior"
              title="Anterior (←)"
            >
              <ChevronLeft className="size-4.5" />
            </button>
            <button
              onClick={() => ir(1)}
              disabled={pos === fila.length - 1}
              className="cursor-pointer rounded-full p-1.5 text-dim transition-colors hover:bg-white/10 hover:text-txt disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Próxima questão"
              title="Próxima (→)"
            >
              <ChevronRight className="size-4.5" />
            </button>
          </div>
        }
      />

      <div
        key={item.questaoId}
        ref={rolagemRef}
        className="celular-deslizar scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3"
        style={{ "--de": `${lado * 26}px` } as CSSProperties}
      >
        {/* o estado e o que dá para fazer com ele */}
        <div className="rounded-2xl border p-3" style={{ background: info.fundo, borderColor: info.borda }}>
          <div className="flex items-center gap-2">
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: `color-mix(in srgb, ${info.cor} 24%, transparent)`, color: info.cor }}
            >
              <info.Icone className="size-4" strokeWidth={2.6} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold leading-tight" style={{ color: info.cor }}>
                {info.rotulo}
              </p>
              <p className="text-[11px] leading-snug text-dim">{explicacaoDoEstado(item)}</p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {item.estado !== "no_anki" && item.estado !== "apagada" && (
              <BotaoCelular tom="verde" onClick={() => onMarcar(item, "no_anki")}>
                <Check className="size-3.5" strokeWidth={3} /> Já está no Anki
              </BotaoCelular>
            )}
            {(item.estado === "falta" || item.estado === "fora") && (
              <BotaoCelular onClick={() => onMarcar(item, "ignorada")}>
                <EyeOff className="size-3.5" /> Não vou importar
              </BotaoCelular>
            )}
            {(item.estado === "no_anki" || item.estado === "ignorada") && (
              <BotaoCelular onClick={() => onMarcar(item, null)}>
                <RotateCcw className="size-3.5" /> Voltar para "falta"
              </BotaoCelular>
            )}
            {item.estado === "apagada" && (
              <BotaoCelular onClick={() => onEditar(item)}>
                <Trash2 className="size-3.5" /> Tirar o trecho do resumo
              </BotaoCelular>
            )}
          </div>
        </div>

        {/* de onde é */}
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10.5px] font-semibold">
          {app && (
            <Etiqueta>
              {app.icone} {app.nome}
            </Etiqueta>
          )}
          {meta && <Etiqueta>{meta}</Etiqueta>}
          {item.tipo && <Etiqueta>{item.tipo === "multipla" ? "Múltipla escolha" : "Certo ou errado"}</Etiqueta>}
          {item.acertou === false && <Etiqueta tom="vermelho">Você errou</Etiqueta>}
          {item.acertou === true && <Etiqueta tom="verde">Você acertou</Etiqueta>}
        </div>

        {/* o trecho, como está no resumo */}
        <div className="mt-3 rounded-2xl border border-line/50 bg-navy-900/75 px-3 py-2.5">
          {item.html.trim() ? (
            <div className="conteudo-lei" style={{ fontSize: "13.5px" }} dangerouslySetInnerHTML={{ __html: item.html }} />
          ) : (
            <p className="text-xs text-mut">O trecho está vazio.</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-2 border-t border-white/[0.06] px-3 pt-2.5">
        <BotaoCelular largo onClick={() => onEditar(item)}>
          <PencilLine className="size-3.5" /> Editar trecho
        </BotaoCelular>
        {item.topicoId && (
          <a
            href={`/questoes/${item.topicoId}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-dim transition-colors hover:bg-white/10 hover:text-txt"
            title="Abre o caderno de questões do assunto (nova aba)"
          >
            <ExternalLink className="size-3.5" /> Caderno
          </a>
        )}
      </div>
    </div>
  );
}

function BotaoCelular({
  tom = "neutro",
  largo = false,
  onClick,
  children,
}: {
  tom?: "verde" | "neutro";
  largo?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ${
        largo ? "flex-1" : ""
      } ${
        tom === "verde"
          ? "border-green/40 bg-green/15 text-green hover:bg-green/25"
          : "border-white/10 bg-white/[0.05] text-dim hover:bg-white/10 hover:text-txt"
      }`}
    >
      {children}
    </button>
  );
}

function Etiqueta({ tom, children }: { tom?: "verde" | "vermelho"; children: ReactNode }) {
  const cls =
    tom === "verde"
      ? "bg-green/15 text-green"
      : tom === "vermelho"
        ? "bg-red/15 text-red"
        : "bg-white/[0.07] text-dim";
  return <span className={`rounded-full px-2 py-0.5 ${cls}`}>{children}</span>;
}
