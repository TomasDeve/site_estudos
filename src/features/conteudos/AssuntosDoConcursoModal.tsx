import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ConcursoMateria, Topico } from "@/types/db";
import { useSetTopicosIncluidos } from "@/api/materias";
import { ordenarTopicosDoVinculo } from "@/lib/progresso";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";

interface Props {
  open: boolean;
  onClose: () => void;
  concursoNome: string;
  materiaNome: string;
  /** Todos os tópicos da matéria (compartilhados entre concursos). */
  topicos: Topico[];
  /** Vínculo concurso↔matéria atual (traz o recorte já salvo). */
  vinculo: ConcursoMateria;
}

/**
 * Escolhe QUAIS assuntos da matéria entram NESTE concurso. A matéria é a mesma
 * (compartilhada); marcar/desmarcar só muda o recorte do edital deste concurso —
 * o progresso, as questões e os resumos de cada assunto continuam valendo para
 * todos os concursos que usam a matéria. Sem nenhuma marcação = a matéria toda.
 */
export function AssuntosDoConcursoModal({
  open,
  onClose,
  concursoNome,
  materiaNome,
  topicos,
  vinculo,
}: Props) {
  const setIncluidos = useSetTopicosIncluidos();

  // Lista na ordem em que aparece no concurso (recorte primeiro; resto por ordem).
  const ordenados = useMemo(() => {
    const doRecorte = ordenarTopicosDoVinculo(topicos, vinculo.topicos_incluidos);
    const noRecorte = new Set(doRecorte.map((t) => t.id));
    const resto = topicos
      .filter((t) => !noRecorte.has(t.id))
      .sort((a, b) => a.ordem - b.ordem);
    return vinculo.topicos_incluidos ? [...doRecorte, ...resto] : doRecorte;
  }, [topicos, vinculo.topicos_incluidos]);

  const [sel, setSel] = useState<Set<string>>(new Set());

  // Ao abrir: null = todos marcados; array = só os do recorte.
  useEffect(() => {
    if (!open) return;
    setSel(
      vinculo.topicos_incluidos
        ? new Set(vinculo.topicos_incluidos)
        : new Set(topicos.map((t) => t.id))
    );
  }, [open, vinculo.topicos_incluidos, topicos]);

  function alternar(id: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function salvar() {
    // Preserva a ordem atual do recorte e acrescenta os recém-marcados por ordem.
    const existentes = (vinculo.topicos_incluidos ?? []).filter((id) => sel.has(id));
    const jaTem = new Set(existentes);
    const novos = ordenados
      .filter((t) => sel.has(t.id) && !jaTem.has(t.id))
      .map((t) => t.id);
    const arr = [...existentes, ...novos];
    // Todos marcados = "matéria inteira" (null): assuntos futuros entram sozinhos.
    const valor = arr.length === topicos.length ? null : arr;
    setIncluidos.mutate(
      { id: vinculo.id, topicos_incluidos: valor },
      {
        onSuccess: () => onClose(),
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      }
    );
  }

  const marcados = sel.size;
  const total = topicos.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Assuntos no ${concursoNome}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-mut">
            {marcados} de {total} assuntos
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={salvar} loading={setIncluidos.isPending} disabled={marcados === 0}>
              Salvar recorte
            </Button>
          </div>
        </div>
      }
    >
      <p className="mb-3 text-xs text-mut">
        Marque só os assuntos de <strong className="text-dim">{materiaNome}</strong> que caem no
        edital deste concurso. É a mesma matéria dos outros concursos: o progresso e as questões de
        cada assunto continuam <span className="font-semibold text-gold">compartilhados</span>.
      </p>

      <div className="mb-2 flex items-center gap-3 text-[11px]">
        <button
          type="button"
          onClick={() => setSel(new Set(topicos.map((t) => t.id)))}
          className="cursor-pointer font-medium text-dim transition-colors hover:text-gold"
        >
          Marcar todos
        </button>
        <span className="text-line">·</span>
        <button
          type="button"
          onClick={() => setSel(new Set())}
          className="cursor-pointer font-medium text-dim transition-colors hover:text-gold"
        >
          Desmarcar todos
        </button>
      </div>

      <div className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
        {ordenados.map((t) => (
          <label
            key={t.id}
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/60 bg-navy-900/50 px-3 py-2 transition-colors hover:border-line"
          >
            <input
              type="checkbox"
              checked={sel.has(t.id)}
              onChange={() => alternar(t.id)}
              className="mt-0.5 size-4 shrink-0 accent-gold"
            />
            <span className="min-w-0 text-xs text-dim">{t.titulo}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
