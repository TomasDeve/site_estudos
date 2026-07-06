import { Link } from "react-router";
import { Import } from "lucide-react";
import { useQuestaoLogsJanela } from "@/api/questaoLogs";
import { useMaterias } from "@/api/materias";
import { diasAtrasISO, hojeISO } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/Button";
import { QuickLogForm } from "./QuickLogForm";
import { AcertosChart, PorMateriaChart } from "./charts";
import { HistoricoTable } from "./HistoricoTable";

export function MetricasPage() {
  const hoje = hojeISO();
  const { data: logs30 } = useQuestaoLogsJanela(diasAtrasISO(30), hoje);
  const { data: materias } = useMaterias();

  const deHoje = (logs30 ?? []).filter((l) => l.data === hoje);
  const questoesHoje = deHoje.reduce((s, l) => s + l.total, 0);
  const acertosHoje = deHoje.reduce((s, l) => s + l.acertos, 0);
  const questoes30 = (logs30 ?? []).reduce((s, l) => s + l.total, 0);
  const acertos30 = (logs30 ?? []).reduce((s, l) => s + l.acertos, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Métricas de questões"
        subtitle="Acompanhe volume e taxa de acerto — combustível da aprovação"
        action={
          <Link to="importar">
            <Button variant="secondary">
              <Import className="size-4" /> Importar do Qconcursos
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="✍️" label="Questões hoje" value={questoesHoje} />
        <StatCard
          icon="🎯"
          label="Acerto hoje"
          value={questoesHoje > 0 ? `${Math.round((acertosHoje / questoesHoje) * 100)}%` : "—"}
          sub={questoesHoje > 0 ? `${acertosHoje}/${questoesHoje}` : undefined}
        />
        <StatCard icon="📚" label="Questões 30 dias" value={questoes30} />
        <StatCard
          icon="📈"
          label="Acerto médio 30d"
          value={questoes30 > 0 ? `${Math.round((acertos30 / questoes30) * 100)}%` : "—"}
        />
      </div>

      <QuickLogForm />

      <div className="grid gap-5 lg:grid-cols-2">
        <AcertosChart logs={logs30 ?? []} />
        <PorMateriaChart logs={logs30 ?? []} materias={materias ?? []} />
      </div>

      <HistoricoTable />
    </div>
  );
}
