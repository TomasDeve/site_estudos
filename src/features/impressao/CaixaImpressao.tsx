import { Check, Printer } from "lucide-react";
import { toast } from "sonner";
import type { TopicoQuestao } from "@/types/db";
import { useContagemImpressao, useSalvarImpressao } from "@/api/topicoQuestoes";

/**
 * Caixinha discreta no canto de cada questão: marcada, a questão entra na seção
 * "Impressão" (menu lateral), que junta as marcadas numa folha organizada por
 * matéria e assunto — e onde depois dá para corrigir no site.
 */
export function CaixaImpressao({
  marcada,
  onToggle,
  className = "",
}: {
  marcada: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      onClick={onToggle}
      title={marcada ? "Marcada para impressão — clique para desmarcar" : "Marcar para impressão"}
      aria-label={marcada ? "Desmarcar da impressão" : "Marcar para impressão"}
      className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md p-1 transition-colors ${
        marcada ? "text-gold" : "text-mut/70 hover:text-dim"
      } ${className}`}
    >
      <span
        className={`flex size-3.5 items-center justify-center rounded-[4px] border ${
          marcada ? "border-gold bg-gold text-navy-950" : "border-current"
        }`}
      >
        {marcada && <Check className="size-2.5" strokeWidth={3.5} />}
      </span>
      <Printer className="size-3.5" />
    </button>
  );
}

/**
 * Liga a caixinha ao banco: marca (com o horário de agora) ou desmarca a questão.
 * Desmarcar também limpa o número da folha — marcada de novo, ela entra na próxima impressão.
 */
export function useAlternarImpressao() {
  const salvar = useSalvarImpressao();
  return (q: TopicoQuestao) =>
    salvar.mutate(
      {
        itens: [
          {
            questao: q,
            imprimir_em: q.imprimir_em ? null : new Date().toISOString(),
            impressao_numero: null,
          },
        ],
      },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
}

/**
 * Atalho para a seção "Impressão" nas páginas de questões (que abrem em aba própria,
 * sem o menu lateral). Só aparece quando há questões marcadas.
 */
export function LinkImpressao() {
  const { data: total } = useContagemImpressao();
  if (!total) return null;
  return (
    <a
      href="/impressao"
      target="_blank"
      rel="noreferrer"
      title={`${total} ${total === 1 ? "questão marcada" : "questões marcadas"} para impressão — abrir a seção Impressão`}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line/60 px-2.5 py-1.5 text-xs font-medium text-dim transition-colors hover:border-line hover:bg-navy-700/60 hover:text-txt"
    >
      <Printer className="size-3.5 text-gold" />
      <span className="tabular-nums">{total}</span>
    </a>
  );
}
