import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";

/**
 * O relógio mora no banco (questoes_relogio, migração 0043) — o mesmo no PC e no
 * celular, atualizado na hora pelo Realtime. Toda mudança passa pela função
 * relogio_questoes(acao), que usa o horário do servidor. O localStorage só guarda
 * o último estado conhecido, pra o mostrador não piscar zerado ao abrir.
 */
const CACHE = "questoes_relogio";

type Acao = "ler" | "iniciar" | "pausar" | "pausa_auto" | "retomar_auto" | "zerar";

interface Estado {
  /** Tempo já contado antes da corrida atual (ms). */
  base: number;
  /** Quando a corrida atual começou (epoch ms no relógio do servidor); null = parado. */
  inicio: number | null;
  /** Parado porque você saiu do site/da página (não pelo botão) → retoma ao voltar. */
  pausaAuto: boolean;
}

interface Linha {
  base_ms: number;
  inicio_ms: number | null;
  pausa_auto: boolean;
}

const daLinha = (l: Linha): Estado => ({
  base: Number(l.base_ms) || 0,
  inicio: l.inicio_ms === null ? null : Number(l.inicio_ms),
  pausaAuto: !!l.pausa_auto,
});

function lerCache(): { estado: Estado; offset: number } {
  try {
    const salvo = JSON.parse(localStorage.getItem(CACHE) ?? "null");
    if (salvo && typeof salvo.base === "number") {
      return {
        estado: { base: salvo.base, inicio: salvo.inicio ?? null, pausaAuto: !!salvo.pausaAuto },
        offset: typeof salvo.offset === "number" ? salvo.offset : 0,
      };
    }
  } catch {
    /* sem armazenamento: começa zerado até o banco responder */
  }
  return { estado: { base: 0, inicio: null, pausaAuto: false }, offset: 0 };
}

function gravarCache(e: Estado, offset: number) {
  try {
    localStorage.setItem(CACHE, JSON.stringify({ ...e, offset }));
  } catch {
    /* sem armazenamento */
  }
}

/** Tempo contado até `agora` (no relógio do servidor). */
const decorrido = (e: Estado, agora: number) =>
  e.base + (e.inicio !== null ? Math.max(agora - e.inicio, 0) : 0);

