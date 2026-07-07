import { useMemo, useState, type FormEvent } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { QuestaoLog } from "@/types/db";
import { useCriarQuestaoLog, useExcluirQuestaoLog, useRegistrarClique } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { corDesempenho } from "./desempenho";

interface Props {
  materiaId: string;
  /** Assunto específico, ou null para registrar direto na matéria (geral). */
  topicoId: string | null;
  logs: QuestaoLog[];
}

/**
 * Registro de questões resolvidas — usado tanto por assunto (topicoId) quanto
 * pela matéria inteira (topicoId null). Oferece os dois jeitos:
 *  - clique a clique nos botões +Acerto / +Erro (soma no registro do dia);
 *  - uma bateria inteira informando total e acertos.
 */
export function RegistroQuestoes({ materiaId, topicoId, logs }: Props) {
  const criarLog = useCriarQuestaoLog();
  const excluirLog = useExcluirQuestaoLog();
  const clique = useRegistrarClique();

  const [total, setTotal] = useState("");
  const [acertos, setAcertos] = useState("");
  const [dataLog, setDataLog] = useState(hojeISO());

  const escopo = topicoId ? "deste assunto" : "desta matéria";

  const resumo = useMemo(() => {
    const t = logs.reduce((s, l) => s + l.total, 0);
    const a = logs.reduce((s, l) => s + l.acertos, 0);
    return { total: t, acertos: a, pct: t > 0 ? Math.round((a / t) * 100) : null };
  }, [logs]);
  const cor = resumo.pct !== null ? corDesempenho(resumo.pct) : null;

  function registrarClique(acerto: boolean) {
    clique.mutate(
      { data: dataLog, materiaId, topicoId, acerto },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
  }

  async function onAddLog(e: FormEvent) {
    e.preventDefault();
    const t = Number(total);
    const a = Number(acertos);
    if (!Number.isInteger(t) || t <= 0) return toast.error("Total de questões inválido.");
    if (!Number.isInteger(a) || a < 0 || a > t)
      return toast.error("Acertos deve ficar entre 0 e o total.");
    try {
      await criarLog.mutateAsync({
        data: dataLog,
        total: t,
        acertos: a,
        materia_id: materiaId,
        topico_id: topicoId,
        origem: "manual",
      });
      toast.success(`${a}/${t} (${Math.round((a / t) * 100)}%) registrado 🎯`);
      setTotal("");
      setAcertos("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-3">
      {resumo.pct !== null && cor ? (
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-bold tabular-nums ${cor.texto}`}>{resumo.pct}%</span>
          <span className="text-xs text-mut">
            {resumo.acertos}/{resumo.total} questões · {logs.length}{" "}
            {logs.length === 1 ? "registro" : "registros"}
          </span>
        </div>
      ) : (
        <p className="text-xs text-mut">
          Fez questões {escopo}? Some no botão a cada questão ou anote uma bateria inteira.
        </p>
      )}

      {/* Clique a clique — some 1 questão por toque, usando a data escolhida */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => registrarClique(true)}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-green/30 bg-green/15 text-sm font-semibold text-green transition-all hover:bg-green/25 active:scale-[0.97]"
        >
          <Check className="size-4" /> +Acerto
        </button>
        <button
          type="button"
          onClick={() => registrarClique(false)}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red/30 bg-red/15 text-sm font-semibold text-red transition-all hover:bg-red/25 active:scale-[0.97]"
        >
          <X className="size-4" /> +Erro
        </button>
      </div>

      {/* Bateria inteira */}
      <form onSubmit={onAddLog} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-dim">Questões</span>
          <Input
            type="number"
            min="1"
            placeholder="30"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="!h-8 w-20 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-dim">Acertos</span>
          <Input
            type="number"
            min="0"
            placeholder="24"
            value={acertos}
            onChange={(e) => setAcertos(e.target.value)}
            className="!h-8 w-20 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-dim">Data</span>
          <Input
            type="date"
            value={dataLog}
            onChange={(e) => setDataLog(e.target.value)}
            className="!h-8 w-36 !text-xs"
          />
        </label>
        <Button size="sm" type="submit" variant="secondary" loading={criarLog.isPending}>
          <Plus className="size-3.5" /> Registrar bateria
        </Button>
      </form>

      {logs.length > 0 && (
        <ul className="space-y-1 border-t border-line/30 pt-2">
          {logs.slice(0, 5).map((l) => {
            const pct = Math.round((l.acertos / l.total) * 100);
            return (
              <li key={l.id} className="flex items-center gap-2 text-xs text-dim">
                <span className="w-12 shrink-0 tabular-nums text-mut">
                  {format(parseISO(l.data), "dd/MM")}
                </span>
                <span className="tabular-nums">
                  {l.acertos}/{l.total}
                </span>
                <span className={`font-semibold tabular-nums ${corDesempenho(pct).texto}`}>
                  {pct}%
                </span>
                {l.origem === "clique" && (
                  <span className="rounded bg-navy-700 px-1 py-0.5 text-[9px] font-bold uppercase text-mut">
                    clique
                  </span>
                )}
                <button
                  onClick={() => excluirLog.mutate(l.id)}
                  className="ml-auto shrink-0 cursor-pointer p-0.5 text-mut transition-colors hover:text-red"
                  aria-label="Excluir registro"
                  title="Excluir registro"
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
