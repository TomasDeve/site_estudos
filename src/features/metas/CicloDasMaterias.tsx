import { useMemo } from "react";
import { CalendarPlus, ChevronRight, Repeat, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Materia } from "@/types/db";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useInicioCicloPlano } from "@/api/concursos";
import { usePlanoDesde } from "@/api/planoHoras";
import { hojeISO } from "@/lib/dates";
import { MenuMais } from "@/components/MenuMais";
import { fmtTempo, rotuloDoDia, somarDias } from "./planoDias";
import {
  NIVEIS_CICLO,
  contarCiclo,
  nivelDoCiclo,
  voltaDoCiclo,
  type ContagemCiclo,
} from "./cicloPlano";

/**
 * Ciclo das matérias, logo abaixo da grade do plano: as matérias do edital, na
 * ordem, pintadas conforme quantas vezes já entraram no plano neste ciclo. Cinza
 * = ainda não entrou; cada bloco com a matéria sobe ela um nível (verde → azul →
 * roxo → dourado), como um ranking. "Novo ciclo" zera a contagem a partir de hoje
 * ou de amanhã.
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

      {/* As matérias em sequência; depois da última, volta para a primeira */}
      <ol
        className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2"
        aria-label="Matérias do ciclo, na ordem do edital"
      >
        {materias.map((m, i) => (
          <li key={m.id} className="flex min-w-0 max-w-full items-center gap-1">
            <ChipDoCiclo materia={m} contagem={contagem.get(m.id)} />
            {i < total - 1 ? (
              <ChevronRight className="size-3.5 shrink-0 text-mut/50" aria-hidden />
            ) : (
              <span className="shrink-0 text-mut/70" title="Depois da última, volta para a primeira">
                <Repeat className="size-3.5" aria-hidden />
              </span>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mut">
        <span>Cada bloco no plano sobe a matéria um nível:</span>
        {NIVEIS_CICLO.map((n) => (
          <span key={n.legenda} className="inline-flex items-center gap-1">
            <span className={`size-2.5 shrink-0 rounded-full ${n.ponto}`} aria-hidden />
            {n.legenda}
          </span>
        ))}
      </p>
    </section>
  );
}

function ChipDoCiclo({
  materia,
  contagem,
}: {
  materia: Materia;
  contagem: ContagemCiclo | undefined;
}) {
  const vezes = contagem?.blocos ?? 0;
  const nivel = nivelDoCiclo(vezes);
  const detalhe = contagem
    ? `${vezes === 1 ? "1 bloco" : `${vezes} blocos`} no ciclo (${fmtTempo(contagem.minutos)})` +
      (contagem.feitos ? ` · ${contagem.feitos} ${contagem.feitos === 1 ? "feito" : "feitos"}` : "")
    : "ainda não entrou no plano neste ciclo";
  return (
    <span
      title={`${materia.nome} — ${detalhe}`}
      className={`inline-flex min-w-0 max-w-64 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${nivel.chip}`}
    >
      <span
        className={`shrink-0 text-sm leading-none ${vezes === 0 ? "opacity-50 grayscale" : ""}`}
        aria-hidden
      >
        {materia.icone}
      </span>
      <span className="truncate">{materia.nome}</span>
      {vezes > 0 ? (
        <span
          className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums ${nivel.selo}`}
        >
          {vezes}×
        </span>
      ) : (
        <span className="sr-only">(ainda não entrou)</span>
      )}
    </span>
  );
}
