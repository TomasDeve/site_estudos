import { taxaConstancia, useDiasConcluidos } from "@/api/diasConcluidos";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { DiaPlanner } from "./DiaPlanner";
import { MetaRangeList } from "./MetaRangeList";
import { MetasPorAssunto } from "./MetasPorAssunto";
import { PlanoSeisDias } from "./PlanoSeisDias";

export function MetasPage() {
  const concurso = useConcursoAtual();
  const { data: dias } = useDiasConcluidos();
  const constancia = taxaConstancia(dias);

  return (
    <div>
      <PageHeader
        title="Prazos e Metas"
        subtitle="Planeje o dia em blocos e feche com chave de ouro"
      />

      {/* Próximos 6 dias, hora a hora (até 5h/dia): o que fazer em cada hora */}
      <div className="mb-5">
        <PlanoSeisDias concursoId={concurso.id} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <DiaPlanner concursoIdPadrao={concurso.id} />
          <MetasPorAssunto />
        </div>
        <div className="min-w-0 space-y-5">
          <MetaRangeList />
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon="✅"
              label="Dias concluídos"
              value={dias?.length ?? 0}
              sub="últimos 6 meses"
            />
            <StatCard
              icon="📈"
              label="Constância"
              value={constancia === null ? "—" : `${constancia}%`}
              sub="dos dias no período"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
