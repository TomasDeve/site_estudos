import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ConcursoMateria, Redacao } from "@/types/db";
import { useCriarRedacao, useAtualizarRedacao, useExcluirRedacao } from "@/api/redacoes";
import { useAtualizarConcursoMateria } from "@/api/materias";
import { fmtData, hojeISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { Field, Input, Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const META_PADRAO = 7;

function fmtNota(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

interface Props {
  concursoId: string;
  materiaId: string;
  cor: string;
  /** vínculo da matéria no concurso (guarda a meta de redações). */
  vinculo?: ConcursoMateria;
  redacoes: Redacao[];
}

/** Notas das redações de treino (com meta até a prova). Aparece nas matérias de redação. */
export function RedacoesPanel({ concursoId, materiaId, cor, vinculo, redacoes }: Props) {
  const setMeta = useAtualizarConcursoMateria();
  const excluir = useExcluirRedacao();

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Redacao | null>(null);
  const [excluirId, setExcluirId] = useState<string | null>(null);

  const lista = [...redacoes].sort((a, b) => a.numero - b.numero);
  const feitas = lista.length;
  const meta = vinculo?.meta ?? META_PADRAO;
  const comNota = lista.filter((r) => r.nota != null);
  const media =
    comNota.length > 0 ? comNota.reduce((s, r) => s + (r.nota ?? 0), 0) / comNota.length : null;
  const pct = meta > 0 ? Math.min(100, Math.round((feitas / meta) * 100)) : 0;
  const proximoNumero = lista.reduce((m, r) => Math.max(m, r.numero), 0) + 1;

  // meta editável, sincronizada com o vínculo.
  const [metaEdit, setMetaEdit] = useState(String(meta));
  useEffect(() => setMetaEdit(String(vinculo?.meta ?? META_PADRAO)), [vinculo?.meta]);

  function salvarMeta() {
    const n = Math.max(1, Math.round(Number(metaEdit) || META_PADRAO));
    setMetaEdit(String(n));
    if (!vinculo || n === (vinculo.meta ?? META_PADRAO)) return;
    setMeta.mutate(
      { id: vinculo.id, meta: n },
      { onError: (e) => toast.error(e instanceof Error ? e.message : String(e)) }
    );
  }

  function abrirNova() {
    setEditando(null);
    setFormAberto(true);
  }
  function abrirEdicao(r: Redacao) {
    setEditando(r);
    setFormAberto(true);
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-txt">
            ✍️ Minhas redações
          </h2>
          <Button size="sm" variant="secondary" onClick={abrirNova}>
            <Plus className="size-4" /> Nova redação
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon="📝" label="Redações feitas" value={`${feitas}/${meta}`} />
          <StatCard
            icon="⭐"
            label="Média das notas"
            value={media != null ? fmtNota(media) : "—"}
            sub={comNota.length > 0 ? `${comNota.length} com nota` : "sem notas ainda"}
          />
          <label className="flex flex-col justify-center gap-1 rounded-card border border-line/60 bg-navy-800/60 px-4 py-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-mut">
              Meta até a prova
            </span>
            <span className="flex items-center gap-1.5">
              <Input
                type="number"
                min={1}
                value={metaEdit}
                onChange={(e) => setMetaEdit(e.target.value)}
                onBlur={salvarMeta}
                className="!h-8 w-16 !px-2 text-center text-sm"
                aria-label="Meta de redações até a prova"
              />
              <span className="text-xs text-dim">redações</span>
            </span>
          </label>
        </div>

        <ProgressBar value={pct} color={cor} size="md" showLabel />

        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line/60 bg-navy-900/40 px-4 py-6 text-center text-sm text-mut">
            Nenhuma redação lançada ainda. Toque em <strong className="text-dim">Nova redação</strong>{" "}
            para registrar tema, nota e observações de cada treino.
          </p>
        ) : (
          <ul className="space-y-2">
            {lista.map((r) => (
              <li
                key={r.id}
                className="group/red flex items-start gap-3 rounded-xl border border-line/50 bg-navy-900/50 px-3 py-2.5"
              >
                <span
                  className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
                  style={{ background: `${cor}22`, color: cor }}
                >
                  {r.numero}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium text-txt">
                      {r.tema.trim() || `Redação ${r.numero}`}
                    </span>
                    <span className="text-[11px] text-mut">{fmtData(r.data)}</span>
                  </div>
                  {r.observacoes.trim() && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-dim">{r.observacoes}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {r.nota != null && (
                    <span
                      className="rounded-lg px-2 py-1 text-xs font-bold tabular-nums"
                      style={{ background: `${cor}1a`, color: cor }}
                    >
                      {fmtNota(r.nota)}
                      {r.nota_max != null && (
                        <span className="font-normal text-mut">/{fmtNota(r.nota_max)}</span>
                      )}
                    </span>
                  )}
                  <button
                    onClick={() => abrirEdicao(r)}
                    className="cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-navy-600 hover:text-gold group-hover/red:opacity-100 max-md:opacity-100"
                    aria-label={`Editar redação ${r.numero}`}
                    title="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setExcluirId(r.id)}
                    className="cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-red/10 hover:text-red group-hover/red:opacity-100 max-md:opacity-100"
                    aria-label={`Excluir redação ${r.numero}`}
                    title="Excluir"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      {formAberto && (
        <RedacaoFormModal
          concursoId={concursoId}
          materiaId={materiaId}
          proximoNumero={proximoNumero}
          redacao={editando}
          onClose={() => setFormAberto(false)}
        />
      )}

      <ConfirmDialog
        open={excluirId != null}
        onClose={() => setExcluirId(null)}
        onConfirm={() => {
          if (excluirId) excluir.mutate(excluirId);
          setExcluirId(null);
        }}
        title="Excluir redação?"
        message="O lançamento desta redação (tema, nota e observações) será removido."
        confirmLabel="Excluir"
        danger
      />
    </Card>
  );
}

interface FormProps {
  concursoId: string;
  materiaId: string;
  proximoNumero: number;
  redacao: Redacao | null;
  onClose: () => void;
}

function RedacaoFormModal({ concursoId, materiaId, proximoNumero, redacao, onClose }: FormProps) {
  const criar = useCriarRedacao();
  const atualizar = useAtualizarRedacao();
  const editando = redacao != null;

  const [data, setData] = useState(redacao?.data ?? hojeISO());
  const [tema, setTema] = useState(redacao?.tema ?? "");
  const [nota, setNota] = useState(redacao?.nota != null ? String(redacao.nota) : "");
  const [notaMax, setNotaMax] = useState(redacao?.nota_max != null ? String(redacao.nota_max) : "10");
  const [obs, setObs] = useState(redacao?.observacoes ?? "");

  const busy = criar.isPending || atualizar.isPending;

  function parseNum(v: string): number | null {
    const t = v.trim().replace(",", ".");
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const campos = {
      tema: tema.trim(),
      data,
      nota: parseNum(nota),
      nota_max: parseNum(notaMax),
      observacoes: obs.trim(),
    };
    try {
      if (editando) {
        await atualizar.mutateAsync({ id: redacao.id, ...campos });
        toast.success("Redação atualizada.");
      } else {
        await criar.mutateAsync({
          concurso_id: concursoId,
          materia_id: materiaId,
          numero: proximoNumero,
          ...campos,
        });
        toast.success("Redação lançada.");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editando ? `Editar redação ${redacao.numero}` : `Nova redação ${proximoNumero}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-redacao" loading={busy}>
            {editando ? "Salvar" : "Lançar redação"}
          </Button>
        </>
      }
    >
      <form id="form-redacao" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Field>
          <Field label="Tema">
            <Input
              placeholder="Ex.: Segurança pública"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nota" hint="Deixe em branco se ainda não corrigiu">
            <Input
              type="number"
              step="0.25"
              inputMode="decimal"
              placeholder="Ex.: 8,5"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </Field>
          <Field label="Nota máxima">
            <Input
              type="number"
              step="0.25"
              inputMode="decimal"
              placeholder="Ex.: 10"
              value={notaMax}
              onChange={(e) => setNotaMax(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Observações" hint="Pontos a melhorar, comentários da correção…">
          <Textarea
            rows={4}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="O que a correção apontou, o que treinar na próxima…"
          />
        </Field>
      </form>
    </Modal>
  );
}
