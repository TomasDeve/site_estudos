import { Clock3, SplitSquareHorizontal } from "lucide-react";
import type { ConcursoMateria, Topico } from "@/types/db";
import { useAtualizarHorasMateria } from "@/api/materias";
import { useAtualizarHorasTopico, useDistribuirHorasTopicos } from "@/api/topicos";
import { distribuirIgual, somaHoras } from "@/lib/horas";
import { fmtHoras } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { HoraInput } from "@/components/HoraInput";
import { RestanteBadge } from "@/components/RestanteBadge";

/**
 * "Jogo de tira-daqui-põe-ali" das horas da matéria: define o total da matéria,
 * o botão Distribuir reparte igualmente entre os assuntos e cada assunto pode
 * ser ajustado à mão, com o "restante" mudando ao vivo.
 */
export function DistribuicaoHorasMateria({
  vinculo,
  topicos,
  cor,
}: {
  vinculo: ConcursoMateria;
  topicos: Topico[];
  cor: string;
}) {
  const setHorasMateria = useAtualizarHorasMateria();
  const setHorasTopico = useAtualizarHorasTopico();
  const distribuir = useDistribuirHorasTopicos();

  const alvo = vinculo.horas_alvo || 0;
  const distribuido = somaHoras(topicos.map((t) => t.horas_alvo));

  function distribuirIgualmente() {
    const horas = distribuirIgual(alvo, topicos.length);
    distribuir.mutate(topicos.map((t, i) => ({ id: t.id, horas_alvo: horas[i] ?? 0 })));
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-txt">
            <Clock3 className="size-4 text-gold" /> Horas da matéria
          </h2>
          <div className="flex items-center gap-2.5">
            <HoraInput
              value={alvo}
              onCommit={(h) => setHorasMateria.mutate({ id: vinculo.id, horas_alvo: h })}
              ariaLabel="Horas da matéria"
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
            <RestanteBadge total={alvo} distribuido={distribuido} />
          </div>
        </div>

        {topicos.length === 0 ? (
          <p className="mt-2 text-xs text-mut">
            Adicione assuntos abaixo para poder distribuir as horas.
          </p>
        ) : (
          <ul className="mt-3 max-h-[360px] space-y-0.5 overflow-y-auto pr-1">
            {topicos.map((t) => {
              const share = alvo > 0 ? Math.round((t.horas_alvo / alvo) * 100) : 0;
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-navy-700/40"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-dim">{t.titulo}</span>
                  <span className="hidden shrink-0 text-[11px] tabular-nums text-mut sm:inline">
                    {t.horas_alvo > 0 ? fmtHoras(t.horas_alvo) : ""}
                  </span>
                  <div className="hidden w-20 shrink-0 sm:block">
                    <ProgressBar value={share} color={cor} size="sm" />
                  </div>
                  <HoraInput
                    value={t.horas_alvo}
                    onCommit={(h) => setHorasTopico.mutate({ id: t.id, horas_alvo: h })}
                    ariaLabel={`Horas de ${t.titulo}`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
