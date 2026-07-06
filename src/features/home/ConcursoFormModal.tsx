import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { Concurso } from "@/types/db";
import {
  slugify,
  useAtualizarConcurso,
  useCriarConcurso,
  useExcluirConcurso,
} from "@/api/concursos";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const CORES = ["#e0a83e", "#4f9dde", "#3fbf7f", "#e5564b", "#a78bfa", "#f472b6", "#22d3ee"];

interface Props {
  open: boolean;
  onClose: () => void;
  /** null = criar novo */
  concurso: Concurso | null;
}

export function ConcursoFormModal({ open, onClose, concurso }: Props) {
  const criar = useCriarConcurso();
  const atualizar = useAtualizarConcurso();
  const excluir = useExcluirConcurso();

  const [nome, setNome] = useState("");
  const [orgao, setOrgao] = useState("");
  const [banca, setBanca] = useState("");
  const [status, setStatus] = useState("ativo");
  const [dataProva, setDataProva] = useState("");
  const [icone, setIcone] = useState("🎯");
  const [cor, setCor] = useState(CORES[0]);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(concurso?.nome ?? "");
    setOrgao(concurso?.orgao ?? "");
    setBanca(concurso?.banca ?? "");
    setStatus(concurso?.status ?? "ativo");
    setDataProva(concurso?.data_prova ?? "");
    setIcone(concurso?.icone ?? "🎯");
    setCor(concurso?.cor ?? CORES[0]);
    setConfirmarExclusao(false);
  }, [open, concurso]);

  const busy = criar.isPending || atualizar.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const campos = {
      nome: nome.trim(),
      orgao: orgao.trim() || null,
      banca: banca.trim() || null,
      status,
      data_prova: dataProva || null,
      icone: icone.trim() || "🎯",
      cor,
    };
    try {
      if (concurso) {
        await atualizar.mutateAsync({ id: concurso.id, ...campos });
        toast.success("Concurso atualizado.");
      } else {
        await criar.mutateAsync({ ...campos, slug: slugify(campos.nome) });
        toast.success("Concurso criado! 🎉");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onExcluir() {
    if (!concurso) return;
    try {
      await excluir.mutateAsync(concurso.id);
      toast.success("Concurso excluído.");
      setConfirmarExclusao(false);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={concurso ? "Editar concurso" : "Novo concurso"}
        footer={
          <>
            {concurso && (
              <Button
                variant="danger"
                type="button"
                className="mr-auto"
                onClick={() => setConfirmarExclusao(true)}
              >
                Excluir
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="form-concurso" loading={busy}>
              {concurso ? "Salvar" : "Criar concurso"}
            </Button>
          </>
        }
      >
        <form id="form-concurso" onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome do concurso">
            <Input
              required
              placeholder="Ex.: PF 2027 — Agente"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Órgão">
              <Input
                placeholder="Polícia Federal"
                value={orgao}
                onChange={(e) => setOrgao(e.target.value)}
              />
            </Field>
            <Field label="Banca">
              <Input
                placeholder="Cebraspe"
                value={banca}
                onChange={(e) => setBanca(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ativo">Estudando agora</option>
                <option value="futuro">Futuro / próximo</option>
                <option value="arquivado">Arquivado</option>
              </Select>
            </Field>
            <Field label="Data da prova" hint="Deixe vazio se ainda não saiu">
              <Input
                type="date"
                value={dataProva}
                onChange={(e) => setDataProva(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-[88px_1fr] gap-3">
            <Field label="Ícone">
              <Input
                value={icone}
                maxLength={4}
                className="text-center text-lg"
                onChange={(e) => setIcone(e.target.value)}
              />
            </Field>
            <Field label="Cor">
              <div className="flex h-10 items-center gap-2">
                {CORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={`size-7 cursor-pointer rounded-full transition-transform hover:scale-110 ${
                      cor === c ? "ring-2 ring-txt ring-offset-2 ring-offset-navy-800" : ""
                    }`}
                    style={{ background: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={onExcluir}
        title="Excluir concurso?"
        message={`"${concurso?.nome}" será excluído com seus vínculos, eventos e dashboard. As matérias e o progresso dos tópicos continuam no catálogo (podem estar em uso por outros concursos).`}
        confirmLabel="Excluir de vez"
        danger
        loading={excluir.isPending}
      />
    </>
  );
}
