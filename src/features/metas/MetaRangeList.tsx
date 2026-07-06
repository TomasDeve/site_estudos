import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { MetaPeriodo } from "@/types/db";
import { useMetas } from "@/api/metas";
import { hojeISO, fmtData } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { MetaFormModal } from "./MetaFormModal";

export function MetaRangeList() {
  const { data: metas } = useMetas();
  const hoje = hojeISO();
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<MetaPeriodo | null>(null);

  return (
    <Card>
      <CardHeader
        title="Faixas de meta"
        subtitle="Horas/dia por período"
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { setEditando(null); setModal(true); }}
          >
            <Plus className="size-4" /> Meta
          </Button>
        }
      />
      <CardBody>
        {(metas ?? []).length === 0 ? (
          <p className="py-2 text-center text-xs leading-relaxed text-mut">
            Defina quantas horas quer estudar por dia em cada período — ex.: 2h até a inscrição,
            3h na reta final.
          </p>
        ) : (
          <ul className="space-y-2">
            {(metas ?? []).map((m) => {
              const vigente = m.data_inicio <= hoje && hoje <= m.data_fim;
              const passada = m.data_fim < hoje;
              return (
                <li
                  key={m.id}
                  className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    vigente
                      ? "border-gold/40 bg-gold/8"
                      : passada
                        ? "border-line/40 opacity-55"
                        : "border-line/60"
                  }`}
                >
                  <span
                    className={`text-lg font-black tabular-nums ${vigente ? "text-gold" : "text-txt"}`}
                  >
                    {String(m.horas_dia).replace(".", ",").replace(",0", "")}h
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-dim">
                      {fmtData(m.data_inicio)} → {fmtData(m.data_fim)}
                    </p>
                    <p className="text-[11px] text-mut">
                      {vigente ? "✨ vigente agora" : passada ? "encerrada" : "futura"}
                      {m.descricao && ` · ${m.descricao}`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditando(m); setModal(true); }}
                    className="cursor-pointer rounded-md p-1.5 text-mut opacity-0 transition-opacity hover:bg-navy-600 hover:text-txt group-hover:opacity-100 max-md:opacity-100"
                    aria-label="Editar meta"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>

      <MetaFormModal open={modal} onClose={() => setModal(false)} meta={editando} />
    </Card>
  );
}
