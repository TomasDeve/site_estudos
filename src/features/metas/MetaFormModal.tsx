import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { MetaPeriodo } from "@/types/db";
import { useAtualizarMeta, useCriarMeta, useExcluirMeta, useMetas } from "@/api/metas";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Field";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { hojeISO } from "@/lib/dates";
import { hmParaHoras, horasParaHM } from "@/lib/horas";

interface Props {
  open: boolean;
  onClose: () => void;
  meta: MetaPeriodo | null;
}

export function MetaFormModal({ open, onClose, meta }: Props) {
  const { data: metas } = useMetas();
  const criar = useCriarMeta();
  const atualizar = useAtualizarMeta();
  const excluir = useExcluirMeta();

  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [horas, setHoras] = useState("2:00");
  const [descricao, setDescricao] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInicio(meta?.data_inicio ?? hojeISO());
    setFim(meta?.data_fim ?? "");
    setHoras(horasParaHM(meta ? meta.horas_dia : 2));
    setDescricao(meta?.descricao ?? "");
    setConfirmarExclusao(false);
  }, [open, meta]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const lido = hmParaHoras(horas);
    const h = lido == null ? NaN : Math.round(lido * 2) / 2; // passos de meia-hora
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      toast.error("Horas por dia deve ficar entre 0:30 e 24:00.");
      return;
    }
    if (fim < inicio) {
      toast.error("A data final vem antes da inicial.");
      return;
    }
    const sobreposta = (metas ?? []).find(
      (m) => m.id !== meta?.id && m.data_inicio <= fim && inicio <= m.data_fim
    );
    if (sobreposta) {
      toast.error(
        `Esse período cruza com a meta de ${horasParaHM(sobreposta.horas_dia)}/dia (${sobreposta.data_inicio} a ${sobreposta.data_fim}). Ajuste as datas.`
      );
      return;
    }
    try {
      const campos = {
        data_inicio: inicio,
        data_fim: fim,
        horas_dia: h,
        descricao: descricao.trim() || null,
      };
      if (meta) {
        await atualizar.mutateAsync({ id: meta.id, ...campos });
        toast.success("Meta atualizada.");
      } else {
        await criar.mutateAsync(campos);
        toast.success("Meta criada! 🎯");
      }
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
        title={meta ? "Editar meta" : "Nova meta de horas"}
        footer={
          <>
            {meta && (
              <Button
                variant="danger"
                className="mr-auto"
                onClick={() => setConfirmarExclusao(true)}
              >
                Excluir
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="form-meta"
              loading={criar.isPending || atualizar.isPending}
            >
              Salvar
            </Button>
          </>
        }
      >
        <form id="form-meta" onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="De">
              <Input
                type="date"
                required
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </Field>
            <Field label="Até">
              <Input type="date" required value={fim} onChange={(e) => setFim(e.target.value)} />
            </Field>
          </div>
          <Field label="Horas de estudo por dia" hint="Formato hora:minuto — ex.: 2:30">
            <Input
              type="text"
              inputMode="text"
              required
              placeholder="2:30"
              value={horas}
              onChange={(e) => setHoras(e.target.value)}
            />
          </Field>
          <Field label="Descrição (opcional)">
            <Input
              placeholder="Ex.: reta final PMAL"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={async () => {
          if (meta) await excluir.mutateAsync(meta.id);
          setConfirmarExclusao(false);
          onClose();
        }}
        title="Excluir meta?"
        message="Só a faixa de meta é excluída — os blocos e dias concluídos ficam."
        confirmLabel="Excluir"
        danger
        loading={excluir.isPending}
      />
    </>
  );
}
