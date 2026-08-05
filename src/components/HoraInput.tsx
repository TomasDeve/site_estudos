import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  onCommit: (horas: number) => void;
  className?: string;
  ariaLabel?: string;
}

/** Texto do número sem casas à toa: 5 → "5", 6.5 → "6.5". */
function fmt(n: number): string {
  return String(Math.round(n * 2) / 2);
}

/**
 * Campo de horas: deixa digitar à vontade e só confirma no blur/Enter (evita
 * uma gravação por tecla). Enquanto não está em foco, segue o valor de fora —
 * assim o botão "Distribuir" e os updates otimistas atualizam o campo sozinhos.
 */
export function HoraInput({ value, onCommit, className = "", ariaLabel }: Props) {
  const [texto, setTexto] = useState(() => fmt(value));
  const focado = useRef(false);

  useEffect(() => {
    if (!focado.current) setTexto(fmt(value));
  }, [value]);

  function confirmar() {
    focado.current = false;
    const n = Math.max(0, Number(texto.replace(",", ".")) || 0);
    const arredondado = Math.round(n * 2) / 2; // passos de meia-hora
    setTexto(fmt(arredondado));
    if (arredondado !== value) onCommit(arredondado);
  }

  return (
    <input
      type="number"
      min={0}
      step={0.5}
      inputMode="decimal"
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
          setTexto(fmt(value));
          e.currentTarget.blur();
        }
      }}
      className={`h-9 w-16 rounded-lg border border-line bg-navy-900 px-2 text-center text-sm tabular-nums text-txt outline-none transition-colors focus:border-gold/60 focus:ring-2 focus:ring-gold/15 ${className}`}
    />
  );
}
