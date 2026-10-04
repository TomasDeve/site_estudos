import { useEffect, useRef, useState } from "react";
import { Hourglass, RotateCcw, Timer } from "lucide-react";

/** Tempo-alvo por questão: treino de responder em no máximo 3 minutos. */
const LIMITE_MS = 3 * 60 * 1000;

/** Evento que as páginas disparam ao responder uma questão → o cronômetro pausa. */
const EVENTO_RESPONDIDA = "questao-respondida";

export function avisarQuestaoRespondida() {
  window.dispatchEvent(new Event(EVENTO_RESPONDIDA));
}

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
 * Cronômetro regressivo de 3 minutos no topo da página de questões, ao lado do
 * relógio. 1º clique começa; o 2º pausa; o 3º zera e já recomeça do 3:00.
 * Zerou, bipa e conta o estouro em vermelho (+0:15). Responder uma questão
 * com ele rodando também pausa (mostra quanto você levou).
 */
export function TemporizadorQuestao() {
  const [inicio, setInicio] = useState<number | null>(null);
  const [pausadoEm, setPausadoEm] = useState<number | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const bipou = useRef(false);

  const rodando = inicio !== null && pausadoEm === null;

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [rodando]);

  useEffect(() => {
    if (!rodando) return;
    const pausar = () => setPausadoEm(Date.now());
    window.addEventListener(EVENTO_RESPONDIDA, pausar);
    return () => window.removeEventListener(EVENTO_RESPONDIDA, pausar);
  }, [rodando]);

  const gasto = inicio === null ? 0 : (pausadoEm ?? agora) - inicio;
  const restante = LIMITE_MS - gasto;
  const estourou = restante <= 0;

  useEffect(() => {
    if (rodando && estourou && !bipou.current) {
      bipou.current = true;
      bipar();
    }
  }, [rodando, estourou]);

  const clicar = () => {
    if (rodando) {
      setPausadoEm(Date.now());
      return;
    }
    // parado ou pausado → começa (de novo) do 3:00
    bipou.current = false;
    setPausadoEm(null);
    setAgora(Date.now());
    setInicio(Date.now());
  };

  const ocioso = inicio === null;
  const pausado = inicio !== null && pausadoEm !== null;

  const cor = ocioso
    ? "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
    : estourou
      ? `border-red/40 bg-red/10 text-red ${rodando ? "animate-pulse" : ""}`
      : pausado
        ? "border-green/40 bg-green/10 text-green"
        : restante <= 30_000
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-line text-txt";

  const titulo = ocioso
    ? "Cronômetro de 3 minutos por questão — clique para começar"
    : rodando
      ? "Clique para pausar"
      : `Pausado em ${mmss(gasto)}${estourou ? " (passou dos 3 min)" : ""} — clique para zerar e começar de novo`;

  const Icone = ocioso ? Timer : rodando ? Hourglass : RotateCcw;

  return (
    <button
      type="button"
      onClick={clicar}
      title={titulo}
      aria-label={titulo}
      className={`flex min-h-9 shrink-0 cursor-pointer touch-manipulation select-none items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors ${cor}`}
    >
      <Icone className="size-3.5" />
      {ocioso ? (
        <span>
          3<span className="max-sm:hidden"> min</span>
          <span className="sm:hidden">:00</span>
        </span>
      ) : (
        <span>{estourou ? `+${mmss(restante)}` : mmss(restante)}</span>
      )}
    </button>
  );
}
