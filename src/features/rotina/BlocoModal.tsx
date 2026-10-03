import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { RotinaBloco } from "@/types/db";
import { useExcluirBloco, useSalvarBloco, type BlocoNovo } from "@/api/rotina";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { fmtMinutos } from "@/lib/dates";
import {
  ORDEM_TIPOS,
  TIPOS,
  TODOS_OS_DIAS,
  conflitos,
  deInputHora,
  duracao,
  fmtHora,
  paraInputHora,
  passaDaMeiaNoite,
  tipoDe,
  tituloDe,
  type TipoBloco,
} from "./rotinaModelo";

/** Valores iniciais de um bloco novo (o horário sugerido pela tela). */
export type Rascunho = Pick<BlocoNovo, "tipo" | "titulo" | "inicio" | "fim">;

/**
 * Criar/editar um bloco da rotina. No celular é uma folha que sobe do rodapé; os
 * horários usam o seletor nativo do aparelho (a roleta do relógio).
 */
export function BlocoModal({
  bloco,
  inicial,
  todos,
  onClose,
}: {
  /** Editando este bloco; ausente = criando um novo a partir de `inicial`. */
  bloco?: RotinaBloco;
  inicial: Rascunho;
  todos: RotinaBloco[];
  onClose: () => void;
}) {
  const salvar = useSalvarBloco();
  const excluir = useExcluirBloco();
  const [tipo, setTipo] = useState<TipoBloco>(bloco ? tipoDe(bloco) : ((inicial.tipo ?? "estudo") as TipoBloco));
  const [titulo, setTitulo] = useState(bloco?.titulo ?? inicial.titulo ?? "");
  const [inicio, setInicio] = useState(paraInputHora(bloco?.inicio ?? inicial.inicio));
  const [fim, setFim] = useState(paraInputHora(bloco?.fim ?? inicial.fim));
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const ini = deInputHora(inicio);
  const fi = deInputHora(fim);
  const horarioOk = ini !== null && fi !== null && ini !== fi;
  // Rotina única: todo bloco vale todos os dias.
  const cand = horarioOk ? { inicio: ini!, fim: fi!, dias: TODOS_OS_DIAS } : null;
  const batendo = cand ? conflitos(todos, cand, bloco?.id) : [];

  function gravar() {
    if (!cand) return;
    salvar.mutate(
      { id: bloco?.id, tipo, titulo: titulo.trim(), ...cand },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
    onClose();
  }

  function apagar() {
    if (!bloco) return;
    if (!confirmarExclusao) {
      setConfirmarExclusao(true);
      return;
    }
    excluir.mutate(bloco.id, {
      onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
    });
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={bloco ? `Editar · ${tituloDe(bloco)}` : "Novo bloco na rotina"}
      footer={
        <>
          {bloco && (
            <Button variant="danger" onClick={apagar} className="mr-auto">
              <Trash2 className="size-4" />
              {confirmarExclusao ? "Confirmar" : "Excluir"}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={gravar} disabled={!cand}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Tipo — define cor e ícone; o título é opcional */}
        <div>
          <span className="mb-2 block text-xs font-medium tracking-wide text-dim">O que é</span>
          <div className="grid grid-cols-4 gap-1.5">
            {ORDEM_TIPOS.map((t) => {
              const info = TIPOS[t];
              const ativo = t === tipo;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="flex min-h-14 cursor-pointer touch-manipulation flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition-colors"
                  style={
                    ativo
                      ? { borderColor: info.cor, background: `${info.cor}22`, color: info.cor }
                      : { borderColor: "var(--color-line)", color: "var(--color-dim)" }
                  }
                >
                  <span className="text-lg leading-none">{info.emoji}</span>
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium tracking-wide text-dim">
            Nome <span className="text-mut">(opcional)</span>
          </span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={TIPOS[tipo].label}
            maxLength={60}
            className="h-11 w-full rounded-xl border border-line bg-navy-900 px-3.5 text-sm text-txt outline-none placeholder:text-mut focus:border-gold/60 focus:ring-2 focus:ring-gold/15"
          />
        </label>

        {/* Horário — <input type="time"> abre a roleta nativa no celular */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["Começa", inicio, setInicio],
                ["Termina", fim, setFim],
              ] as const
            ).map(([rotulo, valor, set]) => (
              <label key={rotulo} className="block">
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-dim">{rotulo}</span>
                <input
                  type="time"
                  step={300}
                  value={valor}
                  onChange={(e) => set(e.target.value)}
                  className="h-12 w-full rounded-xl border border-line bg-navy-900 px-3 text-center text-lg font-semibold tabular-nums text-txt outline-none [color-scheme:dark] focus:border-gold/60 focus:ring-2 focus:ring-gold/15"
                />
              </label>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-mut">
            {!horarioOk
              ? "O fim precisa ser diferente do começo."
              : passaDaMeiaNoite(cand!)
                ? `Passa da meia-noite · ${fmtMinutos(duracao(cand!))} (termina no dia seguinte)`
                : `Duração: ${fmtMinutos(duracao(cand!))}`}
          </p>
        </div>

        {batendo.length > 0 && (
          <div className="flex gap-2 rounded-xl border border-amber/30 bg-amber/10 px-3 py-2.5 text-xs text-amber">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Bate com outro horário:</p>
              <ul className="mt-1 space-y-0.5 text-amber/90">
                {batendo.slice(0, 4).map((b) => (
                  <li key={b.id}>
                    {TIPOS[tipoDe(b)].emoji} {tituloDe(b)} · {fmtHora(b.inicio)}–{fmtHora(b.fim)}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-amber/70">Dá para salvar mesmo assim (ex.: intervalo dentro do estudo).</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
