import { useMemo, useState } from "react";
import { useQuestaoLogsTodos } from "@/api/questaoLogs";
import { desempenhoGeral } from "@/features/conteudos/desempenho";
import { diasAtrasISO, hojeISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { Spinner } from "@/components/Spinner";

type Periodo = "hoje" | "7d" | "30d" | "sempre";

const OPCOES: { id: Periodo; rotulo: string; descricao: string }[] = [
  { id: "hoje", rotulo: "Hoje", descricao: "Suas resoluções de hoje" },
  { id: "7d", rotulo: "7 dias", descricao: "Resoluções dos últimos 7 dias" },
  { id: "30d", rotulo: "30 dias", descricao: "Resoluções dos últimos 30 dias" },
  { id: "sempre", rotulo: "Sempre", descricao: "Todo o seu histórico" },
];

const VERDE = "#3fbf7f";
const VERMELHO = "#e5564b";

/**
 * Painel de desempenho no estilo do QConcursos: a primeira coisa que o usuário
 * vê no painel. Anel de rendimento (acertos × erros) + o placar de resoluções,
 * com filtro de período (Hoje por padrão). Sem gráfico de histórico e sem
 * "zerar questões" — a pedido do usuário.
 */
export function DesempenhoQuestoes() {
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const { data: logs, isLoading } = useQuestaoLogsTodos();

  const placar = useMemo(() => {
    const todos = logs ?? [];
    const desde =
      periodo === "hoje"
        ? hojeISO()
        : periodo === "7d"
          ? diasAtrasISO(6)
          : periodo === "30d"
            ? diasAtrasISO(29)
            : null;
    // `data` é "YYYY-MM-DD": comparação de string já é cronológica.
    const janela = desde ? todos.filter((l) => l.data >= desde) : todos;
    return desempenhoGeral(janela);
  }, [logs, periodo]);

  const { total, acertos } = placar;
  const erros = total - acertos;
  const opcao = OPCOES.find((o) => o.id === periodo)!;

  return (
    <Card>
      {/* Cabeçalho + filtro de período */}
      <div className="flex flex-col gap-3 border-b border-line/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-txt">Desempenho em questões</h3>
          <p className="mt-0.5 text-xs text-mut">{opcao.descricao}</p>
        </div>
        <div className="inline-flex shrink-0 rounded-xl border border-line/60 bg-navy-900/60 p-0.5">
          {OPCOES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setPeriodo(o.id)}
              aria-pressed={periodo === o.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                periodo === o.id
                  ? "bg-gold text-navy-950 shadow-sm"
                  : "text-dim hover:text-txt"
              }`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>

      <CardBody>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="size-8" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <Anel acertos={acertos} erros={erros} />
            <div className="grid w-full flex-1 grid-cols-3 gap-2">
              <Stat n={total} label="Resoluções de questões" />
              <Stat n={acertos} label="Resoluções corretas" cor={VERDE} />
              <Stat n={erros} label="Resoluções erradas" cor={VERMELHO} />
            </div>
          </div>
        )}
        {!isLoading && total === 0 && (
          <p className="mt-4 text-center text-xs text-mut">
            Nenhuma questão resolvida neste período — resolva questões nos Conteúdos para
            alimentar seu desempenho.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

/** Anel de rendimento: fatia verde (acertos) + fatia vermelha (erros), com o % de acerto no centro. */
function Anel({ acertos, erros }: { acertos: number; erros: number }) {
  const total = acertos + erros;
  const r = 50;
  const C = 2 * Math.PI * r;
  const fAcerto = total > 0 ? acertos / total : 0;
  const pct = total > 0 ? Math.round(fAcerto * 100) : null;
  const lenAcerto = C * fAcerto;
  const lenErro = C * (total > 0 ? erros / total : 0);

  return (
    <div className="relative shrink-0" style={{ width: 132, height: 132 }}>
      <svg viewBox="0 0 120 120" className="size-full">
        {/* trilho neutro (aparece quando não há questões no período) */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1d3454" strokeWidth="13" />
        {total > 0 && (
          <>
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={VERDE}
              strokeWidth="13"
              strokeDasharray={`${lenAcerto} ${C}`}
              transform="rotate(-90 60 60)"
            />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={VERMELHO}
              strokeWidth="13"
              strokeDasharray={`${lenErro} ${C}`}
              transform={`rotate(${-90 + 360 * fAcerto} 60 60)`}
            />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums text-txt">
          {pct === null ? "—" : `${pct}%`}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-mut">acerto</span>
      </div>
    </div>
  );
}

function Stat({ n, label, cor }: { n: number; label: string; cor?: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-black tabular-nums text-txt" style={cor ? { color: cor } : undefined}>
        {n}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-medium leading-tight text-dim">
        {cor && <span className="size-2 shrink-0 rounded-full" style={{ background: cor }} />}
        {label}
      </div>
    </div>
  );
}
