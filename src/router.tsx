import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { LoginPage } from "@/auth/LoginPage";
import { RequireAuth } from "@/auth/RequireAuth";
import { ConcursoLayout } from "@/layouts/ConcursoLayout";
import { EntryRedirect } from "@/features/home/EntryRedirect";
import { FullScreenSpinner } from "@/components/Spinner";

// páginas em chunks separados: recharts (Painel) só baixa quando abre
const HomePage = lazy(() => import("@/features/home/HomePage").then((m) => ({ default: m.HomePage })));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ConteudosPage = lazy(() => import("@/features/conteudos/ConteudosPage").then((m) => ({ default: m.ConteudosPage })));
const MateriaPage = lazy(() => import("@/features/conteudos/MateriaPage").then((m) => ({ default: m.MateriaPage })));
const TextoLeiPage = lazy(() => import("@/features/conteudos/TextoLeiPage").then((m) => ({ default: m.TextoLeiPage })));
const QuestoesPage = lazy(() => import("@/features/conteudos/QuestoesPage").then((m) => ({ default: m.QuestoesPage })));
const QuestoesMistasPage = lazy(() => import("@/features/conteudos/QuestoesMistasPage").then((m) => ({ default: m.QuestoesMistasPage })));
const AudiosPage = lazy(() => import("@/features/audios/AudiosPage").then((m) => ({ default: m.AudiosPage })));
const BancoQuestoesPage = lazy(() => import("@/features/banco/BancoQuestoesPage").then((m) => ({ default: m.BancoQuestoesPage })));
const InformacoesPage = lazy(() => import("@/features/informacoes/InformacoesPage").then((m) => ({ default: m.InformacoesPage })));
const RotinaPage = lazy(() => import("@/features/rotina/RotinaPage").then((m) => ({ default: m.RotinaPage })));
const ImpressaoPage = lazy(() => import("@/features/impressao/ImpressaoPage").then((m) => ({ default: m.ImpressaoPage })));

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
      // todas as questões do site misturadas (abre em aba própria, sem sidebar)
      { path: "questoes", element: pagina(<QuestoesMistasPage />) },
      // questões de uma matéria inteira misturadas (aba própria, sem sidebar)
      { path: "questoes/materia/:materiaId", element: pagina(<QuestoesMistasPage />) },
      // caderno de questões por IA de um assunto (abre em aba própria, sem sidebar)
      { path: "questoes/:topicoId", element: pagina(<QuestoesPage />) },
      // banco de questões reais: capturar do QConcursos, tratar e mapear ao edital
      { path: "banco", element: pagina(<BancoQuestoesPage />) },
      // questões marcadas para impressão: folha pronta + correção (aba própria, sem sidebar)
      { path: "impressao", element: pagina(<ImpressaoPage />) },
      // tudo abaixo vive dentro do concurso ativo
      {
        path: "concurso/:concursoId",
        element: <ConcursoLayout />,
        children: [
          { index: true, element: pagina(<DashboardPage />) },
          { path: "conteudos", element: pagina(<ConteudosPage />) },
          { path: "conteudos/:materiaId", element: pagina(<MateriaPage />) },
          // seções removidas (Metas virou o plano do Painel; Ciclo e Métricas saíram): link salvo cai no Painel
          { path: "metas", element: <Navigate to=".." replace /> },
          { path: "ciclo", element: <Navigate to=".." replace /> },
          { path: "metricas/*", element: <Navigate to=".." replace /> },
          { path: "audios", element: pagina(<AudiosPage />) },
          // rotina diária: os horários fixos (acordar, estudar, parar, academia, dormir)
          { path: "rotina", element: pagina(<RotinaPage />) },
          // ficha do edital: vagas, datas, divisão da prova, TAF, requisitos
          { path: "informacoes", element: pagina(<InformacoesPage />) },
        ],
      },
    ],
  },
]);
