import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { ConcursoMateria, Materia } from "@/types/db";
import { useCriarMateriaNoConcurso, useVincularMateria } from "@/api/materias";
import { slugify } from "@/api/concursos";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";

interface Props {
  open: boolean;
  onClose: () => void;
  concursoId: string;
  materias: Materia[];
  vinculos: ConcursoMateria[];
}

export function MateriaFormModal({ open, onClose, concursoId, materias, vinculos }: Props) {
  const criarNova = useCriarMateriaNoConcurso();
  const vincular = useVincularMateria();

  const jaVinculadas = useMemo(
    () => new Set(vinculos.filter((v) => v.concurso_id === concursoId).map((v) => v.materia_id)),
    [vinculos, concursoId]
  );
  const disponiveis = useMemo(
    () => materias.filter((m) => !jaVinculadas.has(m.id)),
    [materias, jaVinculadas]
  );

  const [modo, setModo] = useState<"existente" | "nova">("existente");
  const [materiaId, setMateriaId] = useState("");
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("📚");
  const [area, setArea] = useState("P1");
  const [redacao, setRedacao] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModo(disponiveis.length > 0 ? "existente" : "nova");
    setMateriaId(disponiveis[0]?.id ?? "");
    setNome("");
    setIcone("📚");
    setArea("P1");
    setRedacao(false);
  }, [open, disponiveis]);

  const busy = criarNova.isPending || vincular.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (modo === "existente") {
        if (!materiaId) return;
        await vincular.mutateAsync({ concursoId, materiaId, area });
        toast.success("Matéria adicionada ao concurso.");
      } else {
        await criarNova.mutateAsync({
          concursoId,
          area,
          materia: {
            nome: nome.trim(),
            icone: icone.trim() || (redacao ? "✍️" : "📚"),
            slug: slugify(nome),
            tipo: redacao ? "redacao" : "normal",
          },
        });
        toast.success("Matéria criada e vinculada!");
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
      title="Adicionar matéria"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-materia" loading={busy}>
            Adicionar
          </Button>
        </>
      }
    >
      <form id="form-materia" onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-1 rounded-xl bg-navy-900 p-1">
          {(
            [
              ["existente", "Do catálogo"],
              ["nova", "Nova matéria"],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setModo(valor)}
              className={`flex-1 cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors ${
                modo === valor ? "bg-navy-600 text-txt" : "text-mut hover:text-dim"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {modo === "existente" ? (
          disponiveis.length > 0 ? (
            <Field
              label="Matéria do catálogo"
              hint="O progresso já registrado nela vale aqui também"
            >
              <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
                {disponiveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icone} {m.nome}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="text-sm text-mut">
              Todas as matérias do catálogo já estão neste concurso — crie uma nova.
            </p>
          )
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-[88px_1fr] gap-3">
              <Field label="Ícone">
                <Input
                  value={icone}
                  maxLength={4}
                  className="text-center text-lg"
                  onChange={(e) => setIcone(e.target.value)}
                />
              </Field>
              <Field label="Nome da matéria">
                <Input
                  required={modo === "nova"}
                  placeholder="Ex.: Direito Penal"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line/60 bg-navy-900/50 px-3 py-2.5">
              <input
                type="checkbox"
                checked={redacao}
                onChange={(e) => setRedacao(e.target.checked)}
                className="mt-0.5 size-4 accent-gold"
              />
              <span className="text-xs text-dim">
                <strong className="text-txt">Matéria de redação</strong> — habilita o painel para
                lançar as notas das redações (em vez de questões).
              </span>
            </label>
          </div>
        )}

        <Field label="Bloco na prova">
          <Select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="P1">P1 — Conhecimentos básicos</option>
            <option value="P2">P2 — Conhecimentos específicos</option>
            <option value="outros">Outros</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
