import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useCriarEvento } from "@/api/eventos";
import { hojeISO } from "@/lib/dates";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";

interface Props {
  open: boolean;
  onClose: () => void;
  concursoId: string;
}

export function EventoFormModal({ open, onClose, concursoId }: Props) {
  const criar = useCriarEvento();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("revisao");
  const [data, setData] = useState(hojeISO());

  useEffect(() => {
    if (!open) return;
    setTitulo("");
    setTipo("revisao");
    setData(hojeISO());
  }, [open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await criar.mutateAsync({
        concurso_id: concursoId,
        titulo: titulo.trim(),
        tipo,
        data,
      });
      toast.success("Compromisso agendado.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo compromisso"
      width="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-evento" loading={criar.isPending}>
            Agendar
          </Button>
        </>
      }
    >
      <form id="form-evento" onSubmit={onSubmit} className="space-y-4">
        <Field label="Título">
          <Input
            required
            autoFocus
            placeholder="Ex.: Revisão de Direito Penal Militar"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="revisao">Revisão</option>
              <option value="inscricao">Prazo de inscrição</option>
              <option value="prova">Prova</option>
              <option value="outro">Outro</option>
            </Select>
          </Field>
          <Field label="Data">
            <Input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
