import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { BlocoDia } from "@/types/db";
import { useAtualizarBloco, useCriarBloco } from "@/api/blocos";
import { useMaterias } from "@/api/materias";
import { useConcursos } from "@/api/concursos";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";

const DURACOES = [15, 25, 30, 45, 60, 90, 120];

interface Props {
  open: boolean;
  onClose: () => void;
  dataISO: string;
  bloco: BlocoDia | null;
  concursoIdPadrao?: string;
  proximaOrdem: number;
}

export function BlocoFormModal({
  open,
  onClose,
  dataISO,
  bloco,
  concursoIdPadrao,
  proximaOrdem,
}: Props) {
  const { data: materias } = useMaterias();
  const { data: concursos } = useConcursos();
  const criar = useCriarBloco();
  const atualizar = useAtualizarBloco();

  const [titulo, setTitulo] = useState("");
  const [duracao, setDuracao] = useState("30");
  const [materiaId, setMateriaId] = useState("");
  const [concursoId, setConcursoId] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitulo(bloco?.titulo ?? "");
    setDuracao(String(bloco?.duracao_min ?? 30));
    setMateriaId(bloco?.materia_id ?? "");
    setConcursoId(bloco?.concurso_id ?? concursoIdPadrao ?? "");
  }, [open, bloco, concursoIdPadrao]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const min = Number(duracao);
    if (!Number.isInteger(min) || min <= 0) {
      toast.error("Duração inválida.");
      return;
    }
    try {
      const campos = {
        titulo: titulo.trim(),
        duracao_min: min,
        materia_id: materiaId || null,
        concurso_id: concursoId || null,
      };
      if (bloco) {
        await atualizar.mutateAsync({ id: bloco.id, ...campos });
      } else {
        await criar.mutateAsync({ ...campos, data: dataISO, ordem: proximaOrdem });
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={bloco ? "Editar bloco" : "Novo bloco de estudo"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-bloco" loading={criar.isPending || atualizar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="form-bloco" onSubmit={onSubmit} className="space-y-4">
        <Field label="O que vai estudar?">
          <Input
            required
            autoFocus
            placeholder="Ex.: Direito Penal — questões sobre crimes contra a pessoa"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>
        <Field label="Duração">
          <div className="flex flex-wrap items-center gap-1.5">
            {DURACOES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuracao(String(d))}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  duracao === String(d)
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-line bg-navy-900 text-dim hover:border-gold/40"
                }`}
              >
                {d}min
              </button>
            ))}
            <Input
              type="number"
              min="5"
              max="600"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              className="!h-8 w-20 !text-xs"
            />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Matéria (opcional)">
            <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
              <option value="">—</option>
              {(materias ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.icone} {m.nome}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Concurso (opcional)">
            <Select value={concursoId} onChange={(e) => setConcursoId(e.target.value)}>
              <option value="">—</option>
              {(concursos ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.nome_curto ?? c.nome}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
