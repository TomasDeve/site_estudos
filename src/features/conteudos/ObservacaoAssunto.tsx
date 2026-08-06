import { useEffect, useRef, useState } from "react";
import { StickyNote } from "lucide-react";
import { toast } from "sonner";
import { useSalvarObservacaoTopico } from "@/api/topicos";
import { Textarea } from "@/components/Field";

/**
 * Recado curto do assunto (ex.: "estudar apenas o básico"), fixado na seção de
 * textos. Deixa digitar à vontade e salva ao sair do campo; segue o valor do
 * banco quando não está em foco (não engole o que está sendo escrito).
 */
export function ObservacaoAssunto({
  topicoId,
  observacao,
}: {
  topicoId: string;
  observacao: string;
}) {
  const salvar = useSalvarObservacaoTopico();
  const [texto, setTexto] = useState(observacao ?? "");
  const focado = useRef(false);

  useEffect(() => {
    if (!focado.current) setTexto(observacao ?? "");
  }, [observacao]);

  function confirmar() {
    focado.current = false;
    const t = texto.trim();
    if (t === (observacao ?? "").trim()) return;
    salvar.mutate(
      { id: topicoId, observacao: t },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) }
    );
  }

  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-mut">
        <StickyNote className="size-3.5 text-gold" /> Observação
      </p>
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => {
          focado.current = true;
        }}
        onBlur={confirmar}
        rows={2}
        placeholder="Ex.: estudar apenas o básico deste assunto."
        aria-label="Observação do assunto"
        className="!text-sm"
      />
    </div>
  );
}
