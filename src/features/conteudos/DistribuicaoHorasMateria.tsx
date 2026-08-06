import { Clock3, SplitSquareHorizontal } from "lucide-react";
import type { ConcursoMateria, Topico } from "@/types/db";
import { useAtualizarHorasMateria } from "@/api/materias";
import { useDistribuirHorasTopicos } from "@/api/topicos";
import { distribuirIgual, somaHoras } from "@/lib/horas";
import { Button } from "@/components/Button";
import { HoraInput } from "@/components/HoraInput";
import { RestanteBadge } from "@/components/RestanteBadge";

/**
 * Barra de horas da matéria, exibida no topo do card de tópicos: define o total,
 * o botão Distribuir reparte igualmente entre os assuntos e o "restante" reage
 * ao vivo. O ajuste fino por assunto fica no campo de horas de cada linha
 * (TopicoRow) — tudo num lugar só, junto dos tópicos do edital.
 */
export function DistribuicaoHorasMateria({
  vinculo,
  topicos,
}: {
  vinculo: ConcursoMateria;
  topicos: Topico[];
}) {
  const setHorasMateria = useAtualizarHorasMateria();
  const distribuir = useDistribuirHorasTopicos();

  const alvo = vinculo.horas_alvo || 0;
  const distribuido = somaHoras(topicos.map((t) => t.horas_alvo));

  function distribuirIgualmente() {
    const horas = distribuirIgual(alvo, topicos.length);
    distribuir.mutate(topicos.map((t, i) => ({ id: t.id, horas_alvo: horas[i] ?? 0 })));
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-line/30 pb-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-dim">
        <Clock3 className="size-3.5 text-gold" /> Horas da matéria
      </span>
      <HoraInput
        value={alvo}
        onCommit={(h) => setHorasMateria.mutate({ id: vinculo.id, horas_alvo: h })}
        ariaLabel="Horas da matéria"
        className="!h-8"
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={distribuirIgualmente}
        disabled={topicos.length === 0 || alvo <= 0}
        title="Reparte as horas da matéria igualmente entre os assuntos"
      >
        <SplitSquareHorizontal className="size-3.5" /> Distribuir
      </Button>
      <RestanteBadge total={alvo} distribuido={distribuido} className="ml-auto text-sm" />
    </div>
  );
}
