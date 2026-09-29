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
 * rodapé do card. `rotulo` troca o "⋯" por um botão com texto.
 */
export function MenuMais({
  itens,
  aria = "Mais ações",
  rotulo,
}: {
  itens: ItemMenu[];
  aria?: string;
  rotulo?: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  // Abre para cima; perto do topo da tela (ou sob o cabeçalho fixo do celular),
  // abre para baixo — senão os primeiros itens ficavam escondidos.
  const [paraBaixo, setParaBaixo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function alternar() {
    if (!aberto && ref.current) {
      const topo = ref.current.getBoundingClientRect().top;
      const alturaMenu = itens.length * 40 + 12;
      // 72px: o cabeçalho que fica grudado no topo no celular
      setParaBaixo(topo < alturaMenu + 72);
    }
    setAberto((v) => !v);
  }

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
        onClick={alternar}
        aria-label={aria}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          aberto
            ? "border-line bg-navy-700/60 text-txt"
            : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
        }`}
      >
        {rotulo ?? <MoreHorizontal className="size-3.5" />}
      </button>
      {aberto && (
        <div
          role="menu"
          className={`absolute right-0 z-30 min-w-40 overflow-hidden rounded-lg border border-line bg-navy-800 py-1 shadow-xl shadow-navy-950/50 ${
            paraBaixo ? "top-full mt-1" : "bottom-full mb-1"
          }`}
        >
          {itens.map((it, i) => (
            <button
              key={i}
              role="menuitem"
              onClick={() => {
                setAberto(false);
                it.onClick();
              }}
              className={`flex w-full cursor-pointer items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-navy-700 max-sm:py-2.5 max-sm:text-sm ${
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
