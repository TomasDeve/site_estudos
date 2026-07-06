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
      // tudo abaixo vive dentro do concurso ativo
      {
        path: "concurso/:concursoId",
        element: <ConcursoLayout />,
        children: [
          { index: true, element: pagina(<DashboardPage />) },
          { path: "conteudos", element: pagina(<ConteudosPage />) },
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
