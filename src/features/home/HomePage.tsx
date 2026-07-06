import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, LogOut, Plus } from "lucide-react";
import type { Concurso } from "@/types/db";
import { useConcursos } from "@/api/concursos";
import { useConcursoMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { progressoConcurso } from "@/lib/progresso";
import { getConcursoAtual } from "@/lib/currentConcurso";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { FullScreenSpinner } from "@/components/Spinner";
import { ConcursoCard } from "./ConcursoCard";
import { ConcursoFormModal } from "./ConcursoFormModal";
import { SeedCard } from "./SeedCard";

/** Hub de gerenciamento em /concursos: escolher, criar, editar e arquivar concursos. */
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

  const atualId = useMemo(() => {
    const salvo = getConcursoAtual();
    return (concursos ?? []).some((c) => c.id === salvo) ? salvo : null;
  }, [concursos]);

  if (l1 || l2 || l3) return <FullScreenSpinner />;

  const ativos = (concursos ?? []).filter((c) => c.status !== "arquivado");
  const arquivados = (concursos ?? []).filter((c) => c.status === "arquivado");

  function abrirEdicao(c: Concurso) {
    setEditando(c);
    setModalAberto(true);
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line/50 bg-navy-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-sm font-bold leading-tight">Meus Estudos</p>
              <p className="text-[11px] text-mut">Todos os concursos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {atualId && (
              <Link to={`/concurso/${atualId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="size-4" /> Voltar ao estudo
                </Button>
              </Link>
            )}
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-dim transition-colors hover:bg-navy-700 hover:text-red"
            >
              <LogOut className="size-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8">
        <PageHeader
          title="Meus concursos"
          subtitle="Escolha um concurso para mergulhar no estudo dele"
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
      </main>

      <ConcursoFormModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        concurso={editando}
      />
    </div>
  );
}
