import { useEffect, useRef, useState, type ReactNode } from "react";
import { Highlighter, Eraser, Bookmark, BookmarkCheck, Check } from "lucide-react";
import { toast } from "sonner";
import type { TopicoTexto } from "@/types/db";
import {
  useAtualizarTopicoTexto,
  useRegistrarLeitura,
  useAtualizarMarcador,
} from "@/api/topicoTextos";

const CORES = [
  { nome: "Amarelo", valor: "rgba(232,185,62,0.40)", swatch: "#e8b93e" },
  { nome: "Verde", valor: "rgba(63,191,127,0.38)", swatch: "#3fbf7f" },
  { nome: "Azul", valor: "rgba(79,157,222,0.38)", swatch: "#4f9dde" },
  { nome: "Rosa", valor: "rgba(229,86,75,0.34)", swatch: "#e5564b" },
];

const FONTE_PADRAO = 18;
const FONTE_MIN = 14;
const FONTE_MAX = 28;
const FONTE_KEY = "leitor-fonte-px";

function fonteSalva(): number {
  const f = Number(localStorage.getItem(FONTE_KEY));
  return Number.isFinite(f) && f >= FONTE_MIN && f <= FONTE_MAX ? f : FONTE_PADRAO;
}

function blocos(el: HTMLElement): HTMLElement[] {
  return Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
}

/** Remove marcações visuais de UI ("parei aqui") antes de persistir o HTML. */
function limparHtml(bruto: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = bruto;
  tmp.querySelectorAll(".parei-aqui").forEach((n) => {
    n.classList.remove("parei-aqui");
    if (!n.getAttribute("class")) n.removeAttribute("class");
  });
  return tmp.innerHTML;
}

/** Título editável do texto (salva ao sair do campo). Usado no modal e na página. */
export function TituloTextoInput({ texto, className }: { texto: TopicoTexto; className?: string }) {
  const atualizar = useAtualizarTopicoTexto();
  const [titulo, setTitulo] = useState(texto.titulo);

  function salvarTitulo() {
    const t = titulo.trim() || "Texto de lei";
    if (t !== titulo) setTitulo(t);
    if (t === texto.titulo) return;
    atualizar.mutate({ id: texto.id, titulo: t });
  }

  return (
    <input
      value={titulo}
      onChange={(e) => setTitulo(e.target.value)}
      onBlur={salvarTitulo}
      className={
        className ??
        "w-full max-w-md rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold text-txt outline-none hover:bg-navy-700/60 focus:bg-navy-900"
      }
      placeholder="Título do texto"
    />
  );
}

interface TextoReaderProps {
  texto: TopicoTexto;
  /** Conteúdo ocupa toda a altura disponível (página dedicada). */
  paginaCheia?: boolean;
  /** Botões extras na barra de controles (ex.: abrir em tela cheia). */
  acoes?: ReactNode;
}

/**
 * Leitor/editor unificado do texto de lei: o texto fica sempre editável
 * (ler = marcar, ajustar, anotar), com salvamento automático, marca-texto,
 * tamanho de fonte ajustável, contagem de leituras e "parei aqui".
 */
