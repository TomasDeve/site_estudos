import { useState } from "react";
import { Plus, Settings2 } from "lucide-react";
import type { Ferramenta } from "@/types/db";
import { useFerramentas } from "@/api/ferramentas";
import { useCriarNota, useNotas } from "@/api/notas";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FerramentaFormModal } from "./FerramentaFormModal";
import { NotaCard } from "./NotaCard";

export function ApoioPage() {
  const { data: ferramentas } = useFerramentas();
  const { data: notas } = useNotas();
  const criarNota = useCriarNota();

  const [modalFerramenta, setModalFerramenta] = useState(false);
  const [editandoFerramenta, setEditandoFerramenta] = useState<Ferramenta | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Caixa de ferramentas"
          subtitle="Atalhos para o que você usa todo dia"
          action={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setModoEdicao((v) => !v)}
                title="Editar/excluir ferramentas"
              >
                <Settings2 className="size-4" /> {modoEdicao ? "Pronto" : "Editar"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { setEditandoFerramenta(null); setModalFerramenta(true); }}
              >
                <Plus className="size-4" /> Ferramenta
              </Button>
            </div>
          }
        />
        {(ferramentas ?? []).length === 0 ? (
          <EmptyState
            icon="🧰"
            title="Nenhuma ferramenta"
            message="Adicione links rápidos: Qconcursos, Google AI Studio, PDF do edital…"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(ferramentas ?? []).map((f) =>
              modoEdicao ? (
                <button
                  key={f.id}
                  onClick={() => { setEditandoFerramenta(f); setModalFerramenta(true); }}
                  className="flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-gold/50 bg-navy-800/80 px-4 py-3.5 text-left transition-all hover:border-gold"
                >
                  <span className="text-2xl">{f.icone ?? "🔗"}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-txt">{f.titulo}</span>
                    <span className="block text-[10px] text-gold">clique para editar</span>
                  </span>
                </button>
              ) : (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-card border border-line/60 bg-navy-800/80 px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_6px_18px_rgb(0_0_0/0.3)]"
                >
                  <span className="text-2xl">{f.icone ?? "🔗"}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-txt">{f.titulo}</span>
                    <span className="block truncate text-[10px] text-mut">
                      {f.url.replace(/^https?:\/\/(www\.)?/, "")}
                    </span>
                  </span>
                </a>
              )
            )}
          </div>
        )}
      </div>

      <div>
        <PageHeader
          title="Notas e reflexões"
          subtitle="Pensamentos, motivações e insights da sua preparação — salvam sozinhas"
          action={
            <Button size="sm" onClick={() => criarNota.mutate()} loading={criarNota.isPending}>
              <Plus className="size-4" /> Nova nota
            </Button>
          }
        />
        {(notas ?? []).length === 0 ? (
          <EmptyState
            icon="💭"
            title="Nenhuma nota ainda"
            message={'"A aprovação é construída nos dias em que você não está com vontade." Anote o que te move.'}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(notas ?? []).map((n) => (
              <NotaCard key={n.id} nota={n} />
            ))}
          </div>
        )}
      </div>

      <FerramentaFormModal
        open={modalFerramenta}
        onClose={() => setModalFerramenta(false)}
        ferramenta={editandoFerramenta}
      />
    </div>
  );
}