/** 754000 → "12:34"; 3754000 → "1:02:34" (relógio, sem decimal). */
function formatar(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** O que a ação faz no estado — aplicado na hora, antes de o banco confirmar. */
function prever(e: Estado, acao: Acao, agora: number): Estado {
  switch (acao) {
    case "iniciar":
      return e.inicio === null ? { base: e.base, inicio: agora, pausaAuto: false } : e;
    case "pausar":
      return { base: decorrido(e, agora), inicio: null, pausaAuto: false };
    case "pausa_auto":
      return e.inicio !== null ? { base: decorrido(e, agora), inicio: null, pausaAuto: true } : e;
    case "retomar_auto":
      return e.inicio === null && e.pausaAuto ? { base: e.base, inicio: agora, pausaAuto: false } : e;
    case "zerar":
      return { base: 0, inicio: null, pausaAuto: false };
    default:
      return e;
  }
}

/**
 * Cronômetro da resolução de questões. Toque para iniciar/pausar. Pausa sozinho
 * quando você sai do site (troca de app, bloqueia a tela, muda de aba) ou da página
 * de questões, e volta a correr quando você volta — em qualquer aparelho. Pausado
 * por você, fica pausado.
 */
export function RelogioQuestoes() {
  const [inicial] = useState(lerCache);
  const [estado, setEstado] = useState<Estado>(inicial.estado);
  const [, tique] = useState(0);

  // Espelhos para os ouvintes (registrados uma vez só).
  const atual = useRef(estado);
  atual.current = estado;
  /** Relógio do servidor − relógio deste aparelho (ms). */
  const offset = useRef(inicial.offset);
  /** Token da sessão, à mão pra mandar a pausa mesmo com a página saindo. */
  const token = useRef<string | null>(null);
  /** Fila: uma ação por vez, pra as respostas chegarem na ordem. */
  const fila = useRef<Promise<void>>(Promise.resolve());

  const agoraServidor = () => Date.now() + offset.current;
  const rodando = estado.inicio !== null;
  const ms = decorrido(estado, agoraServidor());

  function aplicar(novo: Estado) {
    atual.current = novo;
    gravarCache(novo, offset.current);
    setEstado(novo);
  }

  function enviar(acao: Acao) {
    if (acao !== "ler") aplicar(prever(atual.current, acao, agoraServidor()));
    fila.current = fila.current.then(async () => {
      const t = token.current ?? (await supabase.auth.getSession()).data.session?.access_token;
      if (!t) return; // sem login: o relógio funciona só neste aparelho
      try {
        const t0 = Date.now();
        const r = await fetch(`${supabaseUrl}/rest/v1/rpc/relogio_questoes`, {
          method: "POST",
          // keepalive: a pausa chega ao banco mesmo se a página estiver fechando.
          keepalive: true,
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${t}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ acao }),
        });
        if (!r.ok) return;
        const dado = (await r.json()) as Linha & { agora_ms: number };
        offset.current = Number(dado.agora_ms) - (t0 + Date.now()) / 2;
        aplicar(daLinha(dado));
      } catch {
        /* sem rede: fica o estado previsto; o próximo contato com o banco acerta */
      }
    });
  }

  function alternar() {
    enviar(rodando ? "pausar" : "iniciar");
  }

  // Atualiza o mostrador 1×/s só enquanto corre (o tempo vem do relógio, então
  // nada se perde se o navegador atrasar os tiques).
  useEffect(() => {
    if (!rodando) return;
    const id = window.setInterval(() => tique((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [rodando]);

  useEffect(() => {
    const ativo = () => document.visibilityState === "visible";

    // Sessão (e o token renovado) pra as chamadas.
    const { data: auth } = supabase.auth.onAuthStateChange((_ev, sessao) => {
      token.current = sessao?.access_token ?? null;
    });

    // Abriu a página: busca o estado do banco e, se tinha pausado sozinho, retoma.
    enviar(ativo() ? "retomar_auto" : "ler");

    // Mudou no outro aparelho → atualiza aqui na hora.
    const canal = supabase
      // Nome único: remontar (ex.: StrictMode) não reaproveita o canal que está saindo.
      .channel(`questoes_relogio:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questoes_relogio" },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          const novo = daLinha(payload.new as Linha);
          aplicar(novo);
          // O outro aparelho saiu do site e você está com este na mão → continua aqui.
          if (novo.pausaAuto && novo.inicio === null && ativo() && document.hasFocus()) {
            enviar("retomar_auto");
          }
        }
      )
      .subscribe((status) => {
        // (Re)conectou: pode ter perdido mudanças no meio do caminho.
        if (status === "SUBSCRIBED") enviar("ler");
      });

    // Saiu do site → pausa; voltou → retoma (se a pausa foi automática).
    function aoMudarVisibilidade(ev?: Event) {
      // pagehide (fechar/recarregar) pode chegar com a página ainda "visível".
      if (document.visibilityState === "hidden" || ev?.type === "pagehide") {
        if (atual.current.inicio !== null) enviar("pausa_auto");
      } else {
        enviar("retomar_auto");
      }
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("pagehide", aoMudarVisibilidade);
    window.addEventListener("focus", aoMudarVisibilidade);

    return () => {
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("pagehide", aoMudarVisibilidade);
      window.removeEventListener("focus", aoMudarVisibilidade);
      supabase.removeChannel(canal);
      auth.subscription.unsubscribe();
      // Saiu da página de questões: pausa (e retoma quando voltar).
      if (atual.current.inicio !== null) enviar("pausa_auto");
    };
    // `enviar`/`aplicar` só usam refs e o setter estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zerado = ms < 1000 && !rodando;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        onClick={alternar}
        className={`flex min-h-9 shrink-0 cursor-pointer touch-manipulation select-none items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors ${
          rodando
            ? "border-green/40 bg-green/10 text-green"
            : zerado
              ? "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
              : "border-gold/40 bg-gold/10 text-gold"
        }`}
        title={rodando ? "Pausar o relógio" : zerado ? "Iniciar o relógio" : "Continuar o relógio"}
        aria-label={rodando ? "Pausar o relógio" : zerado ? "Iniciar o relógio" : "Continuar o relógio"}
      >
        {rodando ? (
          <Pause className="size-3.5" />
        ) : zerado ? (
          <Timer className="size-3.5" />
        ) : (
          <Play className="size-3.5" />
        )}
        {zerado ? <span className="max-sm:hidden">Relógio</span> : formatar(ms)}
      </button>
      {!rodando && !zerado && (
        <button
          onClick={() => enviar("zerar")}
          className="flex size-9 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg text-mut transition-colors hover:bg-navy-700 hover:text-txt"
          title="Zerar o relógio"
          aria-label="Zerar o relógio"
        >
          <RotateCcw className="size-3.5" />
        </button>
      )}
    </div>
  );
}