export function TextoReader({ texto, paginaCheia = false, acoes }: TextoReaderProps) {
  const atualizar = useAtualizarTopicoTexto();
  const registrarLeitura = useRegistrarLeitura();
  const setMarcador = useAtualizarMarcador();

  const [fonte, setFonte] = useState(fonteSalva);
  const [leiturasLocal, setLeiturasLocal] = useState(texto.leituras);
  const [marcadorLocal, setMarcadorLocal] = useState<string | null>(texto.marcador);
  const [salvamento, setSalvamento] = useState<"salvo" | "pendente" | "salvando">("salvo");

  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(undefined);
  // último HTML digitado e último persistido: o editor some do DOM antes do
  // cleanup de unmount, então o flush final não pode depender do ref do editor.
  const htmlDigitadoRef = useRef<string | null>(null);
  const htmlSalvoRef = useRef(texto.conteudo);

  // Carrega o HTML uma vez (não a cada render, senão o cursor pula).
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = texto.conteudo || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto.id]);

  // Marca visualmente o bloco "parei aqui".
  useEffect(() => {
    const cont = editorRef.current;
    if (!cont) return;
    const bs = blocos(cont);
    bs.forEach((b) => b.classList.remove("parei-aqui"));
    if (marcadorLocal != null) {
      const alvo = bs[Number(marcadorLocal)];
      if (alvo) alvo.classList.add("parei-aqui");
    }
  }, [marcadorLocal, texto.id]);

  async function salvarAgora() {
    const bruto = editorRef.current ? editorRef.current.innerHTML : htmlDigitadoRef.current;
    if (bruto == null) return;
    const html = limparHtml(bruto);
    if (html === htmlSalvoRef.current) {
      setSalvamento("salvo");
      return;
    }
    setSalvamento("salvando");
    try {
      await atualizar.mutateAsync({ id: texto.id, conteudo: html });
      htmlSalvoRef.current = html;
      setSalvamento("salvo");
    } catch (err) {
      setSalvamento("pendente");
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const salvarRef = useRef(salvarAgora);
  salvarRef.current = salvarAgora;

  function agendarSalvar() {
    htmlDigitadoRef.current = editorRef.current?.innerHTML ?? htmlDigitadoRef.current;
    setSalvamento("pendente");
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => salvarRef.current(), 1200);
  }

  function salvarJa() {
    window.clearTimeout(timerRef.current);
    salvarRef.current();
  }

  // Flush ao fechar/trocar de aba e ao desmontar (fechar modal, sair da página).
  useEffect(() => {
    const aoOcultar = () => {
      if (document.visibilityState === "hidden") salvarRef.current();
    };
    document.addEventListener("visibilitychange", aoOcultar);
    return () => {
      document.removeEventListener("visibilitychange", aoOcultar);
      window.clearTimeout(timerRef.current);
      salvarRef.current();
    };
  }, []);

  function aplicarMarca(cor: string) {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, cor);
    agendarSalvar();
  }

  function apagarMarca() {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, "transparent");
    agendarSalvar();
  }

  function mudarFonte(delta: number) {
    setFonte((f) => {
      const nova = Math.min(FONTE_MAX, Math.max(FONTE_MIN, f + delta));
      localStorage.setItem(FONTE_KEY, String(nova));
      return nova;
    });
  }

  function contarLeitura() {
    setLeiturasLocal((n) => n + 1);
    registrarLeitura.mutate(
      { id: texto.id, leituras: leiturasLocal },
      { onError: (e) => toast.error(e instanceof Error ? e.message : String(e)) }
    );
  }

  function marcarAqui() {
    const scroll = scrollRef.current;
    const cont = editorRef.current;
    if (!scroll || !cont) return;
    const bs = blocos(cont);
    if (bs.length === 0) return;
    let idx = 0;
    for (let i = 0; i < bs.length; i++) {
      if (bs[i].offsetTop <= scroll.scrollTop + 8) idx = i;
    }
    const m = String(idx);
    setMarcadorLocal(m);
    setMarcador.mutate(
      { id: texto.id, marcador: m },
      { onError: (e) => toast.error(e instanceof Error ? e.message : String(e)) }
    );
    toast.success("Marquei onde você parou 📌");
  }

  function continuar() {
    const scroll = scrollRef.current;
    const cont = editorRef.current;
    if (!scroll || !cont || marcadorLocal == null) return;
    const alvo = blocos(cont)[Number(marcadorLocal)];
    if (alvo) scroll.scrollTo({ top: Math.max(0, alvo.offsetTop - 8), behavior: "smooth" });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2.5">
      {/* Barra única de controles: marca-texto, fonte, leituras, marcador */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-lg border border-line/60 bg-navy-900/60 px-2 py-1.5"
          title="Selecione um trecho do texto e toque numa cor"
        >
          <Highlighter className="size-3.5 text-mut" />
          {CORES.map((c) => (
            <button
              key={c.nome}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aplicarMarca(c.valor)}
              className="size-5 cursor-pointer rounded-md border border-line transition-transform hover:scale-110"
              style={{ background: c.swatch }}
              title={`Destacar em ${c.nome}`}
              aria-label={`Destacar em ${c.nome}`}
            />
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={apagarMarca}
            className="cursor-pointer rounded-md p-1 text-mut transition-colors hover:bg-navy-700 hover:text-txt"
            title="Remover o destaque da seleção"
            aria-label="Remover destaque"
          >
            <Eraser className="size-3.5" />
          </button>
        </div>

        <div className="flex items-center overflow-hidden rounded-lg border border-line">
          <button
            onClick={() => mudarFonte(-1)}
            className="cursor-pointer px-2 py-1.5 text-[11px] font-bold text-dim transition-colors hover:bg-navy-700 hover:text-txt"
            title="Diminuir fonte"
            aria-label="Diminuir fonte"
          >
            A−
          </button>
          <span className="min-w-6 text-center text-[11px] tabular-nums text-mut">{fonte}</span>
          <button
            onClick={() => mudarFonte(1)}
            className="cursor-pointer px-2 py-1.5 text-sm font-bold leading-none text-dim transition-colors hover:bg-navy-700 hover:text-txt"
            title="Aumentar fonte"
            aria-label="Aumentar fonte"
          >
            A+
          </button>
        </div>

        <span className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs text-dim">
          📖 <strong className="tabular-nums text-txt">{leiturasLocal}x</strong>
        </span>
        <button
          onClick={contarLeitura}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
          title="Registrar mais uma leitura completa"
        >
          <Check className="size-3.5" /> Li +1
        </button>

        {acoes}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-mut" aria-live="polite">
            {salvamento === "salvo" ? "Salvo ✓" : salvamento === "salvando" ? "Salvando…" : "Não salvo"}
          </span>
          <button
            onClick={marcarAqui}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
            title="Guardar o ponto onde você parou de ler"
          >
            <Bookmark className="size-3.5" /> <span className="max-sm:hidden">Parei aqui</span>
          </button>
          {marcadorLocal != null && (
            <button
              onClick={continuar}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold/15 px-2.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/25"
              title="Rolar até onde você parou"
            >
              <BookmarkCheck className="size-3.5" /> <span className="max-sm:hidden">Continuar</span>
            </button>
          )}
        </div>
      </div>

      {/* Texto sempre editável: marque, apague, anote direto na leitura */}
      <div
        ref={scrollRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) editorRef.current?.focus();
        }}
        className={`relative overflow-y-auto rounded-lg border border-line/50 bg-navy-950/40 p-4 sm:p-6 ${
          paginaCheia ? "min-h-0 flex-1" : "max-h-[58vh] min-h-[30vh]"
        }`}
      >
        <div
          ref={editorRef}
          className="conteudo-lei min-h-[24vh] outline-none"
          style={{ fontSize: `${fonte}px` }}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={agendarSalvar}
          onBlur={salvarJa}
          data-placeholder="Cole aqui o texto de lei e organize à vontade…"
        />
      </div>
    </div>
  );
}
