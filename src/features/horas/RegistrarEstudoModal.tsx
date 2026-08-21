import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, Clock3, ListChecks } from "lucide-react";
import { toast } from "sonner";
import type { Concurso, Topico } from "@/types/db";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { useRegistrarEstudo, useRegistrarRevisao } from "@/api/estudoHoras";
import { useCicloItens, useSetItemConcluido } from "@/api/ciclo";
import { distribuirInteiro } from "@/lib/horas";
import { fmtHoras, fmtMinutos, hojeISO } from "@/lib/dates";
import { ordenarTopicosDoVinculo, topicosDoConcurso } from "@/lib/progresso";
import { estadoCiclo } from "@/lib/cicloOrder";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input, Select } from "@/components/Field";

const PRESETS = [15, 25, 30, 45, 60, 90, 120];

/** Valor sentinela do Select de matéria na revisão: sem matéria (Anki geral). */
const GERAL = "__geral__";

interface Props {
  open: boolean;
  onClose: () => void;
  concurso: Concurso;
  /** Matéria pré-selecionada (ex.: a do ciclo ou a página aberta). */
  materiaIdPadrao?: string;
  onSalvo?: () => void;
}

/**
 * Registra tempo de estudo em duas trilhas (abas):
 *  • Conteúdo — abate das horas dos assuntos. Escolhe a matéria, o tempo e quais
 *    assuntos recebem; "Todos" reparte igualmente (30 min em 3 assuntos = 10 em
 *    cada) e faz o balde de Conteúdo descer.
 *  • Revisão — abate do orçamento de revisão (Anki). Só tempo e data (matéria
 *    opcional, sem assuntos); faz o balde de Revisão descer.
 */
