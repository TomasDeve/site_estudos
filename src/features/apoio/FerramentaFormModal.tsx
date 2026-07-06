import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { Ferramenta } from "@/types/db";
import {
  useAtualizarFerramenta,
  useCriarFerramenta,
  useExcluirFerramenta,
} from "@/api/ferramentas";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Field";

interface Props {
  open: boolean;
  onClose: () => void;
  ferramenta: Ferramenta | null;
}

export function FerramentaFormModal({ open, onClose, ferramenta }: Props) {
  const criar = useCriarFerramenta();
  const atualizar = useAtualizarFerramenta();
  const excluir = useExcluirFerramenta();

  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [icone, setIcone] = useState("🔗");

  useEffect(() => {
    if (!open) return;
    setTitulo(ferramenta?.titulo ?? "");
    setUrl(ferramenta?.url ?? "");
    setIcone(ferramenta?.icone ?? "🔗");
  }, [open, ferramenta]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const u = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
    try {
      if (ferramenta) {
        await atualizar.mutateAsync({ id: ferramenta.id, titulo: titulo.trim(), url: u, icone });
      } else {
        await criar.mutateAsync({ titulo: titulo.trim(), url: u, icone });
      }
      toast.success("Ferramenta salva.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ferramenta ? "Editar ferramenta" : "Nova ferramenta"}
      width="max-w-sm"
      footer={
        <>
          {ferramenta && (
            <Button
              variant="danger"
              className="mr-auto"
              loading={excluir.isPending}
              onClick={async () => {
                await excluir.mutateAsync(ferramenta.id);
                onClose();
              }}
            >
              Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-ferramenta" loading={criar.isPending || atualizar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="form-ferramenta" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <Field label="Ícone">
            <Input
              value={icone}
              maxLength={4}
              className="text-center text-lg"
              onChange={(e) => setIcone(e.target.value)}
            />
          </Field>
          <Field label="Nome">
            <Input
              required
              placeholder="Google AI Studio"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Link">
          <Input
            required
            placeholder="https://aistudio.google.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
