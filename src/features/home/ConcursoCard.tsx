import { Link } from "react-router";
import { Pencil } from "lucide-react";
import type { Concurso } from "@/types/db";
import { ProgressBar } from "@/components/ProgressBar";
import { diasAte, fmtData } from "@/lib/dates";

const statusChip: Record<string, { label: string; cls: string }> = {
  ativo: { label: "Estudando", cls: "bg-green/15 text-green" },
  futuro: { label: "Futuro", cls: "bg-blue/15 text-blue" },
  arquivado: { label: "Arquivado", cls: "bg-navy-600 text-mut" },
};

interface Props {
  concurso: Concurso;
  pct: number;
  onEdit: (c: Concurso) => void;
}

export function ConcursoCard({ concurso: c, pct, onEdit }: Props) {
  const chip = statusChip[c.status] ?? statusChip.ativo;
  const dias = c.data_prova ? diasAte(c.data_prova) : null;

  return (
    <Link
      to={`/concurso/${c.id}`}
      className="group relative block overflow-hidden rounded-card border border-line/60 bg-navy-800/80 transition-all hover:-translate-y-0.5 hover:border-line hover:shadow-[0_8px_24px_rgb(0_0_0/0.35)]"
      style={{ borderTopWidth: 3, borderTopColor: c.cor }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl text-2xl"
              style={{ background: `${c.cor}1a` }}
            >
              {c.icone}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold leading-tight text-txt">{c.nome_curto ?? c.nome}</h3>
              <p className="mt-0.5 truncate text-xs text-mut">
                {[c.orgao, c.banca].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(c);
            }}
            className="cursor-pointer rounded-lg p-1.5 text-mut opacity-0 transition-all hover:bg-navy-700 hover:text-txt group-hover:opacity-100 max-md:opacity-100"
            aria-label={`Editar ${c.nome}`}
          >
            <Pencil className="size-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${chip.cls}`}>{chip.label}</span>
          {dias !== null && dias >= 0 && (
            <span className="text-dim">
              <strong className="font-bold text-txt">{dias}</strong>{" "}
              {dias === 1 ? "dia" : "dias"} para a prova · {fmtData(c.data_prova)}
            </span>
          )}
          {dias !== null && dias < 0 && (
            <span className="text-mut">Prova em {fmtData(c.data_prova)} (passou)</span>
          )}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-dim">Edital estudado</span>
            <span className="font-bold tabular-nums" style={{ color: c.cor }}>
              {pct}%
            </span>
          </div>
          <ProgressBar value={pct} color={c.cor} />
        </div>
      </div>
    </Link>
  );
}
