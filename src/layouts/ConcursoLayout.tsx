import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useOutletContext, useParams } from "react-router";
import {
  BookOpen,
  Check,
  ChevronRight,
  ChevronsUpDown,
  Info,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  PenLine,
  Printer,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import type { Concurso } from "@/types/db";
import { concursoDeEstudo, useConcurso } from "@/api/concursos";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { useContagemImpressao } from "@/api/topicoQuestoes";
import { useResumoAnkiFaltam } from "@/api/questoesAnki";
import { supabase } from "@/lib/supabase";
import { setConcursoAtual } from "@/lib/currentConcurso";
import { diasAte, fmtData, fmtMesesSemanasAte } from "@/lib/dates";
import { progressoMateria, topicosDoConcurso } from "@/lib/progresso";
import { ProgressBar } from "@/components/ProgressBar";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { StreakBadge } from "@/features/metas/StreakBadge";

interface Ctx {
  concurso: Concurso;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConcursoAtual(): Concurso {
  return useOutletContext<Ctx>().concurso;
}

// `curto`: rótulo da aba do celular quando o nome inteiro não cabe na coluna.
const NAV: { to: string; label: string; curto?: string; icon: LucideIcon; end: boolean; novaAba?: boolean }[] = [
  { to: ".", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "conteudos", label: "Conteúdos", icon: BookOpen, end: false },
  // modo misturado: todas as questões do site, em aba própria como o caderno
  { to: "/questoes", label: "Questões", icon: Shuffle, end: false, novaAba: true },
  // questões marcadas (a caixinha 🖨 do card): folha para imprimir + correção, em aba própria
  { to: "/impressao", label: "Impressão", icon: Printer, end: false, novaAba: true },
  // o "Adicionar ao resumo" em quadradinhos: o que já foi e o que falta ir pro Anki, em aba própria
  { to: "/resumo", label: "Resumo", icon: LayoutGrid, end: false, novaAba: true },
  // treino de redação no padrão Cebraspe, um parágrafo por vez, em aba própria
  { to: "/redacao", label: "Redação", icon: PenLine, end: false, novaAba: true },
  { to: "informacoes", label: "Informações", curto: "Info", icon: Info, end: false },
];

export function ConcursoLayout() {
  const { concursoId } = useParams();
  const { concurso, concursos, isLoading } = useConcurso(concursoId);
  const location = useLocation();
  const [switcherAberto, setSwitcherAberto] = useState(false);
  const [conteudosAberto, setConteudosAberto] = useState(() =>
    location.pathname.includes("/conteudos")
  );

  const { data: materias } = useMaterias();
  const { data: vinculos } = useConcursoMaterias();
  const { data: topicos } = useTopicos();
  // Quantas questões esperam na "Impressão" e quantas do resumo faltam ir pro Anki —
  // os numerozinhos ao lado dos itens.
  const { data: marcadasImpressao } = useContagemImpressao();
  const { data: faltamNoAnki } = useResumoAnkiFaltam();
  const contagemDaAba: Record<string, { n: number; titulo: string } | undefined> = {
    "/impressao": marcadasImpressao
      ? {
          n: marcadasImpressao,
          titulo: `${marcadasImpressao} ${
            marcadasImpressao === 1 ? "questão marcada" : "questões marcadas"
          } para impressão`,
        }
      : undefined,
    "/resumo": faltamNoAnki
      ? {
          n: faltamNoAnki,
          titulo: `${faltamNoAnki} ${
            faltamNoAnki === 1 ? "questão do resumo falta" : "questões do resumo faltam"
          } ir pro Anki`,
        }
      : undefined,
  };

  // Matérias do concurso ativo, na ordem do edital, com progresso para o submenu.
  const materiasDoConcurso = useMemo(() => {
    // Cada concurso conta só o recorte de assuntos do seu edital (topicos_incluidos).
    const tops = concurso ? topicosDoConcurso(topicos ?? [], concurso, vinculos ?? []) : [];
    return (vinculos ?? [])
      .filter((v) => v.concurso_id === concurso?.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((v) => {
        const materia = (materias ?? []).find((m) => m.id === v.materia_id);
        if (!materia) return null;
        return {
          vinculoId: v.id,
          materia,
          riscada: v.riscada,
          progresso: progressoMateria(materia.id, tops, new Set(v.topicos_riscados ?? [])),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [vinculos, materias, topicos, concurso]);

  // Só lembra como "atual" um concurso que dá para estudar. Um arquivado (PMAL,
  // Indefinido) nunca vira o atual — senão a rota "/" despejava o aluno de volta
  // nele na próxima visita.
  useEffect(() => {
    if (concurso && concurso.status !== "arquivado") setConcursoAtual(concurso.id);
  }, [concurso?.id, concurso?.status]);

  if (isLoading) return <FullScreenSpinner />;
  // Concurso arquivado não é estudável: manda para o concurso de estudo (o ativo).
  if (concurso && concurso.status === "arquivado") {
    const destino = concursoDeEstudo(concursos ?? []);
    return <Navigate to={destino ? `/concurso/${destino.id}` : "/concursos"} replace />;
  }
  if (!concurso) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon="🔍"
          title="Concurso não encontrado"
          message="Ele pode ter sido excluído."
          action={
            <Link to="/concursos" className="text-sm font-semibold text-gold hover:underline">
              Ver meus concursos
            </Link>
          }
        />
      </div>
    );
  }

  const cor = concurso.cor;
  const dias = concurso.data_prova ? diasAte(concurso.data_prova) : null;
  const outros = (concursos ?? []).filter((c) => c.status !== "arquivado");
  const materiaAtiva = location.pathname.match(/\/conteudos\/([^/?#]+)/)?.[1] ?? null;

  const itemDesktop = (isActive: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
      isActive ? "" : "text-dim hover:bg-navy-700/60 hover:text-txt"
    }`;
  // Ativo: faixa na cor do concurso que some para a direita + fio de luz à esquerda.
  const estiloAtivo = (isActive: boolean) =>
    isActive
      ? {
          background: `linear-gradient(90deg, ${cor}2e, ${cor}0a)`,
          color: cor,
          boxShadow: `inset 3px 0 0 ${cor}`,
        }
      : undefined;

  // Abas do celular: uma coluna por item, ícone em cima e rótulo curto embaixo.
  const itemMobile =
    "relative flex min-w-0 flex-col items-center justify-center gap-1 whitespace-nowrap pb-2 pt-2 text-[10px] font-semibold leading-none tracking-tight transition-colors";
  const abasMobile = NAV.map(({ to, label, curto, icon: Icon, end, novaAba }) => {
    if (novaAba) {
      const contagem = contagemDaAba[to];
      return (
        <a key={to} href={to} target="_blank" rel="noreferrer" className={`${itemMobile} text-dim`}>
          <span className="relative px-3 py-1">
            <Icon className="size-5" />
            {/* O numerozinho (Impressão, Resumo), como no menu do computador */}
            {contagem && (
              <span
                className="absolute -top-0.5 right-0 min-w-4 rounded-full bg-gold px-1 text-center text-[9px] font-bold leading-4 tabular-nums text-navy-950"
                title={contagem.titulo}
              >
                {contagem.n > 99 ? "99+" : contagem.n}
              </span>
            )}
          </span>
          {curto ?? label}
        </a>
      );
    }
    return (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={() => setSwitcherAberto(false)}
        className={({ isActive }) => `${itemMobile} ${isActive ? "" : "text-dim"}`}
        style={({ isActive }) => (isActive ? { color: cor } : undefined)}
      >
        {({ isActive }) => (
          <>
            <span
              className="rounded-full px-3 py-1 transition-colors"
              style={isActive ? { background: `${cor}24` } : undefined}
            >
              <Icon className="size-5" />
            </span>
            {curto ?? label}
          </>
        )}
      </NavLink>
    );
  });

  return (
    <div className="min-h-dvh md:flex">
      {/* ===== Sidebar desktop — 100% sobre o concurso ativo ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line/40 bg-gradient-to-b from-navy-900/95 to-navy-950/95 backdrop-blur-xl md:flex">
        {/* marca do site */}
        <Link
          to="/concursos"
          className="flex items-center gap-2 px-5 pb-1 pt-4 text-[13px] font-extrabold tracking-tight text-txt transition-colors hover:text-gold"
          title="Meus concursos"
        >
          <span className="text-base">🎯</span> Meus Estudos
        </Link>

        {/* seletor de concurso + contagem até a prova, tudo numa caixinha só */}
        <div className="relative px-3 pt-2">
          <div
            className="overflow-hidden rounded-2xl border border-line/50 bg-navy-800/70 shadow-card"
            style={{ backgroundImage: `radial-gradient(120% 90% at 100% 0%, ${cor}24, transparent 62%)` }}
          >
            <button
              onClick={() => setSwitcherAberto((v) => !v)}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-navy-700/40"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{
                  background: `linear-gradient(135deg, ${cor}3d, ${cor}14)`,
                  boxShadow: `inset 0 0 0 1px ${cor}38`,
                }}
              >
                {concurso.icone}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-mut">
                  Concurso
                </span>
                <span className="block truncate text-sm font-bold leading-tight text-txt">
                  {concurso.nome_curto ?? concurso.nome}
                </span>
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-mut" />
            </button>

            {/* contagem até a prova em destaque; a sequência 🔥 logo abaixo */}
            <div className="border-t border-line/40 px-3.5 pb-3 pt-2.5">
              {dias === null ? (
                <p className="text-[11px] text-mut">Sem data de prova</p>
              ) : dias >= 0 ? (
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-[30px] font-extrabold leading-none tabular-nums"
                    style={{ color: cor, textShadow: `0 0 18px ${cor}55` }}
                  >
                    {dias}
                  </span>
                  <span className="min-w-0 text-[11px] leading-tight">
                    <span className="block whitespace-nowrap font-semibold text-dim">
                      {dias === 1 ? "dia" : "dias"} para a prova
                    </span>
                    <span className="block text-mut">{fmtData(concurso.data_prova)}</span>
                  </span>
                </div>
              ) : (
                <p className="text-xs font-semibold text-dim">
                  Prova realizada · {fmtData(concurso.data_prova)}
                </p>
              )}
              {dias !== null && dias > 0 && (
                // quebra no "·" (nunca no meio de "22 semanas e 2 dias")
                <p className="mt-2 flex flex-wrap gap-x-1 text-[11px] leading-snug text-mut">
                  {fmtMesesSemanasAte(concurso.data_prova!)
                    .split(" · ")
                    .map((parte, i) => (
                      <span key={parte} className="whitespace-nowrap">
                        {i > 0 && "· "}
                        {parte}
                      </span>
                    ))}
                </p>
              )}
              <div className="mt-2.5 flex">
                <StreakBadge compact />
              </div>
            </div>
          </div>

          {switcherAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSwitcherAberto(false)} />
              <div className="animar-surgir absolute inset-x-3 z-20 mt-1 rounded-xl border border-line bg-navy-700 p-1 shadow-pop">
                {outros.map((c) => (
                  <Link
                    key={c.id}
                    to={`/concurso/${c.id}`}
                    onClick={() => setSwitcherAberto(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-navy-600"
                  >
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-sm"
                      style={{ background: `${c.cor}1a` }}
                    >
                      {c.icone}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-txt">
                      {c.nome_curto ?? c.nome}
                    </span>
                    {c.id === concurso.id && <Check className="size-4 shrink-0 text-gold" />}
                  </Link>
                ))}
                <div className="my-1 border-t border-line/50" />
                <Link
                  to="/concursos"
                  onClick={() => setSwitcherAberto(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-dim transition-colors hover:bg-navy-600 hover:text-txt"
                >
                  <LayoutGrid className="size-4" /> Gerenciar concursos
                </Link>
              </div>
            </>
          )}
        </div>

        <nav className="scrollbar-thin mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end, novaAba }) => {
            if (novaAba) {
              const contagem = contagemDaAba[to];
              return (
                <a
                  key={to}
                  href={to}
                  target="_blank"
                  rel="noreferrer"
                  className={itemDesktop(false)}
                >
                  <Icon className="size-4.5" />
                  {label}
                  {contagem && (
                    <span
                      className="ml-auto rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums text-gold"
                      title={contagem.titulo}
                    >
                      {contagem.n}
                    </span>
                  )}
                </a>
              );
            }
            if (to !== "conteudos") {
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setSwitcherAberto(false)}
                  className={({ isActive }) => itemDesktop(isActive)}
                  style={({ isActive }) => estiloAtivo(isActive)}
                >
                  <Icon className="size-4.5" />
                  {label}
                </NavLink>
              );
            }
            // "Conteúdos" com submenu de matérias
            return (
              <div key={to}>
                <div className="flex items-center gap-1">
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => {
                      setSwitcherAberto(false);
                      setConteudosAberto(true);
                    }}
                    className={({ isActive }) => `${itemDesktop(isActive)} min-w-0 flex-1`}
                    style={({ isActive }) => estiloAtivo(isActive)}
                  >
                    <Icon className="size-4.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                  {materiasDoConcurso.length > 0 && (
                    <button
                      onClick={() => setConteudosAberto((v) => !v)}
                      className="shrink-0 cursor-pointer rounded-lg p-1.5 text-mut transition-colors hover:bg-navy-700/70 hover:text-txt"
                      aria-label={conteudosAberto ? "Recolher matérias" : "Expandir matérias"}
                      aria-expanded={conteudosAberto}
                    >
                      <ChevronRight
                        className={`size-4 transition-transform ${conteudosAberto ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {conteudosAberto && materiasDoConcurso.length > 0 && (
                  <ul className="animar-surgir mb-1 ml-5 mt-1 space-y-0.5 border-l border-line/40 pl-2">
                    {materiasDoConcurso.map(({ vinculoId, materia, progresso, riscada }) => {
                      const ativa = materiaAtiva === materia.id;
                      return (
                        <li key={vinculoId}>
                          <Link
                            to={`conteudos/${materia.id}`}
                            onClick={() => setSwitcherAberto(false)}
                            className={`group flex flex-col gap-1 rounded-lg px-2.5 py-1.5 transition-colors ${
                              ativa ? "bg-navy-700/60" : "hover:bg-navy-700/50"
                            }`}
                            style={ativa ? { boxShadow: `inset 2px 0 0 ${cor}` } : undefined}
                            title={
                              riscada
                                ? `${materia.nome} — riscada (fora do edital)`
                                : `${materia.nome} — ${progresso.concluidos}/${progresso.total} tópicos`
                            }
                          >
                            <span className="flex items-center gap-1.5">
                              <span className={`shrink-0 text-sm ${riscada ? "opacity-50" : ""}`}>
                                {materia.icone}
                              </span>
                              <span
                                className={`min-w-0 flex-1 truncate text-xs ${
                                  riscada
                                    ? "text-mut line-through decoration-red/50"
                                    : ativa
                                      ? "text-txt"
                                      : "text-dim group-hover:text-txt"
                                }`}
                              >
                                {materia.nome}
                              </span>
                              {!riscada && (
                                <span
                                  className={`shrink-0 text-[10px] font-semibold tabular-nums ${
                                    ativa ? "" : "text-mut"
                                  }`}
                                  style={ativa ? { color: cor } : undefined}
                                >
                                  {progresso.total === 0 ? "—" : `${progresso.pct}%`}
                                </span>
                              )}
                            </span>
                            {!riscada && <ProgressBar value={progresso.pct} color={cor} size="sm" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* última opção do menu: sair */}
        <div className="border-t border-line/40 p-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:bg-red/10 hover:text-red"
          >
            <LogOut className="size-4.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* ===== Topo mobile ===== */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line/40 bg-navy-900/85 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] backdrop-blur-xl md:hidden">
        <Link to="/concursos" className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base"
            style={{
              background: `linear-gradient(135deg, ${cor}3d, ${cor}14)`,
              boxShadow: `inset 0 0 0 1px ${cor}38`,
            }}
          >
            {concurso.icone}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-sm font-bold text-txt">
              <span className="truncate">{concurso.nome_curto ?? concurso.nome}</span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-mut" />
            </span>
            {dias !== null && dias >= 0 && (
              <span className="block text-[10px] text-mut">
                <strong className="font-bold" style={{ color: cor }}>
                  {dias}
                </strong>{" "}
                dias p/ prova
              </span>
            )}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <StreakBadge />
          <button
            onClick={() => supabase.auth.signOut()}
            className="-mr-2 cursor-pointer rounded-lg p-2 text-mut hover:text-red"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* ===== Conteúdo ===== */}
      <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:ml-60 md:pb-8">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:py-8">
          <Outlet context={{ concurso } satisfies Ctx} />
        </div>
      </main>

      {/* ===== Tab bar mobile — uma coluna por item (sem sobrar espaço vazio) ===== */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-line/40 bg-navy-900/85 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }}
      >
        {abasMobile}
      </nav>
    </div>
  );
}
