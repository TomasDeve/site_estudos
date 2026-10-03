import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { RotinaBloco } from "@/types/db";
import { pedirRotinaIA, type BlocoNovo } from "@/api/rotina";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Spinner } from "@/components/Spinner";
import { fmtMinutos } from "@/lib/dates";
import { ResumoDia } from "./ResumoDia";
import {
  TIPOS,
  TODOS_OS_DIAS,
  conflitos,
  duracao,
  fmtHora,
  ordenarPeloDia,
  passaDaMeiaNoite,
  tipoDe,
  tituloDe,
} from "./rotinaModelo";

/**
 * Bloco da conversa com a IA. `ref` é o apelido curto que a IA vê (b1, b2… os
 * salvos; n1, n2… os que ela criou); `id` liga ao bloco salvo, quando existe.
 */
interface Item {
  ref: string;
  id?: string;
  tipo: string;
  titulo: string;
  inicio: number;
  fim: number;
}

interface Proposta {
  resumo: string;
  mudancas: string[];
  itens: Item[];
}

const SUGESTOES = [
  "Quero acordar às 5:30 e dormir às 22:00",
  "Encaixe mais 1h de estudo à noite",
  "Passe a academia para de manhã",
  "Estudo em blocos de 50 min com 10 min de intervalo",
];

const SUGESTOES_VAZIA = [
  "Acordo às 6h, durmo às 22:30, estudo 3h de manhã e treino às 18h",
  "Trabalho das 8h às 17h; encaixe 3h de estudo, academia e as refeições",
];

/** Itens como blocos da rotina (todo dia), para reaproveitar as contas da tela. */
const comoBlocos = (itens: Item[]): RotinaBloco[] =>
  itens.map((i) => ({
    id: i.ref,
    user_id: "",
    created_at: "",
    titulo: i.titulo,
    tipo: i.tipo,
    inicio: i.inicio,
    fim: i.fim,
    dias: TODOS_OS_DIAS,
  }));

const faixa = (b: Pick<Item, "inicio" | "fim">) =>
  `${fmtHora(b.inicio)}–${fmtHora(b.fim)}${passaDaMeiaNoite(b) ? " (dia seguinte)" : ""}`;

/**
 * "Ajustar com IA": o aluno descreve o que quer mudar (um horário ou a rotina
 * inteira), a IA do site devolve a rotina reorganizada e a tela mostra a prévia —
 * o que entra, o que muda e o que sai. Dá para pedir mais ajustes em cima da
 * proposta; só grava ao tocar em "Aplicar".
 */
