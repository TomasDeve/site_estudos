import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Concurso } from "@/types/db";
import { useConcursos } from "@/api/concursos";
import { useConcursoMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { progressoConcurso } from "@/lib/progresso";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { FullScreenSpinner } from "@/components/Spinner";
import { ConcursoCard } from "./ConcursoCard";
import { ConcursoFormModal } from "./ConcursoFormModal";
import { SeedCard } from "./SeedCard";

export function HomePage() {
  const { data: concursos, isLoading: l1 } = useConcursos();
  const { data: vinculos, isLoading: l2 } = useConcursoMaterias();
  const { data: topicos, isLoading: l3 } = useTopicos();

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Concurso | null>(null);

  const pcts = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of concursos ?? []) {
      mapa.set(c.id, progressoConcurso(c.id, vinculos ?? [], topicos ?? []).pct);
    }
    return mapa;
  }, [concursos, vinculos, topicos]);

  if (l1 || l2 || l3) return <FullScreenSpinner />;

  const ativos = (concursos ?? []).filter((c) => c.status !== "arquivado");
  const arquivados = (concursos ?? []).filter((c) => c.status === "arquivado");

  function abrirEdicao(c: Concurso) {
    setEditando(c);
    setModalAberto(true);
  }

  return (
    <div>
      <PageHeader
        title="Meus concursos"
        subtitle="Escolha um concurso para abrir o painel dele"
        action={
          <Button
            onClick={() => {
              setEditando(null);
              setModalAberto(true);
            }}
          >
            <Plus className="size-4" /> Novo concurso
          </Button>
        }
      />

      {ativos.length === 0 && arquivados.length === 0 ? (
        <SeedCard />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {ativos.map((c) => (
              <ConcursoCard
                key={c.id}
                concurso={c}
                pct={pcts.get(c.id) ?? 0}
                onEdit={abrirEdicao}
              />
            ))}
          </div>

          {arquivados.length > 0 && (
            <details className="mt-8">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-mut hover:text-dim">
                Arquivados ({arquivados.length})
              </summary>
              <div className="mt-3 grid gap-4 opacity-70 sm:grid-cols-2">
                {arquivados.map((c) => (
                  <ConcursoCard
                    key={c.id}
                    concurso={c}
                    pct={pcts.get(c.id) ?? 0}
                    onEdit={abrirEdicao}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      <ConcursoFormModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        concurso={editando}
      />
    </div>
  );
}
