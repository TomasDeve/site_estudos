import { useMemo, useState, type FormEvent } from "react";
import { ChevronDown, Plus, Unlink } from "lucide-react";
import { toast } from "sonner";
import type { ConcursoMateria, Materia, QuestaoLog, Topico, TopicoLink } from "@/types/db";
import { useCriarTopico } from "@/api/topicos";
import { useDesvincularMateria } from "@/api/materias";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TopicoRow } from "./TopicoRow";

interface Props {
  vinculo: ConcursoMateria;
  materia: Materia;
  topicos: Topico[];
  links: TopicoLink[];
  logs: QuestaoLog[];
  comum: boolean;
  corConcurso: string;
}

export function MateriaAccordion({ vinculo, materia, topicos, links, logs, comum, corConcurso }: Props) {
  const [aberta, setAberta] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [novoTopico, setNovoTopico] = useState("");
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);

  const criarTopico = useCriarTopico();
  const desvincular = useDesvincularMateria();

  const meusTopicos = useMemo(
    () =>
      topicos
        .filter((t) => t.materia_id === materia.id)
        .sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)),
    [topicos, materia.id]
  );
  const linksPorTopico = useMemo(() => {
    const mapa = new Map<string, TopicoLink[]>();
    for (const l of links) {
      const arr = mapa.get(l.topico_id) ?? [];
      arr.push(l);
      mapa.set(l.topico_id, arr);
    }
    return mapa;
  }, [links]);
  const logsPorTopico = useMemo(() => {
    const mapa = new Map<string, QuestaoLog[]>();
    for (const l of logs) {
      if (!l.topico_id) continue;
      const arr = mapa.get(l.topico_id) ?? [];
      arr.push(l);
      mapa.set(l.topico_id, arr);
    }
    return mapa;
  }, [logs]);

  const concluidos = meusTopicos.filter((t) => t.status === "concluido").length;
  const pct = meusTopicos.length === 0 ? 0 : Math.round((concluidos / meusTopicos.length) * 100);

  async function onAddTopico(e: FormEvent) {
    e.preventDefault();
    const titulo = novoTopico.trim();
    if (!titulo) return;
    try {
      const maiorOrdem = meusTopicos.reduce((m, t) => Math.max(m, t.ordem), -1);
      await criarTopico.mutateAsync({ materia_id: materia.id, titulo, ordem: maiorOrdem + 1 });
      setNovoTopico("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="overflow-hidden rounded-card border border-line/60 bg-navy-800/80">
      <button
        onClick={() => setAberta((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-navy-700/40"
        aria-expanded={aberta}
      >
        <span className="text-xl">{materia.icone}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-txt">{materia.nome}</h3>
            {comum && (
              <span
                className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold"
                title="Matéria usada em outro concurso: o progresso conta para todos"
              >
                Comum
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <ProgressBar value={pct} color={corConcurso} size="sm" className="max-w-64 flex-1" />
            <span className="text-[11px] font-medium tabular-nums text-mut">
              {concluidos}/{meusTopicos.length} · {pct}%
            </span>
          </div>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-mut transition-transform ${aberta ? "rotate-180" : ""}`}
        />
      </button>

      {aberta && (
        <div className="border-t border-line/40 px-3 pb-3 pt-2">
          <ul>
            {meusTopicos.map((t) => (
              <TopicoRow
                key={t.id}
                topico={t}
                links={linksPorTopico.get(t.id) ?? []}
                logs={logsPorTopico.get(t.id) ?? []}
              />
            ))}
          </ul>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/30 pt-3">
            {adicionando ? (
              <form onSubmit={onAddTopico} className="flex flex-1 items-center gap-2">
                <Input
                  autoFocus
                  placeholder="Título do novo tópico"
                  value={novoTopico}
                  onChange={(e) => setNovoTopico(e.target.value)}
                  className="!h-8 flex-1 !text-xs"
                />
                <Button size="sm" type="submit" variant="secondary" loading={criarTopico.isPending}>
                  Adicionar
                </Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setAdicionando(false)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <>
                <button
                  onClick={() => setAdicionando(true)}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-gold"
                >
                  <Plus className="size-3.5" /> Novo tópico
                </button>
                <button
                  onClick={() => setConfirmarRemocao(true)}
                  className="flex cursor-pointer items-center gap-1.5 text-xs text-mut transition-colors hover:text-red"
                  title="Remove a matéria deste concurso (o progresso fica guardado no catálogo)"
                >
                  <Unlink className="size-3.5" /> Remover do concurso
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmarRemocao}
        onClose={() => setConfirmarRemocao(false)}
        onConfirm={() => {
          desvincular.mutate(vinculo.id);
          setConfirmarRemocao(false);
        }}
        title="Remover matéria do concurso?"
        message={`"${materia.nome}" sai deste concurso, mas a matéria e o progresso dos tópicos continuam no catálogo (e em outros concursos que a usam).`}
        confirmLabel="Remover"
        danger
      />
    </div>
  );
}
