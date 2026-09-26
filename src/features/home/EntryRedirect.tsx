import { Navigate } from "react-router";
import { concursoDeEstudo, useConcursos } from "@/api/concursos";
import { getConcursoAtual } from "@/lib/currentConcurso";
import { FullScreenSpinner } from "@/components/Spinner";

/**
 * Rota "/" — manda o usuário direto para o concurso que ele está estudando:
 * o último aberto (desde que esteja ATIVO), senão o ativo. Um id salvo apontando
 * para um concurso pausado ("futuro", ex.: PC AL depois da troca para a PC PE) ou
 * arquivado é ignorado, para não despejar o aluno num concurso fora de foco. Sem
 * concurso estudável, vai para o hub de gerenciamento.
 */
export function EntryRedirect() {
  const { data: concursos, isLoading } = useConcursos();
  if (isLoading) return <FullScreenSpinner />;

  const lista = concursos ?? [];
  if (lista.length === 0) return <Navigate to="/concursos" replace />;

  const salvo = getConcursoAtual();
  const atual =
    lista.find((c) => c.id === salvo && c.status === "ativo") ??
    concursoDeEstudo(lista);

  if (!atual) return <Navigate to="/concursos" replace />;
  return <Navigate to={`/concurso/${atual.id}`} replace />;
}
