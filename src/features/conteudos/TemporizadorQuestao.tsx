import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

/** Tempo-alvo por questão: treino de responder em no máximo 3 minutos. */
const LIMITE_MS = 3 * 60 * 1000;

const mmss = (ms: number) => {
  const s = Math.floor(Math.abs(ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Bipe curto quando o tempo acaba (sem arquivo de áudio). */
function bipar() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => ctx.close();
  } catch {
    /* sem áudio: fica só o aviso visual */
  }
}

/**
 * Cronômetro regressivo de 3 minutos no canto da questão. Clique para começar;
 * zerou, bipa e passa a contar o estouro em vermelho (+0:15). Ao responder a
 * questão, congela mostrando quanto tempo levou. Clique de novo para zerar.
 */
export function TemporizadorQuestao({
  respondida,
  className = "",
}: {
  respondida: boolean;
  className?: string;
}) {
  const [inicio, setInicio] = useState<number | null>(null);
  const [fim, setFim] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const bipou = useRef(false);

  const rodando = inicio !== null && fim === null;

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [rodando]);

  // Acabou de responder com o relógio rodando → congela o tempo gasto.
  const respondidaAntes = useRef(respondida);
  useEffect(() => {
    if (respondida && !respondidaAntes.current && rodando) setFim(Date.now());
    respondidaAntes.current = respondida;
  }, [respondida, rodando]);

  const gasto = inicio === null ? 0 : (fim ?? agora) - inicio;
  const restante = LIMITE_MS - gasto;
  const estourou = restante <= 0;

  useEffect(() => {
    if (rodando && estourou && !bipou.current) {
      bipou.current = true;
      bipar();
    }
  }, [rodando, estourou]);

  const clicar = () => {
    if (inicio === null) {
      bipou.current = false;
      setAgora(Date.now());
      setInicio(Date.now());
    } else {
      setInicio(null);
      setFim(null);
    }
  };

  const cor =
    inicio === null
      ? "text-mut/70 hover:text-dim"
      : estourou
        ? `text-red ${rodando ? "animate-pulse" : ""}`
        : fim !== null
          ? "text-green"
          : restante <= 30_000
            ? "text-gold"
            : "text-txt";

  const titulo =
    inicio === null
      ? "Cronômetro de 3 minutos — clique para começar"
      : fim !== null
        ? `Respondida em ${mmss(gasto)}${estourou ? " (passou dos 3 min)" : ""} — clique para zerar`
        : "Clique para parar e zerar";

  return (
    <button
      type="button"
      onClick={clicar}
      title={titulo}
      aria-label={titulo}
      className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md p-1 text-xs font-semibold tabular-nums transition-colors max-sm:p-2 ${cor} ${className}`}
    >
      <Timer className="size-3.5" />
      {inicio !== null && (
        <span>{fim !== null ? mmss(gasto) : estourou ? `+${mmss(restante)}` : mmss(restante)}</span>
      )}
    </button>
  );
}
