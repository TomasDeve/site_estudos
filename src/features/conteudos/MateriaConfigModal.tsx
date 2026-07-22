import { toast } from "sonner";
import type { Materia } from "@/types/db";
import { useAtualizarMateria } from "@/api/materias";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  materia: Materia;
}

/** Uma chave de configuração da matéria que liga/desliga um bloco da página. */
type Chave = "mostrar_questoes_geral" | "mostrar_resumos_geral";

/**
 * Configurações da matéria: liga e desliga os blocos da página para enxugar o
 * que você não usa naquela matéria. Cada marcação grava na hora — não tem
 * "Salvar", o que você vê no modal já é o que está valendo.
 */
export function MateriaConfigModal({ open, onClose, materia }: Props) {
  const atualizar = useAtualizarMateria();

  const ehRedacao = materia.tipo === "redacao";

  // A primeira opção governa o mesmo lugar da página nos dois casos: nas
  // matérias normais é o registro geral de questões; na redação, o painel de notas.
  const opcoes: { chave: Chave; titulo: string; ajuda: string }[] = [
    {
      chave: "mostrar_questoes_geral",
      titulo: ehRedacao ? "Exibir painel de redações" : "Exibir questões geral da matéria",
      ajuda: ehRedacao
        ? "Bloco para lançar as notas dos treinos de redação."
        : "Bloco para registrar questões resolvidas sem escolher um assunto.",
    },
    {
      chave: "mostrar_resumos_geral",
      titulo: "Exibir Resumo Geral da matéria",
      ajuda: "Resumos que valem para a matéria inteira, sem prender a um assunto.",
    },
  ];

  function alternar(chave: Chave, valor: boolean) {
    atualizar.mutate(
      { id: materia.id, [chave]: valor },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configurações · ${materia.nome}`}
      footer={<Button onClick={onClose}>Concluído</Button>}
    >
      <p className="mb-3 text-xs text-mut">
        Desmarque o que você não usa nesta matéria — o bloco some da página e o edital sobe.
      </p>

      <div className="space-y-2">
        {opcoes.map(({ chave, titulo, ajuda }) => (
          <label
            key={chave}
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/60 bg-navy-900/50 px-3 py-2.5 transition-colors hover:border-line"
          >
            <input
              type="checkbox"
              checked={materia[chave]}
              onChange={(e) => alternar(chave, e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-gold"
            />
            <span className="min-w-0 text-xs text-dim">
              <strong className="text-txt">{titulo}</strong>
              <span className="mt-0.5 block text-mut">{ajuda}</span>
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
