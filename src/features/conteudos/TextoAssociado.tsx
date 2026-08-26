import { useState } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Bloco colapsável "Texto associado" — a passagem-base da questão (o enunciado-base
 * que no QConcursos fica escondido atrás do botão "Texto associado +"). Fica recolhido
 * por padrão pra não estourar a tela no celular; clicou, abre.
 *
 * O importador guarda esse texto com marcadores "[imagem: URL]" para as passagens que
 * na verdade são imagem (comum em provas escaneadas). Aqui a gente separa: pedaços de
 * texto viram parágrafos (respeitando quebras de linha) e cada "[imagem: URL]" vira a
 * imagem de fato, com um link "ver original" de reserva caso ela não carregue.
 */

type Parte = { tipo: "texto"; texto: string } | { tipo: "img"; url: string };

/** Quebra o texto associado em pedaços de texto e imagens (marcador "[imagem: URL]"). */
function partesDoTexto(s: string): Parte[] {
  const partes: Parte[] = [];
  const re = /\[imagem:\s*(\S+?)\s*\]/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const antes = s.slice(ultimo, m.index).trim();
    if (antes) partes.push({ tipo: "texto", texto: antes });
    partes.push({ tipo: "img", url: m[1] });
    ultimo = re.lastIndex;
  }
  const resto = s.slice(ultimo).trim();
  if (resto) partes.push({ tipo: "texto", texto: resto });
  return partes.length ? partes : [{ tipo: "texto", texto: s }];
}

export function TextoAssociado({ texto }: { texto: string | null | undefined }) {
  const [aberto, setAberto] = useState(false);
  if (!texto || !texto.trim()) return null;
  const partes = partesDoTexto(texto);

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-gold transition-colors hover:text-gold/80"
      >
        <ChevronRight
          className={`size-3.5 transition-transform ${aberto ? "rotate-90" : ""}`}
        />
        Texto associado
      </button>

      {aberto && (
        <div className="mt-1.5 space-y-2 border-l-2 border-gold/40 pl-2.5 text-xs leading-relaxed text-dim">
          {partes.map((p, i) =>
            p.tipo === "img" ? (
              <a
                key={i}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-fit"
              >
                <img
                  src={p.url}
                  alt="Texto associado (imagem)"
                  loading="lazy"
                  className="max-w-full rounded border border-line"
                />
                <span className="mt-0.5 block text-[10px] text-mut underline">
                  ver original
                </span>
              </a>
            ) : (
              <p key={i} className="whitespace-pre-wrap">
                {p.texto}
              </p>
            ),
          )}
        </div>
      )}
    </div>
  );
}
