import { useState, type FormEvent } from "react";
import { Zap, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCriarQuestaoLog, useRegistrarClique, useQuestaoLogsJanela } from "@/api/questaoLogs";
import { useMaterias } from "@/api/materias";
import { hojeISO } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";

export function QuickLogForm() {
  const { data: materias } = useMaterias();
  const criar = useCriarQuestaoLog();
  const clique = useRegistrarClique();

  const [materiaId, setMateriaId] = useState("");
  const [total, setTotal] = useState("");
  const [acertos, setAcertos] = useState("");
  const [data, setData] = useState(hojeISO());

  // Total de questões somadas por clique nesta data + matéria (para o contador).
  const { data: logsDia } = useQuestaoLogsJanela(data, data);
  const alvo = materiaId || null;
  const cliqueDia = (logsDia ?? [])
    .filter((l) => l.origem === "clique" && l.materia_id === alvo)
    .reduce((acc, l) => ({ total: acc.total + l.total, acertos: acc.acertos + l.acertos }), {
      total: 0,
      acertos: 0,
    });
  const pctClique =
    cliqueDia.total > 0 ? Math.round((cliqueDia.acertos / cliqueDia.total) * 100) : 0;

  function registrarClique(acerto: boolean) {
    clique.mutate(
      { data, materiaId: alvo, acerto },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const t = Number(total);
    const a = Number(acertos);
    if (!Number.isInteger(t) || t <= 0) return toast.error("Total de questões inválido.");
    if (!Number.isInteger(a) || a < 0 || a > t)
      return toast.error("Acertos deve ficar entre 0 e o total.");
    try {
      await criar.mutateAsync({
        data,
        total: t,
        acertos: a,
        materia_id: alvo,
        origem: "manual",
      });
      toast.success(`Registrado: ${a}/${t} (${Math.round((a / t) * 100)}%) 🎯`);
      setTotal("");
      setAcertos("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Zap className="size-4 text-gold" /> Registro rápido
          </span>
        }
        subtitle="Some questão por questão nos botões ou anote uma bateria inteira."
      />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Compartilhado pelos dois modos */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_160px]">
            <Field label="Matéria">
              <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
                <option value="">— geral —</option>
                {(materias ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icone} {m.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
          </div>

          {/* Modo 1 — clique a clique */}
          <div className="rounded-xl border border-line/60 bg-navy-800/40 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-mut">
                Clique a clique
              </span>
              <span className="tabular-nums text-xs text-dim">
                {cliqueDia.total > 0
                  ? `${cliqueDia.acertos}/${cliqueDia.total} nesta data · ${pctClique}%`
                  : "sem cliques nesta data"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => registrarClique(true)}
                disabled={clique.isPending}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-green/30 bg-green/15 text-base font-semibold text-green transition-all hover:bg-green/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="size-5" /> +Acerto
              </button>
              <button
                type="button"
                onClick={() => registrarClique(false)}
                disabled={clique.isPending}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-red/30 bg-red/15 text-base font-semibold text-red transition-all hover:bg-red/25 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="size-5" /> +Erro
              </button>
            </div>
          </div>

          {/* Modo 2 — bateria inteira */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[90px_90px_1fr] sm:items-end">
            <Field label="Questões">
              <Input
                type="number"
                min="1"
                placeholder="30"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
              />
            </Field>
            <Field label="Acertos">
              <Input
                type="number"
                min="0"
                placeholder="24"
                value={acertos}
                onChange={(e) => setAcertos(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="secondary" loading={criar.isPending}>
              Registrar bateria
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
