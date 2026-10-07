import { type MouseEvent, useMemo, useRef, useState } from "react";
import { useQuestaoLogsTodos } from "@/api/questaoLogs";
import { useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { desempenhoGeral } from "@/features/conteudos/desempenho";
import { diasAtrasISO, hojeISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { Spinner } from "@/components/Spinner";

type Periodo = "hoje" | "ontem" | "7d" | "30d" | "sempre";

const OPCOES: { id: Periodo; rotulo: string; descricao: string }[] = [
  { id: "hoje", rotulo: "Hoje", descricao: "Suas resoluções de hoje" },
  { id: "ontem", rotulo: "Ontem", descricao: "Suas resoluções de ontem" },
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

  const { data: materias } = useMaterias();
  const { data: topicos } = useTopicos();

  const janela = useMemo(() => {
    const todos = logs ?? [];
    if (periodo === "ontem") {
      const ontem = diasAtrasISO(1);
      return todos.filter((l) => l.data === ontem);
    }
    const desde =
      periodo === "hoje"
        ? hojeISO()
        : periodo === "7d"
          ? diasAtrasISO(6)
          : periodo === "30d"
            ? diasAtrasISO(29)
            : null;
    // `data` é "YYYY-MM-DD": comparação de string já é cronológica.
    return desde ? todos.filter((l) => l.data >= desde) : todos;
  }, [logs, periodo]);

  const { total, acertos } = useMemo(() => desempenhoGeral(janela), [janela]);
  const erros = total - acertos;
  const opcao = OPCOES.find((o) => o.id === periodo)!;

  // Placar por matéria: a matéria vem do tópico (quando o registro tem) ou do
  // próprio registro; o que não casa com nenhuma fica pelo texto importado.
  const porMateria = useMemo(() => {
    const materiaDoTopico = new Map((topicos ?? []).map((t) => [t.id, t.materia_id]));
    const materiaPorId = new Map((materias ?? []).map((m) => [m.id, m]));
    const grupos = new Map<string, LinhaMateria>();
    for (const l of janela) {
      const mid = (l.topico_id && materiaDoTopico.get(l.topico_id)) || l.materia_id;
      const m = mid ? materiaPorId.get(mid) : undefined;
      const chave = m?.id ?? l.materia_texto ?? "—";
      const g = grupos.get(chave) ?? {
        chave,
        nome: m?.nome ?? l.materia_texto ?? "Sem matéria",
        icone: m?.icone ?? "📘",
        total: 0,
        acertos: 0,
      };
      g.total += l.total;
      g.acertos += l.acertos;
      grupos.set(chave, g);
    }
    return [...grupos.values()].filter((g) => g.total > 0).sort((a, b) => b.total - a.total);
  }, [janela, materias, topicos]);

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
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition sm:px-3 ${
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
          <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8">
            {/* Geral: anel + os três números empilhados ao lado */}
            <div className="flex items-center justify-center gap-6 lg:justify-start">
              <Anel acertos={acertos} erros={erros} />
              <div className="flex flex-col gap-3">
                <Stat n={total} label="Resoluções" />
                <Stat n={acertos} label="Corretas" cor={VERDE} />
                <Stat n={erros} label="Erradas" cor={VERMELHO} />
              </div>
            </div>

            {/* Por matéria — altura fixa, rola quando há muitas */}
            <div className="min-w-0 lg:border-l lg:border-line/40 lg:pl-8">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_2.5rem_3rem] items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wider text-mut">
                <span className="col-span-5 sm:col-span-1">Por matéria</span>
                <span className="col-start-2 text-right sm:col-start-auto" title="Questões resolvidas">Qtd</span>
                <span className="text-right" style={{ color: VERDE }} title="Certas">✓</span>
                <span className="text-right" style={{ color: VERMELHO }} title="Erradas">✗</span>
                <span className="text-right" title="Acerto">%</span>
              </div>
              {porMateria.length === 0 ? (
                <p className="py-8 text-center text-xs text-mut">
                  Nenhuma questão resolvida neste período.
                </p>
              ) : (
                <ul className="max-h-[220px] space-y-1 overflow-y-auto pr-1 sm:max-h-[150px]">
                  {porMateria.map((g) => (
                    <LinhaPorMateria key={g.chave} g={g} />
                  ))}
                </ul>
              )}
            </div>
          </div>
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
    <div className="flex items-baseline gap-2">
      <span
        className="min-w-[2.5ch] text-2xl font-black tabular-nums leading-none text-txt"
        style={cor ? { color: cor } : undefined}
      >
        {n}
      </span>
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-dim">
        {cor && <span className="size-2 shrink-0 rounded-full" style={{ background: cor }} />}
        {label}
      </span>
    </div>
  );
}

interface LinhaMateria {
  chave: string;
  nome: string;
  icone: string;
  total: number;
  acertos: number;
}

/** Uma matéria: nome + barrinha de acerto embaixo; total, certas, erradas e %. */
function LinhaPorMateria({ g }: { g: LinhaMateria }) {
  const erradas = g.total - g.acertos;
  const pct = Math.round((g.acertos / g.total) * 100);
  const corPct = pct >= 70 ? VERDE : pct >= 50 ? "#e0a83e" : VERMELHO;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.5rem_2.5rem_3rem] items-center gap-x-2 gap-y-1 rounded-lg px-1 py-1 text-xs hover:bg-navy-800/60">
      <div className="col-span-5 min-w-0 sm:col-span-1">
        <div className="flex items-center gap-1.5">
          <span className="shrink-0 text-sm leading-none">{g.icone}</span>
          <span className="truncate font-medium text-txt" title={g.nome}>
            {g.nome}
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-navy-600">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: corPct }} />
        </div>
      </div>
      <span className="col-start-2 text-right tabular-nums text-txt sm:col-start-auto">{g.total}</span>
      <span className="text-right tabular-nums" style={{ color: VERDE }}>
        {g.acertos}
      </span>
      <span className="text-right tabular-nums" style={{ color: VERMELHO }}>
        {erradas}
      </span>
      <span className="text-right font-bold tabular-nums" style={{ color: corPct }}>
        {pct}%
      </span>
    </li>
  );
}
