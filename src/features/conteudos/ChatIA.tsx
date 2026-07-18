import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Eraser, Send, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import { Modal } from "@/components/Modal";

export interface MensagemIA {
  role: "user" | "assistant";
  content: string;
}

// Histórico por conversa (chave) — sobrevive a fechar/reabrir o modal e some
// ao recarregar/fechar a aba do navegador (fica só em memória).
const historicos = new Map<string, MensagemIA[]>();

/** Chama a Edge Function `tirar-duvida` autenticada; devolve a Response (streaming). */
export async function fetchIA(
  body: Record<string, unknown>,
  signal?: AbortSignal
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada — entre de novo no site.");

  const res = await fetch(`${supabaseUrl}/functions/v1/tirar-duvida`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(detalhe.trim() || `A IA não respondeu (HTTP ${res.status}).`);
  }
  return res;
}

interface Props {
  titulo: ReactNode;
  /** Identifica a conversa: mesmo valor = mesmo histórico ao reabrir. */
  chave: string;
  /** Campos extras enviados à Edge Function; avaliado a cada envio (pega o estado atual). */
  montarPayload: () => Record<string, unknown>;
  /** Sugestões de primeira pergunta (um toque). */
  sugestoes: string[];
  /** Bloco de contexto mostrado no topo do chat. */
  recap?: ReactNode;
  onClose: () => void;
}

/**
 * Modal de conversa com a IA (Edge Function `tirar-duvida`). A resposta chega
 * em streaming — texto puro, pedaço a pedaço — para não travar o ritmo.
 */
export function ChatIA({ titulo, chave, montarPayload, sugestoes, recap, onClose }: Props) {
  const [mensagens, setMensagens] = useState<MensagemIA[]>(() => historicos.get(chave) ?? []);
  const [texto, setTexto] = useState("");
  const [respondendo, setRespondendo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    historicos.set(chave, mensagens);
  }, [chave, mensagens]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens]);

  // Aborta o streaming se o modal fechar no meio da resposta.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function enviar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || respondendo) return;
    setTexto("");

    const historico: MensagemIA[] = [...mensagens, { role: "user", content: p }];
    setMensagens([...historico, { role: "assistant", content: "" }]);
    setRespondendo(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetchIA({ ...montarPayload(), mensagens: historico }, ctrl.signal);

      const reader = res.body!.getReader();
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
      title={titulo}
      footer={
        <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
          {mensagens.length > 0 && !respondendo && (
            <button
              type="button"
              onClick={() => setMensagens([])}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line/60 text-mut transition-colors hover:border-line hover:text-red"
              title="Limpar conversa"
              aria-label="Limpar conversa"
            >
              <Eraser className="size-4" />
            </button>
          )}
          <input
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva sua pergunta…"
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
        {recap}

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