export function RotinaIAModal({
  blocos,
  onAplicar,
  onClose,
}: {
  blocos: RotinaBloco[];
  /** Grava a nova rotina (a página cuida do "Desfazer"). */
  onAplicar: (nova: (BlocoNovo & { id?: string })[]) => Promise<void>;
  onClose: () => void;
}) {
  // Fotografia da rotina ao abrir: as refs não mudam se a lista recarregar.
  const [originais] = useState<Item[]>(() =>
    ordenarPeloDia(blocos).map((b, i) => ({
      ref: `b${i + 1}`,
      id: b.id,
      tipo: b.tipo,
      titulo: b.titulo,
      inicio: b.inicio,
      fim: b.fim,
    }))
  );
  const [pedido, setPedido] = useState("");
  const [anteriores, setAnteriores] = useState<string[]>([]);
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [pensando, setPensando] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const novos = useRef(0);

  // Fechou no meio: cancela o pedido.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function enviar() {
    const texto = pedido.trim();
    if (!texto || pensando) return;
    const base = proposta?.itens ?? originais;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPensando(texto);
    try {
      const r = await pedirRotinaIA(
        {
          pedido: texto,
          rotina: base.map(({ ref, tipo, titulo, inicio, fim }) => ({ ref, tipo, titulo, inicio, fim })),
          anteriores,
        },
        ctrl.signal
      );
      // A ref devolvida liga o bloco ao de antes (e ao salvo); repetida ou
      // desconhecida = bloco novo.
      const porRef = new Map(base.map((i) => [i.ref, i]));
      const usados = new Set<string>();
      const itens = r.blocos.map((b): Item => {
        const de = b.ref && !usados.has(b.ref) ? porRef.get(b.ref) : undefined;
        if (de) {
          usados.add(de.ref);
          return { ...b, ref: de.ref, id: de.id };
        }
        novos.current += 1;
        return { ...b, ref: `n${novos.current}`, id: undefined };
      });
      setProposta({ resumo: r.resumo, mudancas: r.mudancas, itens });
      setAnteriores((a) => [...a, texto]);
      setPedido("");
    } catch (err) {
      if (!ctrl.signal.aborted) toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setPensando(null);
      }
    }
  }

  function cancelarPedido() {
    abortRef.current?.abort();
    abortRef.current = null;
    setPensando(null);
  }

  async function aplicar() {
    if (!proposta) return;
    setAplicando(true);
    try {
      await onAplicar(
        proposta.itens.map((i) => ({
          id: i.id,
          tipo: i.tipo,
          titulo: i.titulo,
          inicio: i.inicio,
          fim: i.fim,
          dias: TODOS_OS_DIAS,
        }))
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setAplicando(false);
    }
  }

  const caixaPedido = (compacta: boolean) => (
    <textarea
      value={pedido}
      onChange={(e) => setPedido(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          void enviar();
        }
      }}
      rows={compacta ? 2 : 4}
      maxLength={2000}
      autoFocus={!compacta}
      placeholder={
        compacta
          ? "Quer ajustar mais alguma coisa? Ex.: tira o intervalo da tarde"
          : "Ex.: quero acordar às 5h, estudar 4h (manhã e noite) e treinar às 17h"
      }
      className="w-full resize-none rounded-xl border border-line bg-navy-900 px-3.5 py-3 text-sm text-txt outline-none placeholder:text-mut focus:border-gold/60 focus:ring-2 focus:ring-gold/15"
    />
  );

  let corpo: React.ReactNode;
  let rodape: React.ReactNode;

  if (pensando) {
    corpo = (
      <div className="flex flex-col items-center px-2 py-8 text-center">
        <Spinner className="size-7 text-gold" />
        <p className="mt-4 text-sm font-semibold text-txt">A IA está organizando sua rotina…</p>
        <p className="mt-1 text-xs text-mut">Leva alguns segundos.</p>
        <p className="mt-4 max-w-sm rounded-xl border border-line/50 bg-navy-900/60 px-3 py-2 text-xs italic text-dim">
          “{pensando}”
        </p>
      </div>
    );
    rodape = (
      <Button variant="ghost" onClick={cancelarPedido}>
        Cancelar
      </Button>
    );
  } else if (proposta) {
    corpo = (
      <div className="space-y-4">
        <PropostaIA proposta={proposta} originais={originais} />
        <div className="border-t border-line/40 pt-4">
          {caixaPedido(true)}
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => void enviar()} disabled={!pedido.trim()}>
              <Sparkles className="size-4" />
              Ajustar a proposta
            </Button>
          </div>
        </div>
      </div>
    );
    rodape = (
      <>
        <Button variant="ghost" onClick={onClose} disabled={aplicando}>
          Descartar
        </Button>
        <Button onClick={() => void aplicar()} loading={aplicando}>
          Aplicar na rotina
        </Button>
      </>
    );
  } else {
    const sugestoes = originais.length ? SUGESTOES : SUGESTOES_VAZIA;
    corpo = (
      <div className="space-y-3">
        <p className="text-sm text-dim">
          Descreva o que quer mudar — um horário só ou a rotina inteira. A IA reorganiza os blocos e
          mostra como fica antes de salvar.
        </p>
        {caixaPedido(false)}
        <div className="flex flex-wrap gap-1.5">
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPedido(s)}
              className="cursor-pointer touch-manipulation rounded-full border border-line/60 px-2.5 py-1 text-left text-[11px] text-dim transition-colors hover:border-gold/50 hover:text-gold"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
    rodape = (
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={() => void enviar()} disabled={!pedido.trim()}>
          <Sparkles className="size-4" />
          Organizar
        </Button>
      </>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-xl"
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 text-gold" />
          Ajustar a rotina com IA
        </span>
      }
      footer={rodape}
    >
      {corpo}
    </Modal>
  );
}

