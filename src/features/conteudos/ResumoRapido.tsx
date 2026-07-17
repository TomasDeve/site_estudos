import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, NotebookPen, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { Materia, TablesInsert, Topico, TopicoTexto } from "@/types/db";
import {
  TITULO_RESUMO_QUESTOES,
  useAtualizarTopicoTexto,
  useCriarTopicoTexto,
  useResumoQuestoes,
} from "@/api/topicoTextos";
import { useMaterias } from "@/api/materias";
import { Spinner } from "@/components/Spinner";
import { ChatIA } from "./ChatIA";

const MATERIA_KEY = "resumo-rapido-materia-id";

interface Props {
  /**
   * Caderno de um assunto: o resumo gruda no tópico e aparece nos textos dele.
   * Sem tópico (modo misturado), o painel tem um seletor de matéria e o resumo
   * vai para os "Resumos da matéria (geral)".
   */
  topico?: Topico;
}

/**
 * Botão flutuante presente durante toda a rolagem das páginas de questões.
 * Abre um bloco de notas que salva sozinho (debounce) em `topico_textos`,
 * reaproveitando o mesmo leitor/editor dos resumos do site — dá para abrir
 * depois em tela cheia, marcar com marca-texto etc. O botão "Verificar com IA"
 * manda o texto atual para a IA revisar (erros, lacunas, melhorias).
 */
