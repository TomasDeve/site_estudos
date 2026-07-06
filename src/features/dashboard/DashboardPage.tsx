import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { useQuestaoLogsJanela } from "@/api/questaoLogs";
import { useSessoesJanela } from "@/api/sessoes";
import { calcStreak, useDiasConcluidos } from "@/api/diasConcluidos";
import { progressoConcurso } from "@/lib/progresso";
import { fmtMinutos, hojeISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";
import { CompromissosCard } from "./CompromissosCard";
import { WeekStudyChart } from "./WeekStudyChart";

const NOME_AREA: Record<string, string> = {
  P1: "Básicos",
  P2: "Específicos",
  outros: "Outros",
};

export function DashboardPage() {
  const concurso = useConcursoAtual();
  const hoje = hojeISO();

  const { data: vinculos } = useConcursoMaterias();
  const { data: topicos } = useTopicos();
  const { data: logsHoje } = useQuestaoLogsJanela(hoje, hoje);
  const { data: sessoesHoje } = useSessoesJanela(hoje, hoje);
  const { data: dias } = useDiasConcluidos();

  const progresso = useMemo(
    () => progressoConcurso(concurso.id, vinculos ?? [], topicos ?? []),
    [concurso.id, vinculos, topicos]
  );

  const questoesHoje = (logsHoje ?? []).reduce((s, l) => s + l.total, 0);
  const acertosHoje = (logsHoje ?? []).reduce((s, l) => s + l.acertos, 0);
  const minutosHoje = (sessoesHoje ?? []).reduce((s, x) => s + x.minutos, 0);
  const streak = calcStreak(dias, hoje);

  return (
    <div className="space-y-5">
      {/* Status do edital */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-mut">
                Status do edital
              </p>
              <p className="mt-0.5 text-sm text-dim">
                <strong className="text-2xl font-black" style={{ color: concurso.cor }}>
                  {progresso.pct}%
                </strong>{" "}
                do conteúdo programático concluído · {progresso.concluidos}/{progresso.total}{" "}
                tópicos
              </p>
            </div>
            <Link
              to="conteudos"
              className="flex items-center gap-1 text-xs font-semibold text-gold hover:underline"
            >
              Ver edital verticalizado <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ProgressBar value={progresso.pct} color={concurso.cor} size="lg" className="mt-3" />
          {Object.keys(progresso.porArea).length > 1 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(progresso.porArea).map(([area, p]) => (
                <div key={area}>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="font-semibold text-dim">
                      {NOME_AREA[area] ?? area}
                    </span>
                    <span className="tabular-nums text-mut">
                      {p.concluidos}/{p.total} · {p.pct}%
                    </span>
                  </div>
                  <ProgressBar value={p.pct} size="sm" color={area === "P1" ? "#4f9dde" : concurso.cor} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* métricas rápidas de hoje */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="✍️"
          label="Questões hoje"
          value={questoesHoje}
          sub={
            questoesHoje > 0
              ? `${Math.round((acertosHoje / questoesHoje) * 100)}% de acerto`
              : undefined
          }
        />
        <StatCard icon="⏱️" label="Estudo hoje" value={fmtMinutos(minutosHoje) || "0min"} />
        <StatCard icon="🔥" label="Sequência" value={`${streak} ${streak === 1 ? "dia" : "dias"}`} />
        <Link to="metas" className="block">
          <StatCard icon="🗓️" label="Planejar" value="Metas do dia" sub="abrir planner →" />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <WeekStudyChart />
        <CompromissosCard concursoId={concurso.id} />
      </div>
    </div>
  );
}
