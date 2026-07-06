import { Navigate } from "react-router";
import { useConcursos } from "@/api/concursos";
import { getConcursoAtual } from "@/lib/currentConcurso";
import { FullScreenSpinner } from "@/components/Spinner";

/**
 * Rota "/" — manda o usuário direto para o concurso que ele está estudando:
 * o último aberto, ou o que está marcado como "ativo", ou o primeiro da lista.
 * Sem nenhum concurso, vai para o hub de gerenciamento.
 */
export function EntryRedirect() {
  const { data: concursos, isLoading } = useConcursos();
  if (isLoading) return <FullScreenSpinner />;

  const lista = concursos ?? [];
  if (lista.length === 0) return <Navigate to="/concursos" replace />;

  const salvo = getConcursoAtual();
  const atual =
    lista.find((c) => c.id === salvo) ??
    lista.find((c) => c.status === "ativo") ??
    lista[0];

  return <Navigate to={`/concurso/${atual.id}`} replace />;
}
