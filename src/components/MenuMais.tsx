import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export interface ItemMenu {
  icone: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Menu "⋯" para as ações secundárias — mantém a fileira de botões limpa e
 * guarda o resto (refazer, arquivar…) atrás de um clique. Fecha ao escolher um
 * item, ao clicar fora ou com Esc. Abre para cima, já que costuma ficar no
 * rodapé do card.
 */
export function MenuMais({ itens, aria = "Mais ações" }: { itens: ItemMenu[]; aria?: string }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label={aria}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={`flex cursor-pointer items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          aberto
            ? "border-line bg-navy-700/60 text-txt"
            : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
        }`}
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-30 mb-1 min-w-40 overflow-hidden rounded-lg border border-line bg-navy-800 py-1 shadow-xl shadow-navy-950/50"
        >
          {itens.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => {
                setAberto(false);
                it.onClick();
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-navy-700 ${
                it.danger ? "text-red" : "text-dim hover:text-txt"
              }`}
            >
              {it.icone}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
