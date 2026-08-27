import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * Grifos (sublinhados) do aluno — igual ao que ele faz na prova, marcando palavras.
 * Cada grifo é um intervalo de caracteres [início, fim) dentro do texto do campo
 * (`texto_associado` ou `enunciado`). Ficam salvos no banco (coluna `grifos` jsonb),
 * por campo, pra sincronizar entre celular e computador.
 *
 * Interação (fácil, mobile + desktop): seleciona o trecho → aparece um botãozinho
 * "Sublinhar" (o `GrifosLayer`, um só por página) → tocou, sublinhou. Toca de novo num
 * trecho já sublinhado → remove.
 *
 * Por que um layer único com `selectionchange`? No celular a seleção nativa é feita com
 * alças (handles) que ficam FORA do texto, então ouvir `touchend` no próprio bloco não
 * pega o gesto. Um único listener de `selectionchange` no documento captura a seleção de
 * qualquer forma — e é 1 listener só, mesmo com milhares de questões na tela.
 */

export type Grifo = [number, number];
export type CampoGrifavel = "texto_associado" | "enunciado";

/** Lê os grifos de um campo a partir do `q.grifos` (jsonb solto), validando o formato. */
export function grifosDoCampo(grifos: unknown, campo: CampoGrifavel): Grifo[] {
  if (!grifos || typeof grifos !== "object") return [];
  const arr = (grifos as Record<string, unknown>)[campo];
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (r): r is Grifo =>
      Array.isArray(r) &&
      r.length === 2 &&
      typeof r[0] === "number" &&
      typeof r[1] === "number" &&
      r[1] > r[0],
  );
}

/** Devolve o objeto `grifos` inteiro com o campo atualizado (ou removido, se vazio). */
export function comCampoAtualizado(
  grifos: unknown,
  campo: CampoGrifavel,
  novos: Grifo[],
): Record<string, Grifo[]> | null {
  const base: Record<string, Grifo[]> =
    grifos && typeof grifos === "object" ? { ...(grifos as Record<string, Grifo[]>) } : {};
  if (novos.length) base[campo] = novos;
  else delete base[campo];
  return Object.keys(base).length ? base : null;
}

/** Une intervalos que se sobrepõem/encostam, mantendo a lista ordenada e enxuta. */
export function unir(ranges: Grifo[]): Grifo[] {
  const ord = ranges.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out: Grifo[] = [];
  for (const [s, e] of ord) {
    const ult = out[out.length - 1];
    if (ult && s <= ult[1]) ult[1] = Math.max(ult[1], e);
    else out.push([s, e]);
  }
  return out;
}

// ---------- Texto associado: parte texto / parte imagem ----------
export type Parte =
  | { tipo: "texto"; texto: string; base: number }
  | { tipo: "img"; url: string };

/**
 * Quebra o texto associado em partes de texto (com o deslocamento de caractere onde
 * começam) e imagens (marcador "[imagem: URL]"). O `base` é essencial pros grifos:
 * é a posição do trecho dentro da string original.
 */
export function partesDeTexto(s: string): Parte[] {
  const partes: Parte[] = [];
  const re = /\[imagem:\s*(\S+?)\s*\]/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > ultimo) partes.push({ tipo: "texto", texto: s.slice(ultimo, m.index), base: ultimo });
    partes.push({ tipo: "img", url: m[1] });
    ultimo = re.lastIndex;
  }
  if (ultimo < s.length) partes.push({ tipo: "texto", texto: s.slice(ultimo), base: ultimo });
  return partes.length ? partes : [{ tipo: "texto", texto: s, base: 0 }];
}

// ---------- Tamanho de fonte do "Texto associado" (global, salvo no aparelho) ----------
// É uma preferência de exibição (não conteúdo), então localStorage basta. Global: vale
// pra todas as questões, e todos os blocos reagem juntos via useSyncExternalStore.
const FONTE_KEY = "ta-fonte-px";
export const FONTE_MIN = 12;
export const FONTE_MAX = 34;
export const FONTE_PASSO = 2;
const FONTE_PADRAO = 14;

