import { useMemo, useState } from "react";
import { CalendarPlus, Check, Trash2, Undo2 } from "lucide-react";
import type { Evento } from "@/types/db";
import { useAtualizarEvento, useEventos, useExcluirEvento } from "@/api/eventos";
import { diasAte, fmtDataCurta, hojeISO } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { EventoFormModal } from "./EventoFormModal";

const TIPO_EVENTO: Record<string, { icone: string; cor: string }> = {
  prova: { icone: "🎯", cor: "text-gold" },
  inscricao: { icone: "📝", cor: "text-blue" },
  revisao: { icone: "🔁", cor: "text-green" },
  outro: { icone: "📌", cor: "text-dim" },
};

function rotuloDias(dias: number): string {
  if (dias === 0) return "HOJE";
  if (dias === 1) return "amanhã";
  if (dias < 0) return `${-dias}d atrás`;
  return `em ${dias}d`;
}

export function CompromissosCard({ concursoId }: { concursoId: string }) {
  const { data: eventos } = useEventos();
  const atualizar = useAtualizarEvento();
  const excluir = useExcluirEvento();
  const [modal, setModal] = useState(false);
  const hoje = hojeISO();

  const relevantes = useMemo(() => {
    const doConcurso = (eventos ?? []).filter(
      (e) => e.concurso_id === concursoId || e.concurso_id === null
    );
    const futuros = doConcurso.filter((e) => !e.concluido && e.data >= hoje);
    const atrasados = doConcurso.filter((e) => !e.concluido && e.data < hoje);
    const feitos = doConcurso.filter((e) => e.concluido).slice(-3);
    return { futuros, atrasados, feitos };
  }, [eventos, concursoId, hoje]);

  const linha = (e: Evento, atrasado = false) => {
    const t = TIPO_EVENTO[e.tipo] ?? TIPO_EVENTO.outro;
    const dias = diasAte(e.data);
    return (
      <li
        key={e.id}
        className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
          e.concluido
            ? "border-line/30 opacity-50"
            : atrasado
              ? "border-red/30 bg-red/5"
              : "border-line/50 bg-navy-900/40"
        }`}
      >
        <span className="text-lg">{t.icone}</span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${e.concluido ? "text-mut line-through" : "text-txt"}`}>
            {e.titulo}
          </p>
          <p className="text-[11px] capitalize text-mut">{fmtDataCurta(e.data)}</p>
        </div>
        {!e.concluido && (
          <span
            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold tabular-nums ${
              dias <= 3 ? "bg-red/15 text-red" : dias <= 10 ? "bg-amber/15 text-amber" : "bg-navy-700 " + t.cor
            }`}
          >
            {rotuloDias(dias)}
          </span>
        )}
        <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
          <button
            onClick={() => atualizar.mutate({ id: e.id, concluido: !e.concluido })}
            className="cursor-pointer rounded-md p-1 text-mut hover:bg-navy-600 hover:text-green"
            aria-label={e.concluido ? "Reabrir" : "Marcar como feito"}
          >
            {e.concluido ? <Undo2 className="size-3.5" /> : <Check className="size-3.5" />}
          </button>
          <button
            onClick={() => excluir.mutate(e.id)}
            className="cursor-pointer rounded-md p-1 text-mut hover:bg-red/10 hover:text-red"
            aria-label="Excluir compromisso"
          >
            <Trash2 className="size-3.5" />
          </button>
        </span>
      </li>
    );
  };

  return (
    <Card>
      <CardHeader
        title="Próximos compromissos"
        subtitle="Provas, inscrições e revisões"
        action={
          <Button size="sm" variant="secondary" onClick={() => setModal(true)}>
            <CalendarPlus className="size-4" /> Agendar
          </Button>
        }
      />
      <CardBody>
        {relevantes.futuros.length === 0 && relevantes.atrasados.length === 0 ? (
          <p className="py-3 text-center text-xs text-mut">
            Nada agendado. Marque revisões e prazos para não perder datas.
          </p>
        ) : (
          <ul className="space-y-2">
            {relevantes.atrasados.map((e) => linha(e, true))}
            {relevantes.futuros.map((e) => linha(e))}
            {relevantes.feitos.map((e) => linha(e))}
          </ul>
        )}
      </CardBody>
      <EventoFormModal open={modal} onClose={() => setModal(false)} concursoId={concursoId} />
    </Card>
  );
}
