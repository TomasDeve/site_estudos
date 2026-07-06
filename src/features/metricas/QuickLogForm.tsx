import { useState, type FormEvent } from "react";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { useCriarQuestaoLog } from "@/api/questaoLogs";
import { useMaterias } from "@/api/materias";
import { hojeISO } from "@/lib/dates";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";

export function QuickLogForm() {
  const { data: materias } = useMaterias();
  const criar = useCriarQuestaoLog();

  const [materiaId, setMateriaId] = useState("");
  const [total, setTotal] = useState("");
  const [acertos, setAcertos] = useState("");
  const [data, setData] = useState(hojeISO());

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
        materia_id: materiaId || null,
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
        subtitle="Fez uma bateria de questões? Anote em 5 segundos."
      />
      <CardBody>
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_90px_90px_auto_auto] sm:items-end">
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
          <Field label="Questões">
            <Input
              type="number"
              required
              min="1"
              placeholder="30"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
            />
          </Field>
          <Field label="Acertos">
            <Input
              type="number"
              required
              min="0"
              placeholder="24"
              value={acertos}
              onChange={(e) => setAcertos(e.target.value)}
            />
          </Field>
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          <Button type="submit" loading={criar.isPending} className="col-span-2 sm:col-span-1">
            Registrar
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
