import { useMemo, type ReactNode } from "react";
import { Link } from "react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { useSessoesJanela } from "@/api/sessoes";
import { useQuestaoLogsTodos } from "@/api/questaoLogs";
import { desempenhoGeral } from "@/features/conteudos/desempenho";
import { progressoConcurso, topicosDoConcurso } from "@/lib/progresso";
import { fmtMinutos, hojeISO, ultimos7DiasISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { PlanoProximosDias } from "@/features/metas/PlanoProximosDias";
import { DesempenhoQuestoes } from "./DesempenhoQuestoes";
import { WeekStudyChart } from "./WeekStudyChart";

/** "Bom dia" / "Boa tarde" / "Boa noite" pela hora do aparelho. */
function saudacao(hora: number): string {
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardPage() {
  const concurso = useConcursoAtual();
  const hoje = hojeISO();
  const semana = ultimos7DiasISO();

  const { data: vinculos } = useConcursoMaterias();
  const { data: topicos } = useTopicos();
  // A mesma janela do gráfico: a consulta é uma só (cache), não duas.
  const { data: sessoes } = useSessoesJanela(semana[0], semana[6]);
  const { data: logs } = useQuestaoLogsTodos();

  const progresso = useMemo(
    () =>
      progressoConcurso(
        concurso.id,
        vinculos ?? [],
        topicosDoConcurso(topicos ?? [], concurso, vinculos ?? [])
      ),
    [concurso, vinculos, topicos]
  );

  const minutosHoje = (sessoes ?? []).filter((s) => s.data === hoje).reduce((s, x) => s + x.minutos, 0);
  const minutosSemana = (sessoes ?? []).reduce((s, x) => s + x.minutos, 0);
  const questoesHoje = desempenhoGeral((logs ?? []).filter((l) => l.data === hoje));

  const agora = new Date();
  const dataPorExtenso = format(agora, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-5">
      {/* Abertura: saudação e os números do dia num relance */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-mut">{dataPorExtenso}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-txt sm:text-[28px]">
            {saudacao(agora.getHours())} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-0.5 text-sm text-dim">{concurso.nome}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Link to="conteudos" className="group block" title="Ver o edital verticalizado">
            <Indicador
              icone="📚"
              cor={concurso.cor}
              rotulo="Edital"
              valor={`${progresso.pct}%`}
              detalhe={`${progresso.concluidos} de ${progresso.total} tópicos`}
              seta
            >
              <ProgressBar value={progresso.pct} color={concurso.cor} size="sm" className="mt-2.5" />
            </Indicador>
          </Link>
          <Indicador
            icone="⏱️"
            cor="#e0a83e"
            rotulo="Hoje"
            valor={fmtMinutos(minutosHoje) || "0min"}
            detalhe="nos blocos feitos"
          />
          {/* Questões do dia: abre a página de questões em outra aba, como no menu */}
          <a href="/questoes" target="_blank" rel="noreferrer" className="group block" title="Resolver questões (nova aba)">
            <Indicador
              icone="🎯"
              cor="#3fbf7f"
              rotulo="Questões"
              valor={String(questoesHoje.total)}
              detalhe={
                questoesHoje.pct === null ? "nenhuma hoje ainda" : `hoje · ${questoesHoje.pct}% de acerto`
              }
              seta
            />
          </a>
          <Indicador
            icone="📈"
            cor="#4f9dde"
            rotulo="7 dias"
            valor={fmtMinutos(minutosSemana) || "0min"}
            detalhe={`média de ${fmtMinutos(Math.round(minutosSemana / 7)) || "0min"}/dia`}
          />
        </div>
      </section>

      {/* O plano dos próximos dias (e o ciclo das matérias logo abaixo dele) */}
      <Card>
        <CardBody>
          <PlanoProximosDias concursoId={concurso.id} />
        </CardBody>
      </Card>

      {/* Desempenho em questões (estilo QConcursos) */}
      <DesempenhoQuestoes />

      {/* Tempo de estudo dos últimos 7 dias */}
      <WeekStudyChart />
    </div>
  );
}

/** Um número do dia: ícone, rótulo, valor grande e uma linha de detalhe. */
function Indicador({
  icone,
  cor,
  rotulo,
  valor,
  detalhe,
  seta = false,
  children,
}: {
  icone: string;
  cor: string;
  rotulo: string;
  valor: string;
  detalhe: string;
  /** Mostra a setinha de "abrir" (quando o indicador é um link). */
  seta?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className="relative h-full overflow-hidden rounded-card border border-line/50 bg-navy-800/70 px-3.5 py-3 shadow-card transition-colors group-hover:border-line sm:px-4 sm:py-3.5"
      style={{ backgroundImage: `radial-gradient(90% 120% at 100% 0%, ${cor}1a, transparent 65%)` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{ background: `${cor}24` }}
        >
          {icone}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wider text-mut">
          {rotulo}
        </span>
        {seta && (
          <ChevronRight className="size-4 shrink-0 text-mut transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
        )}
      </div>
      <p className="mt-2.5 text-2xl font-extrabold leading-none tabular-nums text-txt">{valor}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-mut">{detalhe}</p>
      {children}
    </div>
  );
}