export function RegistrarEstudoModal({ open, onClose, concurso, materiaIdPadrao, onSalvo }: Props) {
  const { data: materias } = useMaterias();
  const { data: vinculos } = useConcursoMaterias();
  const { data: topicos } = useTopicos();
  const registrar = useRegistrarEstudo();
  const registrarRevisao = useRegistrarRevisao();
  const { data: cicloItens } = useCicloItens();
  const concluirCiclo = useSetItemConcluido();

  const [modo, setModo] = useState<"conteudo" | "revisao">("conteudo");
  const [materiaId, setMateriaId] = useState("");
  const [minutos, setMinutos] = useState(30);
  const [data, setData] = useState(hojeISO());
  const [sel, setSel] = useState<Set<string>>(new Set());

  // Matérias do concurso, na ordem do edital.
  const materiasConcurso = useMemo(() => {
    const nomeDe = new Map((materias ?? []).map((m) => [m.id, m]));
    return (vinculos ?? [])
      .filter((v) => v.concurso_id === concurso.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((v) => nomeDe.get(v.materia_id))
      .filter((m): m is NonNullable<typeof m> => !!m);
  }, [vinculos, materias, concurso.id]);

  // Assuntos da matéria escolhida, respeitando o núcleo comum do edital.
  const assuntos = useMemo(() => {
    if (!materiaId) return [] as Topico[];
    const doConcurso = topicosDoConcurso(topicos ?? [], concurso, vinculos ?? []).filter(
      (t) => t.materia_id === materiaId
    );
    const vinculo = (vinculos ?? []).find(
      (v) => v.concurso_id === concurso.id && v.materia_id === materiaId
    );
    return ordenarTopicosDoVinculo(doConcurso, vinculo?.topicos_incluidos);
  }, [topicos, materiaId, concurso, vinculos]);

  // Ao abrir: escolhe a matéria padrão (ou a primeira) e zera o tempo/data.
  useEffect(() => {
    if (!open) return;
    const inicial = materiaIdPadrao && materiasConcurso.some((m) => m.id === materiaIdPadrao)
      ? materiaIdPadrao
      : materiasConcurso[0]?.id ?? "";
    setMateriaId(inicial);
    setMinutos(30);
    setData(hojeISO());
    setModo("conteudo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Alterna a aba. Ao voltar para Conteúdo, garante uma matéria válida (a de
  // revisão aceita "Geral", que não serve para o registro de conteúdo).
  function trocarModo(novo: "conteudo" | "revisao") {
    setModo(novo);
    if (novo === "conteudo" && (!materiaId || materiaId === GERAL)) {
      setMateriaId(materiasConcurso[0]?.id ?? "");
    }
  }

  // Trocou de matéria: começa com "Todos" os assuntos marcados.
  useEffect(() => {
    setSel(new Set(assuntos.map((t) => t.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaId, open]);

  const todosMarcados = assuntos.length > 0 && sel.size === assuntos.length;
  const selecionados = assuntos.filter((t) => sel.has(t.id));

  function toggleTodos() {
    setSel(todosMarcados ? new Set() : new Set(assuntos.map((t) => t.id)));
  }
  function toggle(id: string) {
    setSel((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  // Prévia da repartição do tempo entre os assuntos selecionados.
  const previa = useMemo(() => {
    const n = selecionados.length;
    if (n <= 1 || minutos <= 0) return null;
    const fatias = distribuirInteiro(minutos, n).filter((x) => x > 0);
    if (fatias.length === 0) return null;
    const min = Math.min(...fatias);
    const max = Math.max(...fatias);
    return { n, texto: min === max ? `${min}min` : `${min}–${max}min` };
  }, [selecionados.length, minutos]);

  /**
   * Registrar CONTEÚDO da matéria que está "na vez" no ciclo já a conclui e
   * avança — assim o tempo entra e o ciclo anda num passo só, sem precisar
   * marcar "concluído" à parte. Só a aba Conteúdo chama isto; Revisão (Anki) é
   * trilha separada e não mexe no ciclo. Não faz nada se a matéria não for a
   * atual do ciclo (ou não estiver nele). Espelha o filtro da CicloPage:
   * matérias riscadas ficam fora da rotação.
   */
  async function concluirNoCicloSeForAtual(matId: string) {
    const riscadas = new Set(
      (vinculos ?? [])
        .filter((v) => v.concurso_id === concurso.id && v.riscada)
        .map((v) => v.materia_id)
    );
    const ativos = (cicloItens ?? []).filter(
      (i) => i.concurso_id === concurso.id && !riscadas.has(i.materia_id)
    );
    const { atual, proxima } = estadoCiclo(ativos);
    if (!atual || atual.materia_id !== matId) return;
    try {
      await concluirCiclo.mutateAsync({ item: atual, concluido: true });
      const nomeProx = proxima
        ? materias?.find((m) => m.id === proxima.materia_id)?.nome
        : null;
      toast.success(nomeProx ? `✓ Concluída no ciclo · a seguir: ${nomeProx}` : "✓ Concluída no ciclo");
    } catch {
      // O tempo já foi registrado; se a conclusão do ciclo falhar, não trava o
      // fluxo — dá para concluir manualmente na página do Ciclo.
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(minutos) || minutos <= 0) return toast.error("Informe um tempo válido.");

    // Revisão: abate do orçamento de revisão (Anki), sem assuntos.
    if (modo === "revisao") {
      try {
        await registrarRevisao.mutateAsync({
          concursoId: concurso.id,
          materiaId: materiaId && materiaId !== GERAL ? materiaId : null,
          data,
          minutos,
          titulo: "Revisão · Anki",
        });
        toast.success(`Revisão registrada: ${fmtMinutos(minutos)} 🔁`);
        await onSalvo?.();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
      return;
    }

    if (!materiaId) return toast.error("Escolha a matéria.");
    if (assuntos.length > 0 && selecionados.length === 0)
      return toast.error("Selecione ao menos um assunto (ou Todos).");
    const titulo =
      selecionados.length === 1
        ? selecionados[0].titulo
        : selecionados.length > 1
          ? `Estudo · ${selecionados.length} assuntos`
          : "Estudo de conteúdo";
    try {
      const partes = await registrar.mutateAsync({
        concursoId: concurso.id,
        materiaId,
        data,
        minutos,
        topicoIds: selecionados.map((t) => t.id),
        titulo,
      });
      const resumo =
        partes.length > 1
          ? ` · ${fmtMinutos(Math.round(minutos / partes.length))} em cada um de ${partes.length} assuntos`
          : partes.length === 1
            ? ` em ${selecionados[0]?.titulo ?? "1 assunto"}`
            : "";
      toast.success(`Registrado: ${fmtMinutos(minutos)}${resumo} ⏱️`);
      await concluirNoCicloSeForAtual(materiaId);
      await onSalvo?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Clock3 className="size-4 text-gold" /> Registrar estudo
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-estudo"
            loading={registrar.isPending || registrarRevisao.isPending || concluirCiclo.isPending}
          >
            <Check className="size-4" /> Registrar
          </Button>
        </>
      }
    >
      <form id="form-estudo" onSubmit={onSubmit} className="space-y-4">
        {/* Abas: Conteúdo (abate dos assuntos) × Revisão (abate do Anki) */}
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-navy-900 p-1">
          {(
            [
              { id: "conteudo", label: "Conteúdo", emoji: "📚" },
              { id: "revisao", label: "Revisão", emoji: "🔁" },
            ] as const
          ).map((aba) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => trocarModo(aba.id)}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                modo === aba.id ? "bg-gold/15 text-gold" : "text-mut hover:text-dim"
              }`}
            >
              <span>{aba.emoji}</span> {aba.label}
            </button>
          ))}
        </div>

        {modo === "revisao" && (
          <p className="rounded-lg border border-dashed border-line/60 bg-navy-900/40 px-3 py-2 text-[11px] leading-relaxed text-mut">
            O tempo abate do orçamento de <strong className="text-dim">Revisão · Anki</strong>. A
            matéria é opcional — escolha só se quiser marcar de qual foi.
          </p>
        )}

        <Field label={modo === "revisao" ? "Matéria (opcional)" : "Matéria"}>
          <Select value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            {modo === "revisao" && <option value={GERAL}>🔁 Geral (sem matéria)</option>}
            {materiasConcurso.length === 0 && modo === "conteudo" && (
              <option value="">— sem matérias —</option>
            )}
            {materiasConcurso.map((m) => (
              <option key={m.id} value={m.id}>
                {m.icone} {m.nome}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={modo === "revisao" ? "Tempo revisado" : "Tempo estudado"}>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMinutos(d)}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  minutos === d
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-line bg-navy-900 text-dim hover:border-gold/40"
                }`}
              >
                {d}min
              </button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="1"
                max="1440"
                value={String(minutos)}
                onChange={(e) => setMinutos(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="!h-8 w-20 !text-xs"
                aria-label="Minutos estudados"
              />
              <span className="text-xs text-mut">min</span>
            </div>
          </div>
        </Field>

        {modo === "conteudo" && (
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-dim">
              <ListChecks className="size-3.5 text-gold" /> Assuntos
            </span>
            {previa && (
              <span className="text-[11px] text-mut">
                ≈ <strong className="text-dim">{previa.texto}</strong> em cada
              </span>
            )}
          </div>

          {assuntos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line/60 px-3 py-2.5 text-xs text-mut">
              Esta matéria não tem assuntos no edital. O tempo será registrado no geral da matéria.
            </p>
          ) : (
            <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-lg border border-line/50 bg-navy-900/50 p-1.5">
              {/* Linha "Todos" no topo — marca/desmarca todos de uma vez */}
              <button
                type="button"
                onClick={toggleTodos}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-navy-700/60"
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    todosMarcados ? "border-gold bg-gold text-navy-950" : "border-line"
                  }`}
                >
                  {todosMarcados && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <span className="text-sm font-semibold text-txt">Todos os assuntos</span>
                <span className="ml-auto text-[11px] text-mut">{assuntos.length}</span>
              </button>

              <div className="my-1 border-t border-line/30" />

              {assuntos.map((t) => {
                const marcado = sel.has(t.id);
                const restante = Math.max(0, Math.round((t.horas_alvo - t.horas_estudadas) * 100) / 100);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-navy-700/50"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                        marcado ? "border-gold bg-gold text-navy-950" : "border-line"
                      }`}
                    >
                      {marcado && <Check className="size-3" strokeWidth={3.5} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-txt">{t.titulo}</span>
                    {t.horas_alvo > 0 && (
                      <span className="shrink-0 text-[10px] font-semibold tabular-nums text-mut">
                        resta {fmtHoras(restante)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        )}

        <Field label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
