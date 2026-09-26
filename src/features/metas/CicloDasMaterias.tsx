import { useMemo, type CSSProperties } from "react";
import {
  CalendarPlus,
  CircleDashed,
  Crown,
  Gem,
  Medal,
  RotateCcw,
  Shield,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Materia } from "@/types/db";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useInicioCicloPlano } from "@/api/concursos";
import { usePlanoDesde } from "@/api/planoHoras";
import { hojeISO } from "@/lib/dates";
import { MenuMais } from "@/components/MenuMais";
import { fmtTempo, rotuloDoDia, somarDias } from "./planoDias";
import {
  RANKS,
  TIERS,
  contarCiclo,
  rankDoCiclo,
  voltaDoCiclo,
  type ContagemCiclo,
  type Rank,
  type TierRank,
} from "./cicloPlano";

const ICONES: Record<TierRank["icone"], LucideIcon> = {
  medalha: Medal,
  escudo: Shield,
  gema: Gem,
  estrela: Star,
  trofeu: Trophy,
  coroa: Crown,
};

/** Fundo e borda da linha por divisão (I, II, III), em alfa hex: o tom cresce. */
const TONS = [
  ["12", "4d"],
  ["1f", "80"],
  ["2e", "b3"],
] as const;

function estiloDaLinha({ tier, divisao }: Rank): CSSProperties | undefined {
  if (!tier) return undefined;
  if (tier.degrade)
    return {
      backgroundColor: `${tier.cor}1f`,
      borderColor: `${tier.cor}cc`,
      boxShadow: `0 0 14px ${tier.cor}40`,
    };
  const [fundo, borda] = TONS[divisao - 1];
  return { backgroundColor: `${tier.cor}${fundo}`, borderColor: `${tier.cor}${borda}` };
}

/**
 * Ciclo das matérias, logo abaixo da grade do plano: as matérias do edital,
 * numeradas na ordem, cada uma com o seu rank — cada bloco dela no plano sobe um
 * (Bronze I, II, III, Prata… até a Lenda, 27 ranks). "Novo ciclo" zera a
 * contagem a partir de hoje ou de amanhã.
 */
export function CicloDasMaterias({ materias }: { materias: Materia[] }) {
  const concurso = useConcursoAtual();
  const hoje = hojeISO();
  const amanha = somarDias(hoje, 1);
  // Sem a migração 0037 a coluna nem vem: aí conta o plano inteiro.
  const desde = concurso.ciclo_plano_inicio ?? null;
  const { data: linhas } = usePlanoDesde(desde);
  const mudarInicio = useInicioCicloPlano();
  const contagem = useMemo(() => contarCiclo(linhas ?? [], desde), [linhas, desde]);

  if (materias.length === 0) return null;

  const total = materias.length;
  const { completas, atual, naVolta } = voltaDoCiclo(
    materias.map((m) => contagem.get(m.id)?.blocos ?? 0)
  );

  function erro(err: unknown) {
    const e = err as { message?: string } | null;
    if (e?.message?.includes("ciclo_plano_inicio")) {
      toast.error(
        "Falta rodar a migração 0037 (ciclo das matérias) no Supabase → SQL Editor.",
        { duration: 8000 }
      );
      return;
    }
    toast.error(err instanceof Error ? err.message : String(err));
  }

  /** Zera o ciclo a partir do dia escolhido; o aviso traz "Desfazer". */
  function recomecar(inicio: string) {
    const anterior = desde;
    mudarInicio.mutate(
      { id: concurso.id, ciclo_plano_inicio: inicio },
      {
        onError: erro,
        onSuccess: () =>
          toast(`Novo ciclo a partir de ${rotuloDoDia(inicio, hoje).data}`, {
            action: {
              label: "Desfazer",
              onClick: () =>
                mudarInicio.mutate(
                  { id: concurso.id, ciclo_plano_inicio: anterior },
                  { onError: erro }
                ),
            },
          }),
      }
    );
  }

  return (
    <section className="border-t border-line/40 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-txt">Ciclo das matérias</h2>
          <p className="mt-0.5 text-xs text-mut">
            {naVolta === 0 && completas > 0 ? (
              <>
                <strong className="text-green">✓ Volta {completas} completa</strong> — todas as{" "}
                {total} matérias entraram
              </>
            ) : (
              <>
                <strong className="text-dim">Volta {atual}</strong> · {naVolta} de {total} matérias
                no plano
                {completas > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-green">
                      ✓ {completas === 1 ? "1 volta completa" : `${completas} voltas completas`}
                    </span>
                  </>
                )}
              </>
            )}
            {desde && (
              <>
                {" "}
                · {desde > hoje ? "a partir de" : "desde"} {rotuloDoDia(desde, hoje).data}
              </>
            )}
          </p>
        </div>
        <MenuMais
          aria="Começar um novo ciclo"
          rotulo={
            <>
              <RotateCcw className="size-3.5" /> Novo ciclo
            </>
          }
          itens={[
            {
              icone: <RotateCcw className="size-3.5" />,
              label: `Começar hoje (${rotuloDoDia(hoje, hoje).data})`,
              onClick: () => recomecar(hoje),
            },
            {
              icone: <CalendarPlus className="size-3.5" />,
              label: `Começar amanhã (${rotuloDoDia(amanha, hoje).data})`,
              onClick: () => recomecar(amanha),
            },
          ]}
        />
      </div>

      {/* Uma linha por matéria, na ordem do edital; as colunas se equilibram sozinhas */}
      <ol
        className="mt-3 columns-[26rem] gap-x-3"
        aria-label="Matérias do ciclo, na ordem do edital"
      >
        {materias.map((m, i) => (
          <LinhaDoCiclo key={m.id} ordem={i + 1} materia={m} contagem={contagem.get(m.id)} />
        ))}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mut">
        <span>
          {RANKS.length - 1} ranks — cada bloco no plano sobe um (I → II → III em cada cor):
        </span>
        {TIERS.map((t) => (
          <span key={t.nome} className="inline-flex items-center gap-1">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: t.degrade ?? t.cor }}
              aria-hidden
            />
            {t.nome}
          </span>
        ))}
      </div>
    </section>
  );
}

