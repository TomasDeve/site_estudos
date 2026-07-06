import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ConcursoMateria, Materia } from "@/types/db";
import { useAdicionarAoCiclo } from "@/api/ciclo";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";

interface Props {
  open: boolean;
  onClose: () => void;
  concursoId: string;
  materias: Materia[];
  /** vínculos do concurso (matérias do edital) */
  vinculos: ConcursoMateria[];
  /** ids de matéria já presentes no ciclo */
  jaNoCiclo: Set<string>;
  /** ordem para o novo item (fim da lista) */
  proximaOrdem: number;
}

export function AdicionarMateriaModal({
  open,
  onClose,
  concursoId,
  materias,
  vinculos,
  jaNoCiclo,
  proximaOrdem,
}: Props) {
  const adicionar = useAdicionarAoCiclo();
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const disponiveis = useMemo(() => {
    const map = new Map(materias.map((m) => [m.id, m]));
    return vinculos
      .filter((v) => !jaNoCiclo.has(v.materia_id))
      .map((v) => map.get(v.materia_id))
      .filter((m): m is Materia => !!m);
  }, [materias, vinculos, jaNoCiclo]);

  async function onAdicionar() {
    if (!selecionada) return;
    try {
      await adicionar.mutateAsync({ concursoId, materiaId: selecionada, ordem: proximaOrdem });
      const m = materias.find((x) => x.id === selecionada);
      toast.success(`${m?.nome ?? "Matéria"} adicionada ao ciclo.`);
      setSelecionada(null);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adicionar matéria ao ciclo"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onAdicionar} disabled={!selecionada} loading={adicionar.isPending}>
            Adicionar
          </Button>
        </>
      }
    >
      {disponiveis.length === 0 ? (
        <EmptyState
          icon="✅"
          title="Todas as matérias já estão no ciclo"
          message="Para incluir uma matéria nova, primeiro adicione-a ao edital em Conteúdos."
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {disponiveis.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelecionada(m.id)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selecionada === m.id
                  ? "border-gold bg-gold/10"
                  : "border-line/60 bg-navy-900/50 hover:border-line"
              }`}
            >
              <span className="text-lg">{m.icone}</span>
              <span className="min-w-0 truncate text-sm text-txt">{m.nome}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
