import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuestaoLogsTodos } from "@/api/questaoLogs";
import { useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { diasAtrasISO } from "@/lib/dates";
import { corDesempenho } from "@/features/conteudos/desempenho";
import { Card, CardBody } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";

type Periodo = "tudo" | "120d" | "30d" | "7d";

/** Ordem pedida pelo usuário; `dias` é o tamanho da janela (null = tudo). */
const OPCOES: { id: Periodo; rotulo: string; dias: number | null }[] = [
  { id: "tudo", rotulo: "Tudo", dias: null },
  { id: "120d", rotulo: "120D", dias: 120 },
  { id: "30d", rotulo: "30D", dias: 30 },
  { id: "7d", rotulo: "7D", dias: 7 },
];

const SEM_ASSUNTO = "__geral";

interface Assunto {
  chave: string;
  nome: string;
  total: number;
  acertos: number;
}

interface GrupoMateria {
  chave: string;
  nome: string;
  total: number;
  acertos: number;
  /** Vazio quando a matéria não tem quebra por assunto (só registros avulsos). */
  assuntos: Assunto[];
}

/** Cor sólida da barrinha de acerto, nos mesmos cortes de `corDesempenho`. */
function corBarra(pct: number) {
  if (pct >= 81) return "bg-cyan";
  if (pct >= 70) return "bg-green";
  if (pct >= 50) return "bg-amber";
  return "bg-red";
}

/**
 * Acertos por matéria no período escolhido (Tudo/120D/30D/7D, 30D por padrão).
 * Clicar numa matéria abre a quebra por assunto. Substitui o antigo Histórico da
 * página de Métricas: em vez da lista crua de registros, o rendimento agregado.
 */
export function AcertosPorMateria() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [aberta, setAberta] = useState<string | null>(null);
  const { data: logs, isLoading } = useQuestaoLogsTodos();
  const { data: materias } = useMaterias();
  const { data: topicos } = useTopicos();

  const opcao = OPCOES.find((o) => o.id === periodo)!;

  const { grupos, totalQuestoes } = useMemo(() => {
    const materiaPorId = new Map((materias ?? []).map((m) => [m.id, m]));
    const topicoPorId = new Map((topicos ?? []).map((t) => [t.id, t]));

    // A janela: "YYYY-MM-DD" compara como string, então `data >= desde` já é cronológico.
    const desde = opcao.dias === null ? null : diasAtrasISO(opcao.dias - 1);
    const janela = (logs ?? []).filter((l) => (desde ? l.data >= desde : true));

    type Acc = {
      chave: string;
      nome: string;
      total: number;
      acertos: number;
      assuntos: Map<string, Assunto>;
    };
    const mapa = new Map<string, Acc>();

    for (const l of janela) {
      const chave = l.materia_id ?? `texto:${l.materia_texto ?? ""}`;
      let g = mapa.get(chave);
      if (!g) {
        const m = l.materia_id ? materiaPorId.get(l.materia_id) : undefined;
        g = {
          chave,
          nome: m ? `${m.icone} ${m.nome}` : l.materia_texto || "Geral",
          total: 0,
          acertos: 0,
          assuntos: new Map(),
        };
        mapa.set(chave, g);
      }
      g.total += l.total;
      g.acertos += l.acertos;

      const tChave = l.topico_id ?? SEM_ASSUNTO;
      let s = g.assuntos.get(tChave);
      if (!s) {
        const t = l.topico_id ? topicoPorId.get(l.topico_id) : undefined;
        s = {
          chave: tChave,
          nome: l.topico_id ? t?.titulo ?? "Assunto removido" : "Sem assunto",
          total: 0,
          acertos: 0,
        };
        g.assuntos.set(tChave, s);
      }
      s.total += l.total;
      s.acertos += l.acertos;
    }

    const grupos: GrupoMateria[] = [...mapa.values()]
      .map((g) => {
        const temAssunto = [...g.assuntos.keys()].some((k) => k !== SEM_ASSUNTO);
        return {
          chave: g.chave,
          nome: g.nome,
          total: g.total,
          acertos: g.acertos,
          assuntos: temAssunto
            ? [...g.assuntos.values()].sort((a, b) => b.total - a.total)
            : [],
        };
      })
      .sort((a, b) => b.total - a.total);

    const totalQuestoes = janela.reduce((s, l) => s + l.total, 0);
    return { grupos, totalQuestoes };
  }, [logs, materias, topicos, opcao]);

  return (
    <Card>
      {/* Cabeçalho + filtro de período (mesmo controle do Desempenho no painel) */}
      <div className="flex flex-col gap-3 border-b border-line/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-wide text-txt">Acertos por matéria</h3>
          <p className="mt-0.5 text-xs text-mut">
            {totalQuestoes > 0
              ? `${totalQuestoes} questões — clique para ver os assuntos`
              : "Clique numa matéria para ver os assuntos"}
          </p>
        </div>
        <div className="inline-flex shrink-0 self-start rounded-xl border border-line/60 bg-navy-900/60 p-0.5 sm:self-auto">
          {OPCOES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setPeriodo(o.id)}
              aria-pressed={periodo === o.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                periodo === o.id ? "bg-gold text-navy-950 shadow-sm" : "text-dim hover:text-txt"
              }`}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>

      <CardBody className="!px-2 !py-2 sm:!px-3">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner className="size-8" />
          </div>
        ) : grupos.length === 0 ? (
          <EmptyState
            icon="📊"
            title="Nenhuma questão no período"
            message="Registre questões nos Conteúdos ou amplie o período acima."
          />
        ) : (
          <ul className="divide-y divide-line/25">
            {grupos.map((g) => {
              const pct = g.total > 0 ? Math.round((g.acertos / g.total) * 100) : 0;
              const cor = corDesempenho(pct);
              const expansivel = g.assuntos.length > 0;
              const abertaAgora = aberta === g.chave;
              return (
                <li key={g.chave}>
                  <button
                    type="button"
                    disabled={!expansivel}
                    onClick={() => setAberta((a) => (a === g.chave ? null : g.chave))}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left transition sm:gap-3 ${
                      expansivel ? "cursor-pointer hover:bg-navy-700/40" : "cursor-default"
                    }`}
                  >
                    <ChevronDown
                      className={`size-4 shrink-0 text-mut transition-transform ${
                        abertaAgora ? "rotate-180" : ""
                      } ${expansivel ? "" : "invisible"}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-txt">{g.nome}</span>
                        <span className="shrink-0 text-xs tabular-nums text-dim">
                          {g.acertos}/{g.total}
                        </span>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${cor.texto} ${cor.fundo}`}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-900/70">
                        <div className={`h-full rounded-full ${corBarra(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </button>

                  {expansivel && abertaAgora && (
                    <ul className="mb-1.5 ml-3 space-y-1.5 border-l border-line/40 pl-3 sm:ml-4 sm:pl-4">
                      {g.assuntos.map((s) => {
                        const spct = s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0;
                        const scor = corDesempenho(spct);
                        return (
                          <li key={s.chave} className="flex items-center gap-2 py-0.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate text-xs text-dim">{s.nome}</span>
                                <span className="shrink-0 text-[11px] tabular-nums text-mut">
                                  {s.acertos}/{s.total}
                                </span>
                                <span className={`shrink-0 text-xs font-bold tabular-nums ${scor.texto}`}>
                                  {spct}%
                                </span>
                              </div>
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-navy-900/70">
                                <div className={`h-full rounded-full ${corBarra(spct)}`} style={{ width: `${spct}%` }} />
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
