import { Clock3, RotateCcw, SplitSquareHorizontal } from "lucide-react";
import type { ConcursoMateria, Topico } from "@/types/db";
import { useAtualizarHorasMateria } from "@/api/materias";
import { useDistribuirHorasTopicos } from "@/api/topicos";
import { useZerarEstudoAssuntos } from "@/api/estudoHoras";
import { distribuirIgual, horasRestantes, somaHoras } from "@/lib/horas";
import { Button } from "@/components/Button";
import { HoraInput } from "@/components/HoraInput";
import { RestanteBadge } from "@/components/RestanteBadge";
import { BarraHoras } from "@/features/horas/BarraHoras";

interface Props {
  vinculo: ConcursoMateria;
  topicos: Topico[];
  cor?: string;
}

/**
 * Controles de horas da matéria (rótulo + contador regressivo + Distribuir +
 * saldo a distribuir), pensados para entrar numa linha só com o título "Tópicos
 * do edital" e a legenda — sem ocupar uma faixa própria. O campo é regressivo:
 * mostra as horas que FALTAM (plano − estudado) e desce a cada estudo; editá-lo
 * redefine o plano. Distribuir reparte o plano igualmente entre os assuntos.
 */
export function HorasMateriaControles({ vinculo, topicos }: Props) {
  const setHorasMateria = useAtualizarHorasMateria();
  const distribuir = useDistribuirHorasTopicos();

  const alvo = vinculo.horas_alvo || 0;
  const distribuido = somaHoras(topicos.map((t) => t.horas_alvo));
  const estudado = somaHoras(topicos.map((t) => t.horas_estudadas));

  function distribuirIgualmente() {
    // Assuntos riscados ficam fora do rateio — o tempo não vai para eles.
    const riscados = new Set(vinculo.topicos_riscados ?? []);
    const ativos = topicos.filter((t) => !riscados.has(t.id));
    const horas = distribuirIgual(alvo, ativos.length);
    distribuir.mutate(ativos.map((t, i) => ({ id: t.id, horas_alvo: horas[i] ?? 0 })));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-dim">
        <Clock3 className="size-3.5 text-gold" />
        <span className="max-sm:hidden">Horas da matéria</span>
      </span>
      {/* Contador regressivo: horas que FALTAM (plano − estudado); editar redefine
          o plano como estudado + digitado. */}
      <HoraInput
        value={horasRestantes(alvo, estudado)}
        onCommit={(h) => setHorasMateria.mutate({ id: vinculo.id, horas_alvo: estudado + h })}
        ariaLabel="Horas restantes da matéria"
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
      <RestanteBadge total={alvo} distribuido={distribuido} className="text-sm" />
    </div>
  );
}

/**
 * Barra de progresso das horas da matéria (plano × estudado) + atalho para zerar
 * o tempo estudado. Fica na linha logo abaixo dos controles, pois é uma barra
 * larga. Some quando ainda não há plano nem tempo estudado.
 */
export function HorasMateriaBarra({ vinculo, topicos, cor }: Props) {
  const zerarEstudo = useZerarEstudoAssuntos();

  const alvo = vinculo.horas_alvo || 0;
  const estudado = somaHoras(topicos.map((t) => t.horas_estudadas));

  if (!(alvo > 0 || estudado > 0)) return null;

  function zerar() {
    if (!window.confirm("Zerar o tempo estudado de todos os assuntos desta matéria? As horas planejadas continuam.")) return;
    zerarEstudo.mutate(topicos.map((t) => t.id));
  }

  return (
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
  );
}
