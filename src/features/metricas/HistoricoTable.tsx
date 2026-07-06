import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { PAGINA_HISTORICO, useExcluirQuestaoLog, useQuestaoLogsHistorico } from "@/api/questaoLogs";
import { useMaterias } from "@/api/materias";
import { fmtData } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";

export function HistoricoTable() {
  const [pagina, setPagina] = useState(0);
  const { data, isLoading } = useQuestaoLogsHistorico(pagina);
  const { data: materias } = useMaterias();
  const excluir = useExcluirQuestaoLog();

  const totalPaginas = Math.max(1, Math.ceil((data?.total ?? 0) / PAGINA_HISTORICO));

  function nomeMateria(id: string | null, textoCru: string | null) {
    if (id) {
      const m = (materias ?? []).find((x) => x.id === id);
      if (m) return `${m.icone} ${m.nome}`;
    }
    return textoCru ?? "Geral";
  }

  return (
    <Card>
      <CardHeader
        title="Histórico"
        subtitle={`${data?.total ?? 0} registros`}
        action={
          totalPaginas > 1 ? (
            <div className="flex items-center gap-2 text-xs text-dim">
              <button
                disabled={pagina === 0}
                onClick={() => setPagina((p) => p - 1)}
                className="cursor-pointer rounded-md p-1 hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="tabular-nums">
                {pagina + 1}/{totalPaginas}
              </span>
              <button
                disabled={pagina >= totalPaginas - 1}
                onClick={() => setPagina((p) => p + 1)}
                className="cursor-pointer rounded-md p-1 hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Próxima página"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          ) : undefined
        }
      />
      <CardBody className="!px-2 sm:!px-3">
        {isLoading ? null : (data?.rows.length ?? 0) === 0 ? (
          <EmptyState icon="🗒️" title="Nenhum registro" message="Use o registro rápido ou importe do Qconcursos." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-mut">
                <th className="px-2 py-2 font-semibold">Data</th>
                <th className="px-2 py-2 font-semibold">Matéria</th>
                <th className="px-2 py-2 text-right font-semibold">Questões</th>
                <th className="px-2 py-2 text-right font-semibold">Acertos</th>
                <th className="px-2 py-2 text-right font-semibold">%</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((l) => {
                const pct = Math.round((l.acertos / l.total) * 100);
                return (
                  <tr key={l.id} className="group border-t border-line/30 hover:bg-navy-700/30">
                    <td className="whitespace-nowrap px-2 py-2 text-xs text-dim">
                      {fmtData(l.data)}
                      {l.origem === "import_qc" && (
                        <span className="ml-1.5 rounded bg-blue/15 px-1 py-0.5 text-[9px] font-bold uppercase text-blue">
                          QC
                        </span>
                      )}
                    </td>
                    <td className="max-w-40 truncate px-2 py-2 text-xs text-txt">
                      {nomeMateria(l.materia_id, l.materia_texto)}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-txt">{l.total}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-txt">{l.acertos}</td>
                    <td
                      className={`px-2 py-2 text-right font-bold tabular-nums ${
                        pct >= 80 ? "text-green" : pct >= 60 ? "text-amber" : "text-red"
                      }`}
                    >
                      {pct}%
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => excluir.mutate(l.id)}
                        className="cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:text-red group-hover:opacity-100"
                        aria-label="Excluir registro"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardBody>
    </Card>
  );
}
