import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { Audio, Materia } from "@/types/db";
import { useAtualizarAudio, useCriarAudio, useExcluirAudio } from "@/api/audios";
import { parseYoutube } from "./youtube";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";

interface Props {
  open: boolean;
  onClose: () => void;
  audio: Audio | null;
  /** Todos os áudios — para colocar o novo no fim do grupo da matéria escolhida. */
  audios: Audio[];
  materias: Materia[];
}

export function AudioFormModal({ open, onClose, audio, audios, materias }: Props) {
  const criar = useCriarAudio();
  const atualizar = useAtualizarAudio();
  const excluir = useExcluirAudio();

  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");
  const [materiaId, setMateriaId] = useState<string>("");
  const [vezes, setVezes] = useState("0");

  useEffect(() => {
    if (!open) return;
    setTitulo(audio?.titulo ?? "");
    setUrl(audio?.url ?? "");
    setMateriaId(audio?.materia_id ?? "");
    setVezes(String(audio?.vezes ?? 0));
  }, [open, audio]);

  /** Fim do grupo da matéria alvo (ignora o próprio áudio ao editar). */
  function ordemNoFim(alvo: string | null): number {
    const doGrupo = audios.filter((a) => (a.materia_id ?? null) === alvo && a.id !== audio?.id);
    return doGrupo.reduce((m, a) => Math.max(m, a.ordem + 1), 0);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const link = url.trim();
    if (!parseYoutube(link)) {
      toast.error("Link do YouTube não reconhecido. Cole o endereço do vídeo ou da playlist.");
      return;
    }
    const alvo = materiaId || null;
    try {
      if (audio) {
        const mudouMateria = (audio.materia_id ?? null) !== alvo;
        await atualizar.mutateAsync({
          id: audio.id,
          titulo: titulo.trim(),
          url: link,
          materia_id: alvo,
          vezes: Math.max(0, Math.floor(Number(vezes) || 0)),
          // Ao trocar de matéria, vai pro fim do novo grupo; senão mantém a ordem.
          ...(mudouMateria ? { ordem: ordemNoFim(alvo) } : {}),
        });
      } else {
        await criar.mutateAsync({
          titulo: titulo.trim(),
          url: link,
          materia_id: alvo,
          ordem: ordemNoFim(alvo),
        });
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
        <Field label="Matéria">
          <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            <option value="">Sem matéria</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icone} {m.nome}
              </option>
            ))}
          </Select>
        </Field>
        {audio && (
          <Field label="Vezes que ouvi" hint="Corrija a contagem se ficou errada.">
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={vezes}
              onChange={(e) => setVezes(e.target.value)}
            />
          </Field>
        )}
      </form>
    </Modal>
  );
}
