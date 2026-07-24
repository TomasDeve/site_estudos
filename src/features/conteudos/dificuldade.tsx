import { Frown, Laugh, Meh, Smile, type LucideIcon } from "lucide-react";
import type { QuestaoDificuldade } from "@/types/db";

/**
 * Dificuldade percebida da questão — substitui o antigo balde "reforço com IA".
 * Depois de responder, o aluno marca como foi: as difíceis se reúnem na aba
 * "Difícil" do caderno, para ele focar onde tem mais dificuldade.
 */
interface Nivel {
  chave: QuestaoDificuldade;
  label: string;
  Icone: LucideIcon;
  /** Classes da pílula acesa no seletor. */
  ativo: string;
  /** Classes da etiqueta no topo do card. */
  badge: string;
}

// Do mais difícil ao mais fácil: vermelho → âmbar → gold → verde. Classes escritas
// por extenso porque o Tailwind não gera nomes montados em runtime.
export const NIVEIS: Nivel[] = [
  { chave: "dificil", label: "Difícil", Icone: Frown, ativo: "border-red/40 bg-red/10 text-red", badge: "bg-red/15 text-red" },
  { chave: "medio_dificil", label: "Médio Difícil", Icone: Meh, ativo: "border-amber/40 bg-amber/10 text-amber", badge: "bg-amber/15 text-amber" },
  { chave: "medio_facil", label: "Médio Fácil", Icone: Smile, ativo: "border-gold/40 bg-gold/10 text-gold", badge: "bg-gold/15 text-gold" },
  { chave: "facil", label: "Fácil", Icone: Laugh, ativo: "border-green/40 bg-green/10 text-green", badge: "bg-green/15 text-green" },
];

const POR_CHAVE = new Map(NIVEIS.map((n) => [n.chave, n]));

/** Etiqueta colorida da dificuldade no topo do card. Some se ainda não avaliada. */
export function BadgeDificuldade({ dificuldade }: { dificuldade: string | null }) {
  const n = dificuldade ? POR_CHAVE.get(dificuldade as QuestaoDificuldade) : undefined;
  if (!n) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${n.badge}`}
    >
      <n.Icone className="size-3" />
      {n.label}
    </span>
  );
}

/**
 * Seletor "Como foi essa questão?" com as três pílulas. Clicar no nível já
 * marcado remove a marcação (volta a não avaliada).
 */
export function SeletorDificuldade({
  valor,
  onSelecionar,
}: {
  valor: string | null;
  onSelecionar: (nivel: QuestaoDificuldade | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-mut">
        Como foi essa questão?
      </span>
      <div className="flex gap-1.5">
        {NIVEIS.map((n) => {
          const ativo = valor === n.chave;
          return (
            <button
              key={n.chave}
              onClick={() => onSelecionar(ativo ? null : n.chave)}
              aria-pressed={ativo}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                ativo
                  ? n.ativo
                  : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
              }`}
            >
              <n.Icone className="size-3.5" />
              {n.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
