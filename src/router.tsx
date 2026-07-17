import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router";
import { LoginPage } from "@/auth/LoginPage";
import { RequireAuth } from "@/auth/RequireAuth";
import { ConcursoLayout } from "@/layouts/ConcursoLayout";
import { EntryRedirect } from "@/features/home/EntryRedirect";
import { FullScreenSpinner } from "@/components/Spinner";

// páginas em chunks separados: recharts (Painel/Métricas) só baixa quando abre
const HomePage = lazy(() => import("@/features/home/HomePage").then((m) => ({ default: m.HomePage })));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ConteudosPage = lazy(() => import("@/features/conteudos/ConteudosPage").then((m) => ({ default: m.ConteudosPage })));
const MateriaPage = lazy(() => import("@/features/conteudos/MateriaPage").then((m) => ({ default: m.MateriaPage })));
const TextoLeiPage = lazy(() => import("@/features/conteudos/TextoLeiPage").then((m) => ({ default: m.TextoLeiPage })));
const QuestoesPage = lazy(() => import("@/features/conteudos/QuestoesPage").then((m) => ({ default: m.QuestoesPage })));
const CicloPage = lazy(() => import("@/features/ciclo/CicloPage").then((m) => ({ default: m.CicloPage })));
const MetasPage = lazy(() => import("@/features/metas/MetasPage").then((m) => ({ default: m.MetasPage })));
const MetricasPage = lazy(() => import("@/features/metricas/MetricasPage").then((m) => ({ default: m.MetricasPage })));
const ImportarPage = lazy(() => import("@/features/importar/ImportarPage").then((m) => ({ default: m.ImportarPage })));
const ApoioPage = lazy(() => import("@/features/apoio/ApoioPage").then((m) => ({ default: m.ApoioPage })));

function pagina(node: ReactNode) {
  return <Suspense fallback={<FullScreenSpinner />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      // "/" manda direto para o concurso em estudo (experiência imersiva)
      { index: true, element: <EntryRedirect /> },
      // hub de gerenciamento (escolher/criar/arquivar)
      { path: "concursos", element: pagina(<HomePage />) },
      // leitura imersiva de um texto/resumo (abre em aba própria, sem sidebar)
      { path: "texto/:textoId", element: pagina(<TextoLeiPage />) },
      // caderno de questões por IA de um assunto (abre em aba própria, sem sidebar)
      { path: "questoes/:topicoId", element: pagina(<QuestoesPage />) },
      // tudo abaixo vive dentro do concurso ativo
      {
        path: "concurso/:concursoId",
        element: <ConcursoLayout />,
        children: [
          { index: true, element: pagina(<DashboardPage />) },
          { path: "conteudos", element: pagina(<ConteudosPage />) },
          { path: "conteudos/:materiaId", element: pagina(<MateriaPage />) },
          { path: "ciclo", element: pagina(<CicloPage />) },
          { path: "metas", element: pagina(<MetasPage />) },
          { path: "metricas", element: pagina(<MetricasPage />) },
          { path: "metricas/importar", element: pagina(<ImportarPage />) },
          { path: "apoio", element: pagina(<ApoioPage />) },
        ],
      },
    ],
  },
]);
