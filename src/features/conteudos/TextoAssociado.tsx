import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Grifavel,
  partesDeTexto,
  useFonteTextoAssociado,
  FONTE_MIN,
  FONTE_MAX,
  FONTE_PASSO,
  type Grifo,
} from "./grifos";

/**
 * Bloco colapsável "Texto associado" — a passagem-base da questão (o enunciado-base
 * que no QConcursos fica escondido atrás do botão "+"). Recolhido por padrão pra não
 * estourar a tela no celular; clicou, abre.
 *
 * Dois extras que o usuário pediu:
 *  - A−/A+ ajustam o tamanho da fonte da passagem (global, pra TODAS as questões);
 *  - dá pra selecionar trechos e sublinhar (grifos salvos no banco) — via `Grifavel`.
 *
 * Passagens que são imagem vêm com marcador "[imagem: URL]" e viram a imagem de fato
 * (com link "ver original" de reserva) — tratado dentro do `Grifavel`.
 */
export function TextoAssociado({
  texto,
  grifos,
  onChange,
}: {
  texto: string | null | undefined;
  grifos: Grifo[];
  onChange: (novos: Grifo[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [fontePx, setFontePx] = useFonteTextoAssociado();
  if (!texto || !texto.trim()) return null;
  const partes = partesDeTexto(texto);

  const botaoFonte =
    "flex h-6 items-center rounded-md border border-line px-1.5 leading-none text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold transition-colors hover:text-gold/80"
        >
          <ChevronRight className={`size-3.5 transition-transform ${aberto ? "rotate-90" : ""}`} />
          Texto associado
        </button>

        {aberto && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFontePx(fontePx - FONTE_PASSO)}
              disabled={fontePx <= FONTE_MIN}
              title="Diminuir a fonte do texto associado"
              aria-label="Diminuir a fonte"
              className={botaoFonte}
            >
              <span className="text-[10px] font-bold">A</span>
              <span className="ml-0.5 text-[9px]">−</span>
            </button>
            <button
              type="button"
              onClick={() => setFontePx(fontePx + FONTE_PASSO)}
              disabled={fontePx >= FONTE_MAX}
              title="Aumentar a fonte do texto associado"
              aria-label="Aumentar a fonte"
              className={botaoFonte}
            >
              <span className="text-sm font-bold">A</span>
              <span className="ml-0.5 text-[9px]">+</span>
            </button>
          </div>
        )}
      </div>

      {aberto && (
        <Grifavel
          partes={partes}
          grifos={grifos}
          onChange={onChange}
          className="mt-1.5 whitespace-pre-wrap border-l-2 border-gold/40 pl-2.5 leading-relaxed text-dim"
          style={{ fontSize: `${fontePx}px` }}
        />
      )}
    </div>
  );
}
