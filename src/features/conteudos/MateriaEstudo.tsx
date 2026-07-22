import { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";
import { toast } from "sonner";
import type { Materia } from "@/types/db";
import { useSalvarEstudoMateria } from "@/api/materias";
import { fmtDesdeAgora } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";

interface Props {
  materia: Materia;
}

/**
 * Espaço "Estudo": o primeiro bloco da matéria, onde o aluno descreve como está
 * estudando aquela matéria e o que fazer agora — um recado dele para ele mesmo,
 * lido toda vez que a página abre. Salva sozinho depois de cada pausa na
 * digitação, como o resumo rápido das questões.
 */
export function MateriaEstudo({ materia }: Props) {
  const salvar = useSalvarEstudoMateria();

  const editorRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number>(undefined);
  const salvandoRef = useRef(false);
  const sujoRef = useRef(false);
  const pendenteRef = useRef(false);
  const [estado, setEstado] = useState<"salvo" | "pendente" | "salvando">("salvo");

  // mutação estável para o flush de desmontagem
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;
  const materiaIdRef = useRef(materia.id);
  materiaIdRef.current = materia.id;

  // Espelha o texto do banco no editor só quando não há digitação em voo —
  // assim um refetch (voltar para a janela) nunca engole o que está sendo escrito.
  // O `?? ""` cobre a aba que ficou aberta desde antes da coluna existir.
  const doBanco = materia.estudo ?? "";
  useEffect(() => {
    const el = editorRef.current;
    if (!el || pendenteRef.current || salvandoRef.current) return;
    if (el.innerHTML !== doBanco) el.innerHTML = doBanco;
  }, [doBanco]);

  // Sair da página no meio da digitação ainda grava o que faltou.
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      if (!pendenteRef.current || salvandoRef.current) return;
      const html = editorRef.current?.innerHTML;
      if (html === undefined) return;
      salvarRef.current.mutate({ id: materiaIdRef.current, estudo: html });
    },
    []
  );

  async function gravar() {
    const el = editorRef.current;
    if (!el || salvandoRef.current) return;
    salvandoRef.current = true;
    setEstado("salvando");
    try {
      await salvarRef.current.mutateAsync({ id: materiaIdRef.current, estudo: el.innerHTML });
      salvandoRef.current = false;
      if (sujoRef.current) {
        sujoRef.current = false;
        void gravar();
      } else {
        pendenteRef.current = false;
        setEstado("salvo");
      }
    } catch (err) {
      salvandoRef.current = false;
      setEstado("pendente");
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  function onInput() {
    pendenteRef.current = true;
    setEstado("pendente");
    if (salvandoRef.current) {
      sujoRef.current = true;
      return;
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void gravar(), 800);
  }

  return (
    // "!" porque a regra de cor do Card (border-line/60) vem depois no CSS gerado
    // e, sem o important, ganharia da borda dourada.
    <Card className="!border-gold/25">
      <CardBody>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-txt">
            <Compass className="size-4 text-gold" /> Estudo
          </h2>
          <span className="flex items-center gap-2 text-[11px]">
            {materia.estudo_em && estado === "salvo" && (
              <span className="text-mut">atualizado {fmtDesdeAgora(materia.estudo_em)}</span>
            )}
            <span
              className={`font-medium ${
                estado === "salvo" ? "text-green" : estado === "salvando" ? "text-dim" : "text-amber"
              }`}
            >
              {estado === "salvo" ? "Salvo ✓" : estado === "salvando" ? "Salvando…" : "Digitando…"}
            </span>
          </span>
        </div>
        <p className="mb-3 text-xs text-mut">
          Como você está estudando esta matéria e o que fazer agora — seu recado para quando voltar
          aqui.
        </p>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          data-placeholder="Ex.: terminei a teoria dos 3 primeiros tópicos. Agora: resolver 20 questões de Princípios por dia e revisar o resumo antes de dormir."
          aria-label="Anotação de estudo da matéria"
          className="conteudo-lei min-h-20 rounded-xl border border-line/40 bg-navy-900/40 px-3 py-2.5 outline-none transition-colors focus:border-gold/50"
        />
      </CardBody>
    </Card>
  );
}