function LinhaDoCiclo({
  ordem,
  materia,
  contagem,
}: {
  ordem: number;
  materia: Materia;
  contagem: ContagemCiclo | undefined;
}) {
  const vezes = contagem?.blocos ?? 0;
  const rank = rankDoCiclo(vezes);
  const proximo = RANKS[rank.nivel + 1];
  const detalhe = contagem
    ? `${rank.nome} · ${vezes === 1 ? "1 bloco" : `${vezes} blocos`} no ciclo (${fmtTempo(contagem.minutos)})` +
      (contagem.feitos ? ` · ${contagem.feitos} ${contagem.feitos === 1 ? "feito" : "feitos"}` : "")
    : "ainda não entrou no plano neste ciclo";
  return (
    <li
      title={`${materia.nome} — ${detalhe}${proximo ? ` · próximo: ${proximo.nome}` : ""}`}
      className={`mb-1.5 flex break-inside-avoid items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
        rank.tier ? "" : "border-dashed border-line/70 bg-navy-900/40"
      }`}
      style={estiloDaLinha(rank)}
    >
      <span className="w-5 shrink-0 self-start text-[11px] font-semibold leading-5 tabular-nums text-mut">
        {String(ordem).padStart(2, "0")}
      </span>
      {/* Estreito (celular): a insígnia desce para baixo do nome */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={`flex min-w-0 flex-[1_1_12rem] items-center gap-1.5 text-xs font-semibold leading-5 ${
            rank.tier ? "text-txt" : "text-dim"
          }`}
        >
          <span
            className={`shrink-0 text-sm leading-none ${rank.tier ? "" : "opacity-50 grayscale"}`}
            aria-hidden
          >
            {materia.icone}
          </span>
          <span className="truncate">{materia.nome}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Insignia rank={rank} />
          <span className="w-7 text-right text-[11px] font-semibold tabular-nums text-dim">
            {vezes > 0 ? `${vezes}×` : ""}
          </span>
        </span>
      </div>
    </li>
  );
}

/** A insígnia do rank, com largura fixa para ficarem todas alinhadas em coluna. */
function Insignia({ rank }: { rank: Rank }) {
  // A borda (transparente nos ranks) deixa todas as linhas com a mesma altura.
  const base =
    "inline-flex w-[7.75rem] shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 tracking-wide";
  if (!rank.tier)
    return (
      <span className={`${base} border-dashed border-line text-mut`}>
        <CircleDashed className="size-3 shrink-0" aria-hidden />
        Sem rank
      </span>
    );
  const Icone = ICONES[rank.tier.icone];
  return (
    <span
      className={`${base} border-transparent text-navy-950`}
      style={{ background: rank.tier.degrade ?? rank.tier.cor }}
    >
      <Icone className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
      <span className="truncate">{rank.nome}</span>
    </span>
  );
}
