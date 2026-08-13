import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { useSessoesJanela } from "@/api/sessoes";
import { progressoConcurso, topicosDoConcurso } from "@/lib/progresso";
import { fmtMinutos, hojeISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { DesempenhoQuestoes } from "./DesempenhoQuestoes";
import { PlanejamentoHoras } from "./PlanejamentoHoras";
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
  const { data: sessoesHoje } = useSessoesJanela(hoje, hoje);

  const progresso = useMemo(
    () =>
      progressoConcurso(
        concurso.id,
        vinculos ?? [],
        topicosDoConcurso(topicos ?? [], concurso, vinculos ?? [])
      ),
    [concurso, vinculos, topicos]
  );

  const minutosHoje = (sessoesHoje ?? []).reduce((s, x) => s + x.minutos, 0);

  return (
    <div className="space-y-5">
      {/* Status do edital: primeira seção (visão geral do quanto do edital já andou) */}
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

      {/* Desempenho em questões (estilo QConcursos) */}
      <DesempenhoQuestoes />

      {/* Tempo de estudo: gráfico dos últimos 7 dias, com o estudo de hoje ao lado */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch">
        <Card className="flex flex-col justify-center gap-2.5 px-5 py-5 lg:order-2 lg:w-60 lg:shrink-0">
          <span className="flex items-center gap-2 text-mut">
            <span className="flex size-9 items-center justify-center rounded-xl bg-navy-700 text-lg">
              ⏱️
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider">Estudo hoje</span>
          </span>
          <span className="text-3xl font-black leading-none text-txt">
            {fmtMinutos(minutosHoje) || "0min"}
          </span>
          <span className="text-[11px] text-mut">tempo registrado hoje</span>
        </Card>
        <div className="min-w-0 lg:order-1 lg:flex-1">
          <WeekStudyChart />
        </div>
      </div>

      {/* Planejamento de horas: orçamento de tempo até a prova */}
      <PlanejamentoHoras concurso={concurso} />
    </div>
  );
}