export function ResumoRapido({ topico }: Props) {
  const [aberto, setAberto] = useState(false);
  // Depois de aberto uma vez, o painel só é escondido (não desmontado): o texto
  // digitado e o cursor sobrevivem ao fechar/abrir, sem corrida de salvamento.
  const [jaAbriu, setJaAbriu] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const { data: materias } = useMaterias();
  // Lê o texto puro atual do editor (registrado pelo EditorResumo montado).
  const pegarTextoRef = useRef<(() => string) | null>(null);

  function alternar() {
    setAberto((v) => !v);
    if (!jaAbriu) setJaAbriu(true);
  }

  const opcoes = useMemo(
    () =>
      (materias ?? [])
        .filter((m: Materia) => m.tipo === "normal")
        .sort((a: Materia, b: Materia) => a.nome.localeCompare(b.nome)),
    [materias]
  );
  const [materiaId, setMateriaId] = useState<string>(
    () => localStorage.getItem(MATERIA_KEY) ?? ""
  );
  const materiaEscolhida = topico
    ? null
    : (opcoes.find((m) => m.id === materiaId) ?? opcoes[0] ?? null);

  const destino = topico
    ? { topicoId: topico.id }
    : { materiaId: materiaEscolhida?.id };
  const { data: resumo, isLoading } = useResumoQuestoes(destino);

  // Nome da matéria em pauta (contexto para a revisão por IA).
  const materiaNome = topico
    ? (materias ?? []).find((m) => m.id === topico.materia_id)?.nome
    : materiaEscolhida?.nome;

  function escolherMateria(id: string) {
    setMateriaId(id);
    localStorage.setItem(MATERIA_KEY, id);
  }

  function abrirVerificacao() {
    const txt = pegarTextoRef.current?.().trim();
    if (!txt) {
      toast.error("Escreva algo no resumo antes de pedir a verificação.");
      return;
    }
    setVerificando(true);
  }

  // A linha nova segue a convenção do site: texto de tópico só tem topico_id;
  // resumo geral da matéria só tem materia_id. Ordem alta = fica no fim da lista.
  const linhaNova: TablesInsert<"topico_textos"> = topico
    ? { topico_id: topico.id, titulo: TITULO_RESUMO_QUESTOES, ordem: 999 }
    : { materia_id: materiaEscolhida?.id, titulo: TITULO_RESUMO_QUESTOES, ordem: 999 };

  // Remonta o editor ao trocar de destino, nunca no meio da digitação.
  const chave = topico ? `t-${topico.id}` : `m-${materiaEscolhida?.id ?? "nenhuma"}`;

  return (
    <>
      {jaAbriu && (
        <div
          className={`${
            aberto ? "flex" : "hidden"
          } fixed bottom-[4.75rem] right-3 z-40 max-h-[min(70dvh,32rem)] w-[min(100vw-1.5rem,26rem)] flex-col overflow-hidden rounded-card border border-line bg-navy-800 shadow-2xl sm:bottom-[5.5rem] sm:right-6`}
        >
          <div className="flex items-start gap-2 border-b border-line/40 px-3 py-2.5">
            <NotebookPen className="mt-0.5 size-4 shrink-0 text-gold" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight text-txt">Resumo rápido</p>
              {topico ? (
                <p className="truncate text-[11px] text-mut" title={topico.titulo}>
                  {topico.titulo}
                </p>
              ) : opcoes.length > 0 ? (
                <select
                  value={materiaEscolhida?.id ?? ""}
                  onChange={(e) => escolherMateria(e.target.value)}
                  className="mt-0.5 w-full max-w-full cursor-pointer rounded-md border border-line/60 bg-navy-950 px-1.5 py-1 text-[11px] text-dim outline-none focus:border-gold/60"
                  aria-label="Matéria do resumo"
                >
                  {opcoes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.icone} {m.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[11px] text-mut">Nenhuma matéria cadastrada.</p>
              )}
            </div>
            {resumo && (
              <a
                href={`/texto/${resumo.id}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-md p-1 text-mut transition-colors hover:bg-navy-700 hover:text-gold"
                title="Abrir em tela cheia (nova aba)"
                aria-label="Abrir resumo em tela cheia"
              >
                <ExternalLink className="size-3.5" />
              </a>
            )}
            <button
              onClick={() => setAberto(false)}
              className="shrink-0 cursor-pointer rounded-md p-1 text-mut transition-colors hover:bg-navy-700 hover:text-txt"
              aria-label="Fechar resumo"
            >
              <X className="size-4" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-5" />
            </div>
          ) : topico || materiaEscolhida ? (
            <EditorResumo
              key={chave}
              existente={resumo ?? null}
              linhaNova={linhaNova}
              ativo={aberto}
              pegarTextoRef={pegarTextoRef}
              onVerificar={abrirVerificacao}
            />
          ) : null}
        </div>
      )}

      <button
        onClick={alternar}
        className="fixed bottom-4 right-3 z-40 flex size-12 cursor-pointer items-center justify-center rounded-full bg-gold text-navy-950 shadow-lg shadow-navy-950/50 transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-6"
        title="Resumo rápido"
        aria-label={aberto ? "Fechar resumo rápido" : "Abrir resumo rápido"}
      >
        {aberto ? <X className="size-5" /> : <NotebookPen className="size-5" />}
      </button>

      {verificando && (
        <ChatIA
          titulo={
            <span className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-gold" /> Verificar resumo com IA
            </span>
          }
          chave={`resumo-${chave}`}
          montarPayload={() => ({
            materia: materiaNome ?? null,
            assunto: topico?.titulo ?? null,
            resumo: { conteudo: pegarTextoRef.current?.() ?? "" },
          })}
          sugestoes={[
            "Tem algum erro no que escrevi?",
            "O que está faltando de importante?",
            "Como deixo esse resumo mais completo e organizado?",
          ]}
          recap={
            <p className="rounded-lg border border-line/40 bg-navy-900/60 px-3 py-2.5 text-xs text-mut">
              A IA recebe o texto atual do seu resumo
              {materiaNome ? (
                <>
                  {" "}
                  de <span className="font-semibold text-dim">{materiaNome}</span>
                </>
              ) : null}
              {topico ? ` (${topico.titulo})` : null}. Se você editar o resumo, as próximas
              perguntas já usam a versão nova.
            </p>
          }
          onClose={() => setVerificando(false)}
        />
      )}
    </>
  );
}

/**
 * Editor mínimo (contentEditable, mesmo HTML do leitor de textos) com
 * salvamento automático. A linha só é criada no primeiro conteúdo digitado.
 */
function EditorResumo({
  existente,
  linhaNova,
  ativo,
  pegarTextoRef,
  onVerificar,
}: {
  existente: TopicoTexto | null;
  linhaNova: TablesInsert<"topico_textos">;
  /** Painel visível — foca o editor ao abrir. */
  ativo: boolean;
  /** Registra aqui a função que devolve o texto puro atual (para a revisão por IA). */
  pegarTextoRef: React.MutableRefObject<(() => string) | null>;
  onVerificar: () => void;
}) {
  const atualizar = useAtualizarTopicoTexto();
  const criar = useCriarTopicoTexto();

  const editorRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(existente?.id ?? null);
  const htmlRef = useRef<string | null>(null);
  const timerRef = useRef<number>(undefined);
  const salvandoRef = useRef(false);
  const sujoRef = useRef(false);
  const pendenteRef = useRef(false);
  const [estado, setEstado] = useState<"salvo" | "pendente" | "salvando">("salvo");

  // mutações estáveis para o flush de desmontagem
  const atualizarRef = useRef(atualizar);
  atualizarRef.current = atualizar;
  const criarRef = useRef(criar);
  criarRef.current = criar;
  const linhaNovaRef = useRef(linhaNova);
  linhaNovaRef.current = linhaNova;

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = existente?.conteudo ?? "";
    // conteúdo inicial só na montagem — o key do componente troca por destino
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ativo) editorRef.current?.focus();
  }, [ativo]);

  useEffect(() => {
    pegarTextoRef.current = () => editorRef.current?.innerText ?? "";
    return () => {
      pegarTextoRef.current = null;
    };
  }, [pegarTextoRef]);

  // Flush ao desmontar (trocar de destino / sair da página) sem perder o digitado.
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      if (!pendenteRef.current || salvandoRef.current) return;
      const html = htmlRef.current;
      if (html === null) return;
      if (idRef.current) {
        atualizarRef.current.mutate({ id: idRef.current, conteudo: html });
      } else if (temTexto(html)) {
        criarRef.current.mutate({ ...linhaNovaRef.current, conteudo: html });
      }
    },
    []
  );

  function temTexto(html: string): boolean {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return !!tmp.textContent?.trim();
  }

  async function salvar() {
    const el = editorRef.current;
    if (!el || salvandoRef.current) return;
    const html = el.innerHTML;
    if (!idRef.current && !temTexto(html)) {
      pendenteRef.current = false;
      setEstado("salvo");
      return;
    }
    salvandoRef.current = true;
    setEstado("salvando");
    try {
      if (idRef.current) {
        await atualizarRef.current.mutateAsync({ id: idRef.current, conteudo: html });
      } else {
        const linha = await criarRef.current.mutateAsync({
          ...linhaNovaRef.current,
          conteudo: html,
        });
        idRef.current = linha.id;
      }
      salvandoRef.current = false;
      if (sujoRef.current) {
        sujoRef.current = false;
        void salvar();
      } else {
        pendenteRef.current = false;
        setEstado("salvo");
      }
    } catch (err) {
      salvandoRef.current = false;
      setEstado("pendente");
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function onInput() {
    htmlRef.current = editorRef.current?.innerHTML ?? null;
    pendenteRef.current = true;
    setEstado("pendente");
    if (salvandoRef.current) {
      sujoRef.current = true;
      return;
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void salvar(), 800);
  }

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        data-placeholder="Anote aqui o que for aprendendo com as questões…"
        className="conteudo-lei min-h-44 flex-1 overflow-y-auto px-3 py-2.5 outline-none"
      />
      <div className="flex items-center justify-between border-t border-line/30 px-3 py-1.5">
        <button
          onClick={onVerificar}
          className="flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-semibold text-gold transition-colors hover:bg-gold/10"
          title="A IA revisa seu resumo: erros, lacunas e melhorias"
        >
          <Sparkles className="size-3" /> Verificar com IA
        </button>
        <span
          className={`text-[10px] font-medium ${
            estado === "salvo" ? "text-green" : estado === "salvando" ? "text-dim" : "text-amber"
          }`}
        >
          {estado === "salvo" ? "Salvo ✓" : estado === "salvando" ? "Salvando…" : "Digitando…"}
        </span>
      </div>
    </>
  );
}
