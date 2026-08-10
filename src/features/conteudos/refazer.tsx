import { useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { gabaritoLabel } from "./questaoModelo";

/**
 * Botão "Refazer questão futuramente" — substitui o antigo seletor de dificuldade.
 * Marcar = "não fixei isso, quero rever". A questão entra numa fila; depois a IA a
 * reformula (versão nova a partir do núcleo). Marcar não muda nada visível agora.
 */
export function BotaoRefazer({
  marcada,
  onToggle,
}: {
  marcada: boolean;
  onToggle: (marcar: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!marcada)}
      title={
        marcada
          ? "Marcada — a IA vai reformular essa questão depois. Clique para desmarcar."
          : "Não fixou esse ponto? Marque para a IA reformular e te devolver uma versão nova depois."
      }
      className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
        marcada
          ? "border-gold/50 bg-gold/15 text-gold"
          : "border-line/60 text-dim hover:border-gold/40 hover:bg-gold/5 hover:text-gold"
      }`}
    >
      <RefreshCw className="size-3.5" />
      {marcada ? "Marcada para refazer ✓" : "Refazer questão futuramente"}
    </button>
  );
}

/**
 * Reveal pós-resposta: quando a questão é uma reformulação, revela de onde veio.
 * SÓ renderiza depois de responder — antes, a questão tem que parecer normal.
 */
export function OrigemReformulada({ original }: { original?: TopicoQuestao }) {
  const [aberto, setAberto] = useState(false);
  if (!original) return null; // original não carregada ou apagada — não revela nada
  return (
    <div className="rounded-lg border border-blue/25 bg-blue/[0.06] px-2.5 py-1.5">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-1.5 text-left text-[11px] font-semibold text-blue"
      >
        <ChevronDown className={`size-3 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
        Versão reformulada — ver a questão original
      </button>
      {aberto && (
        <div className="mt-1.5 border-l-2 border-blue/40 pl-2.5">
          {original.fonte && <p className="mb-0.5 text-[10px] text-mut">{original.fonte}</p>}
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-dim">{original.enunciado}</p>
          <p className="mt-1 text-[11px] text-mut">
            Gabarito da original: <strong className="text-dim">{gabaritoLabel(original)}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
