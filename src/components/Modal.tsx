import { useEffect, type ReactNode } from "react";
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
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
  fullscreen = false,
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

  return (
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
            : `flex max-h-[92dvh] w-full ${width} flex-col rounded-t-card border border-line bg-navy-800 shadow-2xl sm:rounded-card`
        }
      >
        <div className="flex items-center justify-between gap-3 border-b border-line/40 px-4 py-4 sm:px-5">
          <h2 className="min-w-0 flex-1 text-sm font-semibold text-txt">{title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg p-1 text-mut transition-colors hover:bg-navy-700 hover:text-txt"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line/40 px-4 py-3 sm:px-5">{footer}</div>
        )}
      </div>
    </div>
  );
}
