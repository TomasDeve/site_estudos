import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";
import type { TopicoQuestao } from "@/types/db";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import { Modal } from "@/components/Modal";

interface Mensagem {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  questao: TopicoQuestao;
  materiaNome?: string;
  assunto?: string;
  onClose: () => void;
}

/**
 * Chat com a IA sobre UMA questão. A Edge Function `tirar-duvida` já recebe o
 * item, gabarito, comentário e a resposta do aluno — a primeira pergunta pode
 * ser um clique numa sugestão. A resposta chega em streaming (aparece enquanto
 * é gerada), para não travar o ritmo de resolução.
 */
export function DuvidaIAModal({ questao, materiaNome, assunto, onClose }: Props) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const errou = questao.resposta !== null && questao.resposta !== questao.gabarito;

  const sugestoes = [
    ...(errou ? ["Onde meu raciocínio falhou?"] : []),
    "Por que o gabarito é esse?",
    "Me dá um macete para não errar mais",
    "Como a banca costuma cobrar isso?",
  ];

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens]);

  // Aborta o streaming se o modal fechar no meio da resposta.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function enviar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || respondendo) return;
    setTexto("");

    const historico: Mensagem[] = [...mensagens, { role: "user", content: p }];
    setMensagens([...historico, { role: "assistant", content: "" }]);
    setRespondendo(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada — entre de novo no site.");

      const res = await fetch(`${supabaseUrl}/functions/v1/tirar-duvida`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          materia: materiaNome ?? null,
          assunto: assunto ?? null,
          questao: {
            contexto: questao.contexto,
            enunciado: questao.enunciado,
            gabarito: questao.gabarito,
            comentario: questao.comentario,
            resposta: questao.resposta,
          },
          mensagens: historico,
        }),
      });

      if (!res.ok || !res.body) {
        const detalhe = await res.text().catch(() => "");
        throw new Error(detalhe.trim() || `A IA não respondeu (HTTP ${res.status}).`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const pedaco = decoder.decode(value, { stream: true });
        if (!pedaco) continue;
        setMensagens((atual) => {
          const proximas = [...atual];
          const ultima = proximas[proximas.length - 1];
          proximas[proximas.length - 1] = { ...ultima, content: ultima.content + pedaco };
          return proximas;
        });
      }
    } catch (err) {
      if (!ctrl.signal.aborted) {
        toast.error(err instanceof Error ? err.message : String(err));
        // Tira a resposta vazia e devolve a pergunta ao campo para tentar de novo.
        setMensagens(historico.slice(0, -1));
        setTexto(p);
      }
    } finally {
      setRespondendo(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void enviar(texto);
  }

  function fechar() {
    abortRef.current?.abort();
    onClose();
  }

  return (
    <Modal
      open
      onClose={fechar}
      width="max-w-xl"
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-gold" /> Tirar dúvida com IA
        </span>
      }
      footer={
        <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
          <input
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Pergunte sobre esta questão…"
            autoFocus
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-navy-950 px-3 text-sm text-txt outline-none placeholder:text-mut/70 focus:border-gold/60"
          />
          {respondendo ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line/60 text-dim transition-colors hover:border-line hover:text-txt"
              title="Parar resposta"
              aria-label="Parar resposta"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!texto.trim()}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-gold text-navy-950 transition-all enabled:hover:brightness-110 disabled:cursor-default disabled:opacity-40"
              title="Enviar"
              aria-label="Enviar pergunta"
            >
              <Send className="size-4" />
            </button>
          )}
        </form>
      }
    >
      <div className="flex min-h-[16rem] flex-col gap-3">
        {/* Recapitulação da questão em pauta */}
        <div className="rounded-lg border border-line/40 bg-navy-900/60 px-3 py-2.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {materiaNome && (
              <span className="rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dim">
                {materiaNome}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                questao.gabarito ? "bg-green/15 text-green" : "bg-red/15 text-red"
              }`}
            >
              Gabarito: {questao.gabarito ? "Certo" : "Errado"}
            </span>
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed text-dim">{questao.enunciado}</p>
        </div>

        {mensagens.length === 0 ? (
          <div className="space-y-2 py-2">
            <p className="text-xs text-mut">Toque numa sugestão ou escreva sua dúvida:</p>
            <div className="flex flex-wrap gap-1.5">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  onClick={() => void enviar(s)}
                  className="cursor-pointer rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {mensagens.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex"}>
                {m.role === "user" ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gold/15 px-3 py-2 text-sm leading-relaxed text-txt">
                    {m.content}
                  </p>
                ) : (
                  <div className="max-w-[95%]">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-dim">
                      {m.content}
                      {respondendo && i === mensagens.length - 1 && (
                        <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-gold align-middle" />
                      )}
                    </p>
                  </div>
                )}
              </div>
            ))}
            <div ref={fimRef} />
          </div>
        )}
      </div>
    </Modal>
  );
}
