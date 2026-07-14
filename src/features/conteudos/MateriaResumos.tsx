import { useState } from "react";
import { BookOpen, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TopicoTexto } from "@/types/db";
import { useCriarTopicoTexto, useExcluirTopicoTexto } from "@/api/topicoTextos";
import { Card, CardBody } from "@/components/Card";
import { TextoReaderModal } from "./TextoReaderModal";

interface Props {
  materiaId: string;
  /** Textos/resumos ligados à matéria (não a um tópico específico). */
  textos: TopicoTexto[];
}

/**
 * Resumos "gerais" da matéria: anotações que valem para a matéria inteira, sem
 * prender a um assunto. Reaproveita o mesmo leitor/editor dos textos de tópico.
 */
export function MateriaResumos({ materiaId, textos }: Props) {
  const criar = useCriarTopicoTexto();
  const excluir = useExcluirTopicoTexto();
  const [aberto, setAberto] = useState<TopicoTexto | null>(null);

  const lista = [...textos].sort(
    (a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)
  );

  async function onNovo() {
    try {
      const novo = await criar.mutateAsync({
        materia_id: materiaId,
        titulo: "Novo resumo",
        ordem: lista.length,
      });
      setAberto(novo);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-txt">
            <BookOpen className="size-4 text-gold" /> Resumos da matéria (geral)
          </h2>
          {lista.length > 0 && (
            <span className="text-xs text-mut">
              {lista.length} {lista.length === 1 ? "resumo" : "resumos"}
            </span>
          )}
        </div>
        <p className="mb-3 text-xs text-mut">
          Anotações e resumos gerais desta matéria, sem prender a um assunto específico — ótimo para
          esquemas, macetes e informações que valem para o conteúdo inteiro.
        </p>

        {lista.length > 0 && (
          <ul className="space-y-1">
            {lista.map((t) => (
              <li key={t.id} className="group/txt flex items-center gap-1">
                <button
                  onClick={() => setAberto(t)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-txt transition-colors hover:bg-navy-700/50"
                >
                  <BookOpen className="size-3.5 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                  {t.leituras > 0 && (
                    <span className="shrink-0 text-[10px] tabular-nums text-mut">
                      Lido {t.leituras}x
                    </span>
                  )}
                </button>
                <a
                  href={`/texto/${t.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-navy-700 hover:text-gold group-hover/txt:opacity-100 max-md:opacity-100"
                  aria-label={`Abrir ${t.titulo} em tela cheia`}
                  title="Abrir em tela cheia (nova aba)"
                >
                  <ExternalLink className="size-3.5" />
                </a>
                <button
                  onClick={() => excluir.mutate(t.id)}
                  className="shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-red/10 hover:text-red group-hover/txt:opacity-100 max-md:opacity-100"
                  aria-label={`Excluir ${t.titulo}`}
                  title="Excluir resumo"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onNovo}
          className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-gold"
        >
          <Plus className="size-3.5" /> Novo resumo
        </button>
      </CardBody>

      {aberto && <TextoReaderModal texto={aberto} onClose={() => setAberto(null)} />}
    </Card>
  );
}
