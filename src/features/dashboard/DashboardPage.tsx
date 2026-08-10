import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { progressoConcurso, topicosDoConcurso } from "@/lib/progresso";
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

  const { data: vinculos } = useConcursoMaterias();
  const { data: topicos } = useTopicos();

  const progresso = useMemo(
    () => progressoConcurso(concurso.id, vinculos ?? [], topicosDoConcurso(topicos ?? [], concurso)),
    [concurso, vinculos, topicos]
  );

  return (
    <div className="space-y-5">
      {/* Desempenho em questões: primeira informação do painel (estilo QConcursos) */}
      <DesempenhoQuestoes />

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

      {/* Planejamento de horas: orçamento de tempo até a prova */}
      <PlanejamentoHoras concurso={concurso} />

      {/* tempo de estudo — janela móvel dos últimos 7 dias */}
      <WeekStudyChart />
    </div>
  );
}
