import { type MouseEvent, useMemo, useRef, useState } from "react";
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

/**
 * Anel de rendimento (acertos × erros) com destaque no hover, no estilo do
 * QConcursos: a fatia sob o mouse "salta" pra fora, a outra escurece e um balão
 * segue o cursor mostrando "Acertos/Erros: xx.xx% | N". O % de acerto fica no
 * centro. Sem questões no período, mostra só o trilho neutro com "—".
 */
function Anel({ acertos, erros }: { acertos: number; erros: number }) {
  const total = acertos + erros;
  const r = 54;
  const C = 2 * Math.PI * r;
  const fAcerto = total > 0 ? acertos / total : 0;
  const pct = total > 0 ? Math.round(fAcerto * 100) : null;
  const lenAcerto = C * fAcerto;
  const lenErro = C * (total > 0 ? erros / total : 0);

  const [hover, setHover] = useState<"acerto" | "erro" | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const mover = (e: MouseEvent) => {
    const box = ref.current?.getBoundingClientRect();
    if (box) setPos({ x: e.clientX - box.left, y: e.clientY - box.top });
  };
  // "explode": desloca a fatia na direção da sua bissetriz (fração medida do
  // topo, no sentido horário) — 0 = topo, 0.25 = 3h, 0.5 = base...
  const explode = (fracCentro: number) => {
    const a = 2 * Math.PI * fracCentro;
    return `translate(${Math.sin(a) * 7}px, ${-Math.cos(a) * 7}px)`;
  };

  const fatias = {
    acerto: { nome: "Acertos", valor: acertos, cor: VERDE },
    erro: { nome: "Erros", valor: erros, cor: VERMELHO },
  } as const;
  const balao = hover ? fatias[hover] : null;

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      style={{ width: 150, height: 150 }}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox="0 0 150 150" width={150} height={150} style={{ overflow: "visible" }}>
        {/* trilho neutro (aparece quando não há questões no período) */}
        <circle cx="75" cy="75" r={r} fill="none" stroke="#1d3454" strokeWidth="14" />
        {total > 0 && (
          <>
            <g
              style={{
                transform: hover === "acerto" ? explode(fAcerto / 2) : "translate(0,0)",
                transition: "transform .15s ease",
              }}
            >
              <circle
                cx="75"
                cy="75"
                r={r}
                fill="none"
                stroke={VERDE}
                strokeWidth="14"
                strokeDasharray={`${lenAcerto} ${C}`}
                transform="rotate(-90 75 75)"
                style={{ opacity: hover === "erro" ? 0.4 : 1, transition: "opacity .15s ease" }}
                onMouseEnter={() => setHover("acerto")}
                onMouseMove={mover}
              />
            </g>
            <g
              style={{
                transform: hover === "erro" ? explode((1 + fAcerto) / 2) : "translate(0,0)",
                transition: "transform .15s ease",
              }}
            >
              <circle
                cx="75"
                cy="75"
                r={r}
                fill="none"
                stroke={VERMELHO}
                strokeWidth="14"
                strokeDasharray={`${lenErro} ${C}`}
                transform={`rotate(${-90 + 360 * fAcerto} 75 75)`}
                style={{ opacity: hover === "acerto" ? 0.4 : 1, transition: "opacity .15s ease" }}
                onMouseEnter={() => setHover("erro")}
                onMouseMove={mover}
              />
            </g>
          </>
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tabular-nums text-txt">
          {pct === null ? "—" : `${pct}%`}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-mut">acerto</span>
      </div>

      {balao && (
        <div
          className="pointer-events-none absolute z-20 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-navy-700 px-2.5 py-1.5 text-xs font-semibold text-txt shadow-pop"
          style={{ left: pos.x, top: pos.y, transform: "translate(-50%, calc(-100% - 12px))" }}
        >
          <span className="size-2 shrink-0 rounded-full" style={{ background: balao.cor }} />
          {balao.nome}: {((balao.valor / total) * 100).toFixed(2)}% | {balao.valor}
        </div>
      )}
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
