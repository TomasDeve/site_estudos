import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, NotebookPen, X } from "lucide-react";
import { toast } from "sonner";
import type { Materia, TablesInsert, Topico, TopicoTexto } from "@/types/db";
import {
  TITULO_RESUMO_QUESTOES,
  useAtualizarTopicoTexto,
  useCriarTopicoTexto,
  useResumoQuestoes,
} from "@/api/topicoTextos";
import { Spinner } from "@/components/Spinner";

const MATERIA_KEY = "resumo-rapido-materia-id";

interface Props {
  /** Caderno de um assunto: o resumo gruda no tópico e aparece nos textos dele. */
  topico?: Topico;
  /** Modo misturado: o resumo vai para os "Resumos da matéria (geral)" da matéria escolhida. */
  materias?: Materia[];
}

/**
 * Botão flutuante presente durante toda a rolagem das páginas de questões.
 * Abre um bloco de notas que salva sozinho (debounce) em `topico_textos`,
 * reaproveitando o mesmo leitor/editor dos resumos do site — dá para abrir
 * depois em tela cheia, marcar com marca-texto etc.
 */
export function ResumoRapido({ topico, materias }: Props) {
  const [aberto, setAberto] = useState(false);
  // Depois de aberto uma vez, o painel só é escondido (não desmontado): o texto
  // digitado e o cursor sobrevivem ao fechar/abrir, sem corrida de salvamento.
  const [jaAbriu, setJaAbriu] = useState(false);

  function alternar() {
    setAberto((v) => !v);
    if (!jaAbriu) setJaAbriu(true);
  }

  const opcoes = useMemo(
    () =>
      (materias ?? [])
        .filter((m) => m.tipo === "normal")
        .sort((a, b) => a.nome.localeCompare(b.nome)),
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

  function escolherMateria(id: string) {
    setMateriaId(id);
    localStorage.setItem(MATERIA_KEY, id);
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
            <EditorResumo key={chave} existente={resumo ?? null} linhaNova={linhaNova} ativo={aberto} />
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
}: {
  existente: TopicoTexto | null;
  linhaNova: TablesInsert<"topico_textos">;
  /** Painel visível — foca o editor ao abrir. */
  ativo: boolean;
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

  // Flush ao desmontar (fechar painel / sair da página) sem perder o digitado.
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
        <span className="text-[10px] text-mut">
          {existente || idRef.current ? "Também aparece nos resumos do site" : "Criado ao digitar"}
        </span>
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
