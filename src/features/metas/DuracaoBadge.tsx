import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { fmtMinutos } from "@/lib/dates";

interface Props {
  minutos: number;
  /** dia concluído: só exibe, não deixa editar */
  bloqueado?: boolean;
  onSalvar: (minutos: number) => void;
}

const PASSO = 5;
const MAX = 600;

/** Badge do tempo do bloco que vira um editor rápido ao clicar. */
export function DuracaoBadge({ minutos, bloqueado = false, onSalvar }: Props) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(minutos));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) {
      setValor(String(minutos));
      // seleciona o texto para digitar por cima
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editando, minutos]);

  if (bloqueado) {
    return (
      <span className="shrink-0 rounded-md bg-navy-700 px-2 py-0.5 text-[11px] font-bold tabular-nums text-dim">
        {fmtMinutos(minutos)}
      </span>
    );
  }

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        title="Clique para ajustar o tempo estudado"
        className="shrink-0 cursor-pointer rounded-md bg-navy-700 px-2 py-0.5 text-[11px] font-bold tabular-nums text-dim transition-colors hover:bg-navy-600 hover:text-gold"
      >
        {fmtMinutos(minutos)}
      </button>
    );
  }

  const num = Math.round(Number(valor));
  const valido = Number.isFinite(num) && num > 0 && num <= MAX;

  function ajustar(delta: number) {
    const base = Number.isFinite(num) ? num : minutos;
    setValor(String(Math.max(PASSO, Math.min(MAX, base + delta))));
  }

  function salvar() {
    if (!valido) return;
    if (num !== minutos) onSalvar(num);
    setEditando(false);
  }

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-gold/40 bg-navy-900 p-0.5">
      <button
        type="button"
        onClick={() => ajustar(-PASSO)}
        className="cursor-pointer rounded p-1 text-mut hover:bg-navy-700 hover:text-txt"
        aria-label={`Menos ${PASSO} minutos`}
      >
        <Minus className="size-3.5" />
      </button>
      <input
        ref={inputRef}
        type="number"
        min={1}
        max={MAX}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") setEditando(false);
        }}
        className="w-12 bg-transparent text-center text-xs font-bold tabular-nums text-txt outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="pr-0.5 text-[10px] text-mut">min</span>
      <button
        type="button"
        onClick={() => ajustar(PASSO)}
        className="cursor-pointer rounded p-1 text-mut hover:bg-navy-700 hover:text-txt"
        aria-label={`Mais ${PASSO} minutos`}
      >
        <Plus className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={salvar}
        disabled={!valido}
        className="cursor-pointer rounded p-1 text-green hover:bg-green/15 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Salvar tempo"
      >
        <Check className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setEditando(false)}
        className="cursor-pointer rounded p-1 text-mut hover:bg-navy-700 hover:text-txt"
        aria-label="Cancelar"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