function lerFonte(): number {
  try {
    const v = Number(localStorage.getItem(FONTE_KEY));
    if (Number.isFinite(v) && v >= FONTE_MIN && v <= FONTE_MAX) return v;
  } catch {
    /* localStorage indisponível */
  }
  return FONTE_PADRAO;
}
let fonteAtual = lerFonte();
const fonteSubs = new Set<() => void>();
function setFonte(px: number) {
  fonteAtual = Math.max(FONTE_MIN, Math.min(FONTE_MAX, px));
  try {
    localStorage.setItem(FONTE_KEY, String(fonteAtual));
  } catch {
    /* ignore */
  }
  fonteSubs.forEach((f) => f());
}
export function useFonteTextoAssociado(): [number, (px: number) => void] {
  const px = useSyncExternalStore(
    (cb) => {
      fonteSubs.add(cb);
      return () => fonteSubs.delete(cb);
    },
    () => fonteAtual,
    () => FONTE_PADRAO,
  );
  return [px, setFonte];
}

// ---------- Registro dos campos grifáveis (pro layer achar quem salvar) ----------
type Entrada = { grifos: Grifo[]; onChange: (novos: Grifo[]) => void };
const registro = new Map<string, Entrada>();

// ---------- Cálculo de deslocamento a partir da seleção ----------
/** Deslocamento absoluto (na string do campo) de um ponto da seleção. */
function deslocAbs(node: Node, offset: number): number | null {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  const holder = el?.closest?.("[data-rs]") as HTMLElement | null;
  if (!holder) return null;
  const base = Number(holder.dataset.rs);
  if (Number.isNaN(base)) return null;
  if (node.nodeType === Node.TEXT_NODE) return base + offset;
  const txt = holder.textContent ?? "";
  return base + (offset > 0 ? txt.length : 0);
}

/** Acha o bloco grifável (`data-grifo-chave`) que contém um nó da seleção. */
function campoDe(node: Node | null): HTMLElement | null {
  if (!node) return null;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  return (el?.closest?.("[data-grifo-chave]") as HTMLElement | null) ?? null;
}

/**
 * Layer único por página: escuta a seleção e mostra o botão "Sublinhar" ancorado nela.
 * Não recebe props — descobre o campo pela seleção e salva pelo registro.
 */
