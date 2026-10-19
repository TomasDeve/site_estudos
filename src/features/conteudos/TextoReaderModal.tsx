import { Maximize2 } from "lucide-react";
import { useTexto } from "@/api/topicoTextos";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { TextoReader, TituloTextoInput } from "./TextoReader";

interface Props {
  textoId: string;
  onClose: () => void;
}

/** Leitor de um texto num modal. O conteúdo é baixado aqui, ao abrir. */
export function TextoReaderModal({ textoId, onClose }: Props) {
  const { data: texto, error } = useTexto(textoId);
  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      // No celular a leitura ocupa a tela toda (a folha de baixo deixava o texto
      // numa janelinha de 58% da altura).
      telaCheiaNoCelular
      title={texto ? <TituloTextoInput texto={texto} /> : "Abrindo o texto…"}
    >
      {texto ? (
        <TextoReader
          texto={texto}
          cheioNoCelular
          acoes={
            <a
              href={`/texto/${texto.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
              title="Abrir em tela cheia, numa nova aba"
              aria-label="Abrir em tela cheia, numa nova aba"
            >
              <Maximize2 className="size-3.5" />
              <span className="max-sm:hidden">Tela cheia</span>
            </a>
          }
        />
      ) : error ? (
        <p className="py-8 text-center text-sm text-red">
          Não deu para abrir o texto: {error instanceof Error ? error.message : String(error)}
        </p>
      ) : (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
    </Modal>
  );
}
