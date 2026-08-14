import { useEffect, useRef, useState } from "react";
import { hmParaHoras, horasParaHM } from "@/lib/horas";

interface Props {
  value: number;
  onCommit: (horas: number) => void;
  className?: string;
  ariaLabel?: string;
}

/** Arredonda para o passo de meia-hora do planejamento. */
function passo(n: number): number {
  return Math.max(0, Math.round(n * 2) / 2);
}

/**
 * Campo de horas no formato de relógio (1:30, não 1,5): deixa digitar à vontade
 * e só confirma no blur/Enter (evita uma gravação por tecla). Aceita também o
 * decimal antigo ("1,5") e "1h30". Enquanto não está em foco, segue o valor de
 * fora — assim o botão "Distribuir" e os updates otimistas atualizam o campo
 * sozinhos. As setas ↑/↓ ajustam de meia em meia hora, como o antigo spinner.
 */
export function HoraInput({ value, onCommit, className = "", ariaLabel }: Props) {
  const [texto, setTexto] = useState(() => horasParaHM(value));
  const focado = useRef(false);

  useEffect(() => {
    if (!focado.current) setTexto(horasParaHM(value));
  }, [value]);

  function confirmar() {
    focado.current = false;
    const lido = hmParaHoras(texto);
    const arredondado = passo(lido ?? value); // passos de meia-hora
    setTexto(horasParaHM(arredondado));
    if (arredondado !== value) onCommit(arredondado);
  }

  // Bump por meia hora sem confirmar (grava só no blur, como antes).
  function ajustar(delta: number) {
    const base = hmParaHoras(texto) ?? value;
    setTexto(horasParaHM(passo(base + delta)));
  }

  return (
    <input
      type="text"
      inputMode="text"
      value={texto}
      aria-label={ariaLabel}
      onFocus={(e) => {
        focado.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        else if (e.key === "Escape") {
          setTexto(horasParaHM(value));
          e.currentTarget.blur();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          ajustar(0.5);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          ajustar(-0.5);
        }
      }}
      className={`h-9 w-16 rounded-lg border border-line bg-navy-900 px-2 text-center text-sm tabular-nums text-txt outline-none transition-colors focus:border-gold/60 focus:ring-2 focus:ring-gold/15 ${className}`}
    />
  );
}
