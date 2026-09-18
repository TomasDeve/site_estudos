import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { Audio } from "@/types/db";
import { useAtualizarAudio, useCriarAudio, useExcluirAudio } from "@/api/audios";
import { parseYoutube } from "./youtube";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Field";

interface Props {
  open: boolean;
  onClose: () => void;
  audio: Audio | null;
  /** Posição do novo áudio no fim da fila (só usada ao criar). */
  proximaOrdem: number;
}

export function AudioFormModal({ open, onClose, audio, proximaOrdem }: Props) {
  const criar = useCriarAudio();
  const atualizar = useAtualizarAudio();
  const excluir = useExcluirAudio();

  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitulo(audio?.titulo ?? "");
    setUrl(audio?.url ?? "");
  }, [open, audio]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const link = url.trim();
    if (!parseYoutube(link)) {
      toast.error("Link do YouTube não reconhecido. Cole o endereço do vídeo ou da playlist.");
      return;
    }
    try {
      if (audio) {
        await atualizar.mutateAsync({ id: audio.id, titulo: titulo.trim(), url: link });
      } else {
        await criar.mutateAsync({ titulo: titulo.trim(), url: link, ordem: proximaOrdem });
      }
      toast.success("Áudio salvo.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={audio ? "Editar áudio" : "Novo áudio"}
      width="max-w-md"
      footer={
        <>
          {audio && (
            <Button
              variant="danger"
              className="mr-auto"
              loading={excluir.isPending}
              onClick={async () => {
                await excluir.mutateAsync(audio.id);
                onClose();
              }}
            >
              Excluir
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-audio" loading={criar.isPending || atualizar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="form-audio" onSubmit={onSubmit} className="space-y-4">
        <Field label="Link do YouTube" hint="Vídeo ou playlist — ex.: https://youtu.be/…">
          <Input
            required
            autoFocus
            placeholder="https://www.youtube.com/watch?v=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </Field>
        <Field label="Título (opcional)" hint="Se deixar em branco, uso o próprio link.">
          <Input
            placeholder="Ex.: Lei 8.112 narrada — arts. 1º a 30"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
