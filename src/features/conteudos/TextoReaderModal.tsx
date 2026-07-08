import { Maximize2 } from "lucide-react";
import type { TopicoTexto } from "@/types/db";
import { Modal } from "@/components/Modal";
import { TextoReader, TituloTextoInput } from "./TextoReader";

interface Props {
  texto: TopicoTexto;
  onClose: () => void;
}

export function TextoReaderModal({ texto, onClose }: Props) {
  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      title={<TituloTextoInput texto={texto} />}
    >
      <TextoReader
        texto={texto}
        acoes={
          <a
            href={`/texto/${texto.id}`}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
            title="Abrir em tela cheia, numa nova aba"
          >
            <Maximize2 className="size-3.5" />
            <span className="max-sm:hidden">Tela cheia</span>
          </a>
        }
      />
    </Modal>
  );
}
