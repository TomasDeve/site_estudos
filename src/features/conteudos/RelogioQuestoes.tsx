import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

/** Onde o relógio fica guardado — sobrevive a recarregar a página. */
const CHAVE = "questoes_relogio";

interface Estado {
  /** Tempo já contado antes da corrida atual (ms). */
  base: number;
  /** Quando a corrida atual começou (epoch ms); null = parado. */
  inicio: number | null;
}

function ler(): Estado {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Estado | null;
    if (salvo && typeof salvo.base === "number") {
      // Página que morreu correndo (sem o aviso de saída): volta pausada, sem
      // contar o intervalo desconhecido.
      return { base: salvo.base, inicio: null };
    }
  } catch {
    /* sem armazenamento: começa zerado */
  }
  return { base: 0, inicio: null };
}

function gravar(e: Estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    /* sem armazenamento: o relógio só não sobrevive ao recarregar */
  }
}

const decorrido = (e: Estado, agora = Date.now()) =>
  e.base + (e.inicio !== null ? agora - e.inicio : 0);

/** 754000 → "12:34"; 3754000 → "1:02:34" (relógio, sem decimal). */
function formatar(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * Cronômetro da resolução de questões. Toque para iniciar/pausar. Pausa sozinho
 * quando você sai do site (troca de app, bloqueia a tela, muda de aba) e volta a
 * correr ao retornar — só se foi ele que pausou; pausado por você, fica pausado.
 */
export function RelogioQuestoes() {
  const [estado, setEstado] = useState<Estado>(ler);
  const [, tique] = useState(0);
  // Pausado pela saída do site (não por você) → retoma ao voltar.
  const pausaAuto = useRef(false);

  // Espelho do estado para os ouvintes de visibilidade (registrados uma vez só).
  const atual = useRef(estado);
  atual.current = estado;

  const rodando = estado.inicio !== null;
  const ms = decorrido(estado);

  function mudar(novo: Estado) {
    atual.current = novo;
    gravar(novo);
    setEstado(novo);
  }

  function alternar() {
    pausaAuto.current = false;
    mudar(
      rodando
        ? { base: decorrido(estado), inicio: null }
        : { base: estado.base, inicio: Date.now() }
    );
  }

  function zerar() {
    pausaAuto.current = false;
    mudar({ base: 0, inicio: null });
  }

  // Atualiza o mostrador 1×/s só enquanto corre (o tempo vem do relógio do sistema,
  // então nada se perde se o navegador atrasar os tiques).
  useEffect(() => {
    if (!rodando) return;
    const id = window.setInterval(() => tique((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [rodando]);

  // Saiu do site → pausa; voltou → retoma (se a pausa foi automática).
  useEffect(() => {
    function aoMudarVisibilidade(ev?: Event) {
      const e = atual.current;
      // pagehide (fechar/recarregar) pode chegar com a página ainda "visível".
      if (document.visibilityState === "hidden" || ev?.type === "pagehide") {
        if (e.inicio === null) return;
        pausaAuto.current = true;
        mudar({ base: decorrido(e), inicio: null });
      } else if (pausaAuto.current && e.inicio === null) {
        pausaAuto.current = false;
        mudar({ base: e.base, inicio: Date.now() });
      }
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("pagehide", aoMudarVisibilidade);
    return () => {
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("pagehide", aoMudarVisibilidade);
    };
    // `mudar` só usa refs e o setter estável.
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
          onClick={zerar}
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