export function GrifosLayer() {
  const [botao, setBotao] = useState<{ x: number; y: number; chave: string; faixa: Grifo } | null>(
    null,
  );
  const raf = useRef(0);

  useEffect(() => {
    function avaliar() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setBotao(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const campoIni = campoDe(range.startContainer);
      const campoFim = campoDe(range.endContainer);
      if (!campoIni || campoIni !== campoFim) {
        setBotao(null);
        return;
      }
      const chave = campoIni.dataset.grifoChave;
      if (!chave) {
        setBotao(null);
        return;
      }
      const a = deslocAbs(range.startContainer, range.startOffset);
      const b = deslocAbs(range.endContainer, range.endOffset);
      if (a == null || b == null) {
        setBotao(null);
        return;
      }
      const ini = Math.min(a, b);
      const fim = Math.max(a, b);
      if (fim <= ini) {
        setBotao(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setBotao({ x: rect.left + rect.width / 2, y: rect.bottom, chave, faixa: [ini, fim] });
    }
    function agendar() {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(avaliar);
    }
    document.addEventListener("selectionchange", agendar);
    window.addEventListener("scroll", agendar, true);
    return () => {
      document.removeEventListener("selectionchange", agendar);
      window.removeEventListener("scroll", agendar, true);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  function sublinhar() {
    if (!botao) return;
    const ent = registro.get(botao.chave);
    if (ent) ent.onChange(unir([...ent.grifos, botao.faixa]));
    setBotao(null);
    window.getSelection()?.removeAllRanges();
  }

  if (!botao) return null;
  return createPortal(
    <button
      type="button"
      // pointerdown (não click): dispara antes de a seleção ser limpa pelo toque, e o
      // preventDefault impede o toque de tirar a seleção / roubar o foco.
      onPointerDown={(e) => {
        e.preventDefault();
        sublinhar();
      }}
      style={{
        position: "fixed",
        left: botao.x,
        top: botao.y,
        transform: "translate(-50%, 10px)",
        zIndex: 9999,
      }}
      className="flex items-center gap-1 rounded-lg bg-gold px-3.5 py-2 text-xs font-bold text-navy-900 shadow-lg shadow-black/50"
    >
      <span className="underline decoration-2 underline-offset-2">Sublinhar</span>
    </button>,
    document.body,
  );
}

// ---------- Componente do texto grifável ----------
export function Grifavel({
  qid,
  campo,
  partes,
  grifos,
  onChange,
  className,
  style,
}: {
  qid: string;
  campo: CampoGrifavel;
  partes: Parte[];
  grifos: Grifo[];
  onChange: (novos: Grifo[]) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chave = `${qid}:${campo}`;

  // Mantém o registro sempre com os grifos/onChange atuais (o layer usa na hora de salvar).
  useEffect(() => {
    registro.set(chave, { grifos, onChange });
    return () => {
      registro.delete(chave);
    };
  });

  // Toque/clique num trecho já sublinhado remove a faixa inteira que o contém.
  function aoClicar(e: ReactMouseEvent) {
    const u = (e.target as HTMLElement).closest?.("u[data-rs]") as HTMLElement | null;
    if (!u || !rootRef.current?.contains(u)) return;
    const pos = Number(u.dataset.rs);
    if (Number.isNaN(pos)) return;
    const novos = grifos.filter(([s, en]) => !(s <= pos && pos < en));
    if (novos.length !== grifos.length) onChange(novos);
  }

  return (
    <div ref={rootRef} className={className} style={style} data-grifo-chave={chave} onClick={aoClicar}>
      {partes.map((p, i) =>
        p.tipo === "img" ? (
          <a
            key={i}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block w-fit"
          >
            <img
              src={p.url}
              alt="Texto associado (imagem)"
              loading="lazy"
              className="max-w-full rounded border border-line"
            />
            <span className="mt-0.5 block text-[10px] text-mut underline">ver original</span>
          </a>
        ) : (
          <span key={i}>{segmentos(p.texto, p.base, grifos)}</span>
        ),
      )}
    </div>
  );
}

/**
 * Fatia um trecho de texto (que começa em `base`) nos pedaços grifados e normais,
 * pelos limites dos grifos. Lógica pura (sem DOM) — o `segmentos` só a transforma em
 * `<u>`/`<span>`. `ini` é o deslocamento absoluto do pedaço (vira o `data-rs`).
 */
export function fatiar(
  texto: string,
  base: number,
  grifos: Grifo[],
): { ini: number; texto: string; grifado: boolean }[] {
  const fim = base + texto.length;
  const cortes = new Set<number>([base, fim]);
  for (const [s, e] of grifos) {
    if (e <= base || s >= fim) continue;
    cortes.add(Math.max(s, base));
    cortes.add(Math.min(e, fim));
  }
  const ord = [...cortes].sort((a, b) => a - b);
  const out: { ini: number; texto: string; grifado: boolean }[] = [];
  for (let i = 0; i < ord.length - 1; i++) {
    const a = ord[i];
    const b = ord[i + 1];
    if (b <= a) continue;
    out.push({
      ini: a,
      texto: texto.slice(a - base, b - base),
      grifado: grifos.some(([s, e]) => s <= a && e >= b),
    });
  }
  return out;
}

/** Divide um trecho de texto em pedaços grifados (`<u>`) e normais (`<span>`),
 *  cada um com `data-rs` = deslocamento absoluto (pro cálculo da seleção). */
function segmentos(texto: string, base: number, grifos: Grifo[]): ReactNode[] {
  return fatiar(texto, base, grifos).map((seg) =>
    seg.grifado ? (
      <u
        key={seg.ini}
        data-rs={seg.ini}
        title="Toque para remover o grifo"
        className="cursor-pointer underline decoration-gold decoration-2 underline-offset-2"
      >
        {seg.texto}
      </u>
    ) : (
      <span key={seg.ini} data-rs={seg.ini}>
        {seg.texto}
      </span>
    ),
  );
}
