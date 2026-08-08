import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Trash2, X } from "lucide-react";
import type {
  AlternativaQC,
  QuestaoImportada,
  QuestaoImportadaStatus,
} from "@/types/db";

const NIVEL_LABEL: Record<string, string> = {
  fundamental: "Fundamental",
  medio: "Médio",
  superior: "Superior",
};
const DIF_LABEL: Record<string, string> = {
  facil: "Fácil",
  medio_facil: "Médio-fácil",
  medio_dificil: "Médio-difícil",
  dificil: "Difícil",
};
const STATUS_ESTILO: Record<QuestaoImportadaStatus, string> = {
  nova: "bg-navy-700 text-dim",
  aprovada: "bg-green/15 text-green",
  descartada: "bg-red/15 text-red",
  usada: "bg-gold/15 text-gold",
};
const STATUS_LABEL: Record<QuestaoImportadaStatus, string> = {
  nova: "Nova",
  aprovada: "Aprovada",
  descartada: "Descartada",
  usada: "Usada",
};

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-line/60 bg-navy-800 px-1.5 py-0.5 text-[10px] font-medium text-mut">
      {children}
    </span>
  );
}

interface Props {
  q: QuestaoImportada;
  /** <optgroup>s de tópicos, iguais para todos os cards. */
  topicoOptions: ReactNode;
  onMapTopico: (topicoId: string | null) => void;
  onStatus: (status: QuestaoImportadaStatus) => void;
  onExcluir: () => void;
}

export function QuestaoImportadaCard({ q, topicoOptions, onMapTopico, onStatus, onExcluir }: Props) {
  const [aberto, setAberto] = useState(false);
  const status = q.status as QuestaoImportadaStatus;
  const alternativas = (q.alternativas as unknown as AlternativaQC[]) ?? [];

  const gabaritoCE =
    q.gabarito_bool === null ? null : q.gabarito_bool ? "Certo" : "Errado";

  return (
    <div className="rounded-xl border border-line/50 bg-navy-900/60 p-3.5">
      {/* meta + status */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_ESTILO[status]}`}
        >
          {STATUS_LABEL[status]}
        </span>
        <Badge>{q.tipo === "ce" ? "Certo/Errado" : "Múltipla"}</Badge>
        {q.banca && <Badge>{q.banca}</Badge>}
        {q.ano && <Badge>{q.ano}</Badge>}
        {q.nivel && <Badge>{NIVEL_LABEL[q.nivel] ?? q.nivel}</Badge>}
        {q.dificuldade && <Badge>{DIF_LABEL[q.dificuldade] ?? q.dificuldade}</Badge>}
        {q.disciplina && <Badge>{q.disciplina}</Badge>}
      </div>

      {/* enunciado */}
      {q.contexto && <p className="mb-1 text-xs italic text-mut">{q.contexto}</p>}
      <p className={`whitespace-pre-wrap text-sm leading-relaxed text-txt ${aberto ? "" : "line-clamp-3"}`}>
        {q.enunciado}
      </p>

      {/* alternativas / gabarito (aparecem ao expandir) */}
      {aberto && (
        <div className="mt-2 space-y-1">
          {alternativas.map((a) => {
            const correta = a.letra === q.gabarito_letra;
            return (
              <p
                key={a.letra}
                className={`text-xs leading-relaxed ${correta ? "font-semibold text-green" : "text-dim"}`}
              >
                <span className="mr-1 font-semibold">{a.letra})</span>
                {a.texto}
                {correta && <Check className="ml-1 inline size-3" />}
              </p>
            );
          })}
          {q.tipo === "ce" && (
            <p className="text-xs text-dim">
              Gabarito:{" "}
              <span className={gabaritoCE ? "font-semibold text-green" : "text-red"}>
                {gabaritoCE ?? "não informado"}
              </span>
            </p>
          )}
          {q.tipo === "multipla" && !q.gabarito_letra && (
            <p className="text-xs text-red">Gabarito não informado</p>
          )}
          {q.comentario && (
            <p className="mt-1.5 border-l-2 border-line/60 pl-2 text-xs leading-relaxed text-mut">
              {q.comentario}
            </p>
          )}
        </div>
      )}

      <button
        onClick={() => setAberto((v) => !v)}
        className="mt-1.5 flex cursor-pointer items-center gap-0.5 text-[11px] font-medium text-gold/80 hover:text-gold"
      >
        <ChevronDown className={`size-3 transition-transform ${aberto ? "rotate-180" : ""}`} />
        {aberto ? "Recolher" : "Ver alternativas e comentário"}
      </button>

      {/* tópico + ações */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/30 pt-3">
        <select
          value={q.topico_id ?? ""}
          onChange={(e) => onMapTopico(e.target.value || null)}
          className="h-8 min-w-0 flex-1 appearance-none rounded-lg border border-line bg-navy-900 px-2.5 text-xs text-txt outline-none focus:border-gold/60"
          title="Mapear para um assunto do seu edital"
        >
          <option value="">— sem tópico —</option>
          {topicoOptions}
        </select>

        {status !== "aprovada" && (
          <button
            onClick={() => onStatus("aprovada")}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-green/30 bg-green/10 px-2.5 text-xs font-medium text-green transition-colors hover:bg-green/20"
            title="Aprovar"
          >
            <Check className="size-3.5" /> Aprovar
          </button>
        )}
        {status !== "descartada" && (
          <button
            onClick={() => onStatus("descartada")}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-line/60 px-2.5 text-xs font-medium text-mut transition-colors hover:border-red/40 hover:text-red"
            title="Descartar"
          >
            <X className="size-3.5" /> Descartar
          </button>
        )}
        <button
          onClick={onExcluir}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line/60 text-mut transition-colors hover:border-red/40 hover:text-red"
          title="Excluir de vez"
          aria-label="Excluir"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
