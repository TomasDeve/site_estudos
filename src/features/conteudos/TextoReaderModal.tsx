import { useEffect, useRef, useState } from "react";
import {
  Highlighter,
  Eraser,
  Bookmark,
  BookmarkCheck,
  Pencil,
  Eye,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";
import type { TopicoTexto } from "@/types/db";
import {
  useAtualizarTopicoTexto,
  useRegistrarLeitura,
  useAtualizarMarcador,
} from "@/api/topicoTextos";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

interface Props {
  texto: TopicoTexto;
  onClose: () => void;
}

const CORES = [
  { nome: "Amarelo", valor: "rgba(232,185,62,0.40)", swatch: "#e8b93e" },
  { nome: "Verde", valor: "rgba(63,191,127,0.38)", swatch: "#3fbf7f" },
  { nome: "Azul", valor: "rgba(79,157,222,0.38)", swatch: "#4f9dde" },
  { nome: "Rosa", valor: "rgba(229,86,75,0.34)", swatch: "#e5564b" },
];

function blocos(el: HTMLElement): HTMLElement[] {
  return Array.from(el.children).filter((c): c is HTMLElement => c instanceof HTMLElement);
}

export function TextoReaderModal({ texto, onClose }: Props) {
  const atualizar = useAtualizarTopicoTexto();
  const registrarLeitura = useRegistrarLeitura();
  const setMarcador = useAtualizarMarcador();

  const [modo, setModo] = useState<"ler" | "editar">(texto.conteudo ? "ler" : "editar");
  const [telaCheia, setTelaCheia] = useState(false);
  const [tituloLocal, setTituloLocal] = useState(texto.titulo);
  const [conteudoLocal, setConteudoLocal] = useState(texto.conteudo);
  const [leiturasLocal, setLeiturasLocal] = useState(texto.leituras);
  const [marcadorLocal, setMarcadorLocal] = useState<string | null>(texto.marcador);

  const scrollRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Ao entrar em edição, carrega o HTML uma vez (não a cada render, senão o cursor pula).
  useEffect(() => {
    if (modo === "editar" && editorRef.current) {
      editorRef.current.innerHTML = conteudoLocal || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  // Marca visualmente o bloco "parei aqui" no modo leitura.
  useEffect(() => {
    if (modo !== "ler") return;
    const cont = scrollRef.current?.querySelector<HTMLElement>(".conteudo-lei");
    if (!cont) return;
    const bs = blocos(cont);
    bs.forEach((b) => b.classList.remove("parei-aqui"));
    if (marcadorLocal != null) {
      const alvo = bs[Number(marcadorLocal)];
      if (alvo) alvo.classList.add("parei-aqui");
    }
  }, [modo, marcadorLocal, conteudoLocal]);

  function aplicarMarca(cor: string) {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, cor);
  }

  function apagarMarca() {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("hiliteColor", false, "transparent");
  }

  async function salvar() {
    const html = editorRef.current?.innerHTML ?? conteudoLocal;
    const titulo = tituloLocal.trim() || "Texto de lei";
    setConteudoLocal(html);
    setModo("ler");
    try {
      await atualizar.mutateAsync({ id: texto.id, conteudo: html, titulo });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function salvarTitulo() {
    const titulo = tituloLocal.trim() || "Texto de lei";
    if (titulo === texto.titulo) return;
    atualizar.mutate({ id: texto.id, titulo });
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
    const cont = scroll?.querySelector<HTMLElement>(".conteudo-lei");
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
    const cont = scroll?.querySelector<HTMLElement>(".conteudo-lei");
    if (!scroll || !cont || marcadorLocal == null) return;
    const alvo = blocos(cont)[Number(marcadorLocal)];
    if (alvo) scroll.scrollTo({ top: Math.max(0, alvo.offsetTop - 8), behavior: "smooth" });
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      fullscreen={telaCheia}
      title={
        <input
          value={tituloLocal}
          onChange={(e) => setTituloLocal(e.target.value)}
          onBlur={salvarTitulo}
          className="w-full max-w-md rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold text-txt outline-none hover:bg-navy-700/60 focus:bg-navy-900"
          placeholder="Título do texto"
        />
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        {/* Barra de controles */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            <button
              onClick={() => setModo("ler")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                modo === "ler" ? "bg-navy-600 text-txt" : "text-mut hover:text-txt"
              }`}
            >
              <Eye className="size-3.5" /> Ler
            </button>
            <button
              onClick={() => setModo("editar")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                modo === "editar" ? "bg-navy-600 text-txt" : "text-mut hover:text-txt"
              }`}
            >
              <Pencil className="size-3.5" /> Editar
            </button>
          </div>

          <button
            onClick={() => setTelaCheia((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
            title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
          >
            {telaCheia ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            <span className="max-sm:hidden">{telaCheia ? "Reduzir" : "Tela cheia"}</span>
          </button>

          <span className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs text-dim">
            📖 Lido <strong className="tabular-nums text-txt">{leiturasLocal}x</strong>
          </span>
          <button
            onClick={contarLeitura}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
          >
            <Check className="size-3.5" /> Li +1
          </button>

          {modo === "ler" && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={marcarAqui}
                className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
                title="Guardar o ponto onde você parou de ler"
              >
                <Bookmark className="size-3.5" /> Parei aqui
              </button>
              {marcadorLocal != null && (
                <button
                  onClick={continuar}
                  className="flex items-center gap-1.5 rounded-lg bg-gold/15 px-2.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/25"
                  title="Rolar até onde você parou"
                >
                  <BookmarkCheck className="size-3.5" /> Continuar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Toolbar de marca-texto (só na edição) */}
        {modo === "editar" && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line/60 bg-navy-900/60 p-2">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-mut">
              <Highlighter className="size-3.5" /> Marca-texto
            </span>
            {CORES.map((c) => (
              <button
                key={c.nome}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => aplicarMarca(c.valor)}
                className="size-6 rounded-md border border-line transition-transform hover:scale-110"
                style={{ background: c.swatch }}
                title={`Destacar em ${c.nome}`}
                aria-label={`Destacar em ${c.nome}`}
              />
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={apagarMarca}
              className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-mut transition-colors hover:text-txt"
              title="Remover o destaque da seleção"
            >
              <Eraser className="size-3.5" /> Limpar
            </button>
            <span className="ml-auto text-[11px] text-mut">
              Selecione o trecho e escolha uma cor.
            </span>
          </div>
        )}

        {/* Conteúdo */}
        <div
          ref={scrollRef}
          className={`relative overflow-y-auto rounded-lg border border-line/50 bg-navy-950/40 p-4 ${
            telaCheia ? "min-h-0 flex-1" : "max-h-[58vh] min-h-[30vh]"
          }`}
        >
          {modo === "ler" ? (
            conteudoLocal ? (
              <div
                className="conteudo-lei"
                // conteúdo do próprio usuário (app single-user, RLS por dono)
                dangerouslySetInnerHTML={{ __html: conteudoLocal }}
              />
            ) : (
              <p className="py-10 text-center text-sm text-mut">
                Sem conteúdo ainda. Clique em <strong className="text-dim">Editar</strong> e cole o
                texto de lei.
              </p>
            )
          ) : (
            <div
              ref={editorRef}
              className="conteudo-lei min-h-[24vh] outline-none"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Cole aqui o texto de lei e organize à vontade…"
            />
          )}
        </div>

        {/* Ações da edição */}
        {modo === "editar" && (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setModo("ler")}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvar} loading={atualizar.isPending}>
              <Check className="size-4" /> Salvar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
