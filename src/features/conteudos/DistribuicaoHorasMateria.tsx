import { Clock3, RotateCcw, SplitSquareHorizontal } from "lucide-react";
import type { ConcursoMateria, Topico } from "@/types/db";
import { useAtualizarHorasMateria } from "@/api/materias";
import { useDistribuirHorasTopicos } from "@/api/topicos";
import { useZerarEstudoAssuntos } from "@/api/estudoHoras";
import { distribuirIgual, somaHoras } from "@/lib/horas";
import { Button } from "@/components/Button";
import { HoraInput } from "@/components/HoraInput";
import { RestanteBadge } from "@/components/RestanteBadge";
import { BarraHoras } from "@/features/horas/BarraHoras";

/**
 * Barra de horas da matéria, exibida no topo do card de tópicos: define o total,
 * o botão Distribuir reparte igualmente entre os assuntos e o "restante" reage
 * ao vivo. O ajuste fino por assunto fica no campo de horas de cada linha
 * (TopicoRow) — tudo num lugar só, junto dos tópicos do edital.
 */
export function DistribuicaoHorasMateria({
  vinculo,
  topicos,
  cor,
}: {
  vinculo: ConcursoMateria;
  topicos: Topico[];
  cor?: string;
}) {
  const setHorasMateria = useAtualizarHorasMateria();
  const distribuir = useDistribuirHorasTopicos();
  const zerarEstudo = useZerarEstudoAssuntos();

  const alvo = vinculo.horas_alvo || 0;
  const distribuido = somaHoras(topicos.map((t) => t.horas_alvo));
  const estudado = somaHoras(topicos.map((t) => t.horas_estudadas));

  function zerar() {
    if (!window.confirm("Zerar o tempo estudado de todos os assuntos desta matéria? As horas planejadas continuam.")) return;
    zerarEstudo.mutate(topicos.map((t) => t.id));
  }

  function distribuirIgualmente() {
    const horas = distribuirIgual(alvo, topicos.length);
    distribuir.mutate(topicos.map((t, i) => ({ id: t.id, horas_alvo: horas[i] ?? 0 })));
  }

  return (
    <div className="mb-3 space-y-2 border-b border-line/30 pb-3">
      <div className="flex flex-wrap items-center gap-2">
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
      {(alvo > 0 || estudado > 0) && (
        <div className="flex items-center gap-2">
          <BarraHoras alvo={alvo} estudado={estudado} cor={cor} className="min-w-0 flex-1" />
          {estudado > 0 && (
            <button
              onClick={zerar}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-mut transition-colors hover:bg-navy-700 hover:text-dim"
              title="Zerar o tempo estudado dos assuntos (recomeçar a contagem)"
            >
              <RotateCcw className="size-3" /> zerar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
