import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** max-width tailwind class */
  width?: string;
  /** ocupa a tela inteira */
  fullscreen?: boolean;
  /** No celular ocupa a tela inteira (leitura); no computador segue a janela normal. */
  telaCheiaNoCelular?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
  fullscreen = false,
  telaCheiaNoCelular = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  // No celular o modal é uma folha que sobe do rodapé: o fim dela respeita a área
  // do gesto de início do iPhone (safe-area), no rodapé ou, sem rodapé, no corpo.
  const seguroCorpo = "max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))]";
  const seguroRodape = "max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]";

  // Renderiza no body (portal): fora de qualquer Card com backdrop-blur/transform,
  // que criaria um containing block e prenderia o `fixed inset-0` ao card em vez
  // da janela — deixando o overlay confinado e o modal fora do centro.
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-navy-950/80 backdrop-blur-sm ${
        fullscreen ? "items-stretch p-0" : "items-end p-0 sm:items-center sm:p-4"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={
          fullscreen
            ? "flex h-dvh w-full flex-col border-line bg-navy-800 shadow-2xl"
            : `flex max-h-[92dvh] w-full ${width} flex-col rounded-t-card border border-line bg-navy-800 shadow-2xl sm:rounded-card ${
                telaCheiaNoCelular
                  ? "max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none max-sm:border-0 max-sm:pt-[env(safe-area-inset-top)]"
                  : ""
              }`
        }
      >
        <div className="flex items-center justify-between gap-3 border-b border-line/40 py-2.5 pl-4 pr-2 sm:px-5 sm:py-4">
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-txt">{title}</h2>
          {/* Alvo de toque confortável no celular (o X sozinho tinha 24px) */}
          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-2.5 text-mut transition-colors hover:bg-navy-700 hover:text-txt sm:-mr-1 sm:p-1"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 ${footer ? "" : seguroCorpo}`}
        >
          {children}
        </div>
        {footer && (
          <div className={`flex justify-end gap-2 border-t border-line/40 px-4 py-3 sm:px-5 ${seguroRodape}`}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