/** A resposta da IA: o que ela fez, como fica o dia e o que sai. */
function PropostaIA({ proposta, originais }: { proposta: Proposta; originais: Item[] }) {
  const salvos = new Map(originais.filter((o) => o.id).map((o) => [o.id!, o]));
  const ficam = new Set(proposta.itens.map((i) => i.id).filter(Boolean));
  const removidos = originais.filter((o) => o.id && !ficam.has(o.id));
  const blocos = comoBlocos(proposta.itens);
  const sobrepostos = new Set(
    blocos.filter((b) => conflitos(blocos, b, b.id).length > 0).map((b) => b.id)
  );

  return (
    <>
      <div className="rounded-xl border border-gold/30 bg-gold/5 px-3.5 py-3">
        <p className="flex gap-2 text-sm text-txt">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>{proposta.resumo || "Pronto — veja como fica."}</span>
        </p>
        {proposta.mudancas.length > 0 && (
          <ul className="mt-2 space-y-0.5 pl-6 text-xs text-dim">
            {proposta.mudancas.map((m, k) => (
              <li key={k} className="list-disc">
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mut">Como fica</div>
        <div className="mb-2.5">
          <ResumoDia blocos={blocos} dia={1} />
        </div>
        {proposta.itens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line/50 px-4 py-5 text-center text-sm text-mut">
            A rotina fica vazia.
          </p>
        ) : (
          <ul className="space-y-1">
            {ordenarPeloDia(proposta.itens).map((i) => {
              const info = TIPOS[tipoDe(i)];
              const antes = i.id ? salvos.get(i.id) : undefined;
              const mudouHora = antes && (antes.inicio !== i.inicio || antes.fim !== i.fim);
              const mudouNome = antes && (antes.tipo !== i.tipo || antes.titulo.trim() !== i.titulo.trim());
              const marca = !antes
                ? { txt: "novo", cor: "#3fbf7f" }
                : mudouHora || mudouNome
                  ? { txt: "mudou", cor: "#e0a83e" }
                  : null;
              return (
                <li
                  key={i.ref}
                  className="flex items-center gap-2.5 rounded-lg border px-2.5 py-2"
                  style={{
                    borderColor: marca ? `${marca.cor}55` : "var(--color-line)",
                    background: `${info.cor}0d`,
                    boxShadow: `inset 3px 0 0 ${info.cor}`,
                  }}
                >
                  <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-dim">
                    {fmtHora(i.inicio)}
                  </span>
                  <span className="text-lg leading-none">{info.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-txt">{tituloDe(i)}</span>
                    <span className="block truncate text-[11px] tabular-nums text-mut">
                      {faixa(i)} · {fmtMinutos(duracao(i))}
                      {mudouHora && <span className="text-mut/70"> · antes {faixa(antes)}</span>}
                      {!mudouHora && mudouNome && <span className="text-mut/70"> · antes “{tituloDe(antes)}”</span>}
                    </span>
                  </span>
                  {sobrepostos.has(i.ref) && (
                    <AlertTriangle className="size-4 shrink-0 text-amber" aria-label="Bate com outro bloco" />
                  )}
                  {marca && (
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-950"
                      style={{ background: marca.cor }}
                    >
                      {marca.txt}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {sobrepostos.size > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber">
            <AlertTriangle className="size-3.5 shrink-0" />
            Há blocos se sobrepondo — dá para aplicar assim ou pedir para a IA ajustar.
          </p>
        )}
      </div>

      {removidos.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mut">Sai da rotina</div>
          <ul className="space-y-0.5">
            {removidos.map((r) => (
              <li key={r.ref} className="flex items-center gap-2 text-xs text-mut">
                <span>{TIPOS[tipoDe(r)].emoji}</span>
                <span className="line-through">
                  {tituloDe(r)} · {faixa(r)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
