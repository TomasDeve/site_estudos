import { useEffect, useRef, useState } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import type { Nota } from "@/types/db";
import { useAtualizarNota, useExcluirNota } from "@/api/notas";
import { Card } from "@/components/Card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { fmtDataCurta } from "@/lib/dates";

/** Editor com autosave (debounce de 800ms) — sem botão de salvar. */
export function NotaCard({ nota }: { nota: Nota }) {
  const atualizar = useAtualizarNota();
  const excluir = useExcluirNota();

  const [titulo, setTitulo] = useState(nota.titulo ?? "");
  const [conteudo, setConteudo] = useState(nota.conteudo);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const primeiraRenderizacao = useRef(true);

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    setSalvando(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await atualizar.mutateAsync({ id: nota.id, titulo: titulo.trim() || null, conteudo });
      setSalvando(false);
    }, 800);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titulo, conteudo]);

  return (
    <Card className={`p-4 ${nota.fixada ? "border-gold/40" : ""}`}>
      <div className="flex items-center gap-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título da nota"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-txt outline-none placeholder:text-mut"
        />
        <span className="text-[10px] text-mut">
          {salvando ? "salvando…" : "salvo"}
        </span>
        <button
          onClick={() => atualizar.mutate({ id: nota.id, fixada: !nota.fixada })}
          className={`cursor-pointer rounded-md p-1 transition-colors hover:bg-navy-700 ${
            nota.fixada ? "text-gold" : "text-mut hover:text-txt"
          }`}
          aria-label={nota.fixada ? "Desafixar" : "Fixar no topo"}
        >
          {nota.fixada ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
        </button>
        <button
          onClick={() => setConfirmar(true)}
          className="cursor-pointer rounded-md p-1 text-mut transition-colors hover:bg-red/10 hover:text-red"
          aria-label="Excluir nota"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        placeholder="Escreva um pensamento, motivação ou insight sobre a preparação…"
        rows={Math.min(12, Math.max(3, conteudo.split("\n").length + 1))}
        className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed text-dim outline-none placeholder:text-mut"
      />
      <p className="mt-1 text-right text-[10px] capitalize text-mut">
        {fmtDataCurta(nota.atualizado_em.slice(0, 10))}
      </p>

      <ConfirmDialog
        open={confirmar}
        onClose={() => setConfirmar(false)}
        onConfirm={() => excluir.mutate(nota.id)}
        title="Excluir nota?"
        message="A nota será apagada de vez."
        confirmLabel="Excluir"
        danger
      />
    </Card>
  );
}
