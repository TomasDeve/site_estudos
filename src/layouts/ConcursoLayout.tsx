import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useOutletContext, useParams } from "react-router";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  ChevronsUpDown,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Repeat,
  Shuffle,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Concurso } from "@/types/db";
import { useConcurso } from "@/api/concursos";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthProvider";
import { setConcursoAtual } from "@/lib/currentConcurso";
import { diasAte, fmtData } from "@/lib/dates";
import { progressoMateria } from "@/lib/progresso";
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

const NAV: { to: string; label: string; icon: LucideIcon; end: boolean; novaAba?: boolean }[] = [
  { to: ".", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "conteudos", label: "Conteúdos", icon: BookOpen, end: false },
  // modo misturado: todas as questões do site, em aba própria como o caderno
  { to: "/questoes", label: "Questões", icon: Shuffle, end: false, novaAba: true },
  { to: "ciclo", label: "Ciclo", icon: Repeat, end: false },
  { to: "metas", label: "Metas", icon: CalendarCheck, end: false },
  { to: "metricas", label: "Métricas", icon: BarChart3, end: false },
  { to: "apoio", label: "Apoio", icon: Wrench, end: false },
];

export function ConcursoLayout() {
  const { concursoId } = useParams();
  const { concurso, concursos, isLoading } = useConcurso(concursoId);
  const { session } = useAuth();
  const location = useLocation();
  const [switcherAberto, setSwitcherAberto] = useState(false);
  const [conteudosAberto, setConteudosAberto] = useState(() =>
    location.pathname.includes("/conteudos")
  );

  const { data: materias } = useMaterias();
  const { data: vinculos } = useConcursoMaterias();
  const { data: topicos } = useTopicos();

  // Matérias do concurso ativo, na ordem do edital, com progresso para o submenu.
  const materiasDoConcurso = useMemo(() => {
    return (vinculos ?? [])
      .filter((v) => v.concurso_id === concurso?.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((v) => {
        const materia = (materias ?? []).find((m) => m.id === v.materia_id);
        if (!materia) return null;
        return { vinculoId: v.id, materia, progresso: progressoMateria(materia.id, topicos ?? []) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [vinculos, materias, topicos, concurso?.id]);

  useEffect(() => {
    if (concursoId) setConcursoAtual(concursoId);
  }, [concursoId]);

  if (isLoading) return <FullScreenSpinner />;
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
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? "" : "text-dim hover:bg-navy-700/70 hover:text-txt"
    }`;
  const estiloAtivo = (isActive: boolean) =>
    isActive ? { background: `${cor}1f`, color: cor } : undefined;

  const navLink = (mobile: boolean) =>
    NAV.map(({ to, label, icon: Icon, end, novaAba }) => {
      if (novaAba) {
        return (
          <a
            key={to}
            href={to}
            target="_blank"
            rel="noreferrer"
            className={
              mobile
                ? "flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-dim transition-colors"
                : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:bg-navy-700/70 hover:text-txt"
            }
          >
            <Icon className={mobile ? "size-5" : "size-4.5"} />
            {label}
          </a>
        );
      }
      return (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setSwitcherAberto(false)}
          className={({ isActive }) =>
            mobile
              ? `flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? "" : "text-dim"
                }`
              : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "" : "text-dim hover:bg-navy-700/70 hover:text-txt"
                }`
          }
          style={({ isActive }) =>
            isActive
              ? mobile
                ? { color: cor }
                : { background: `${cor}1f`, color: cor }
              : undefined
          }
        >
          <Icon className={mobile ? "size-5" : "size-4.5"} />
          {label}
        </NavLink>
      );
    });

  return (
    <div className="min-h-dvh md:flex">
      {/* ===== Sidebar desktop — 100% sobre o concurso ativo ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line/50 bg-navy-900/90 md:flex">
        {/* seletor de concurso */}
        <div className="relative px-3 pt-4">
          <button
            onClick={() => setSwitcherAberto((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-line/60 bg-navy-800 px-3 py-2.5 text-left transition-colors hover:border-line"
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{ background: `${cor}1a` }}
            >
              {concurso.icone}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-txt">
                {concurso.nome_curto ?? concurso.nome}
              </span>
              <span className="block truncate text-[11px] text-mut">
                {concurso.banca ?? concurso.orgao ?? "concurso"}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-mut" />
          </button>

          {switcherAberto && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSwitcherAberto(false)} />
              <div className="absolute inset-x-3 z-20 mt-1 rounded-xl border border-line bg-navy-700 p-1 shadow-2xl">
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

        {/* dias para a prova + sequência */}
        <div className="px-4 pb-1 pt-3">
          {dias !== null && (
            <p className="text-[11px] text-dim">
              {dias >= 0 ? (
                <>
                  <strong className="font-bold" style={{ color: cor }}>
                    {dias}
                  </strong>{" "}
                  {dias === 1 ? "dia" : "dias"} para a prova
                </>
              ) : (
                "prova realizada"
              )}
              <span className="text-mut"> · {fmtData(concurso.data_prova)}</span>
            </p>
          )}
          <div className="mt-2.5">
            <StreakBadge />
          </div>
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map(({ to, label, icon: Icon, end, novaAba }) => {
            if (novaAba) {
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
                  <ul className="mb-1 ml-5 mt-1 space-y-0.5 border-l border-line/40 pl-2">
                    {materiasDoConcurso.map(({ vinculoId, materia, progresso }) => {
                      const ativa = materiaAtiva === materia.id;
                      return (
                        <li key={vinculoId}>
                          <Link
                            to={`conteudos/${materia.id}`}
                            onClick={() => setSwitcherAberto(false)}
                            className={`group flex flex-col gap-1 rounded-lg px-2.5 py-1.5 transition-colors ${
                              ativa ? "bg-navy-700/60" : "hover:bg-navy-700/50"
                            }`}
                            title={`${materia.nome} — ${progresso.concluidos}/${progresso.total} tópicos`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="shrink-0 text-sm">{materia.icone}</span>
                              <span
                                className={`min-w-0 flex-1 truncate text-xs ${
                                  ativa ? "text-txt" : "text-dim group-hover:text-txt"
                                }`}
                              >
                                {materia.nome}
                              </span>
                              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-mut">
                                {progresso.total === 0 ? "—" : `${progresso.pct}%`}
                              </span>
                            </span>
                            <ProgressBar value={progresso.pct} color={cor} size="sm" />
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

        <div className="border-t border-line/40 px-4 py-4">
          <p className="truncate text-[11px] text-mut">{session?.user.email}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-dim transition-colors hover:text-red"
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </aside>

      {/* ===== Topo mobile ===== */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line/50 bg-navy-900/95 px-4 py-2.5 backdrop-blur md:hidden">
        <Link to="/concursos" className="flex min-w-0 items-center gap-2">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-base"
            style={{ background: `${cor}1a` }}
          >
            {concurso.icone}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-sm font-bold text-txt">
              <span className="truncate">{concurso.nome_curto ?? concurso.nome}</span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-mut" />
            </span>
            {dias !== null && dias >= 0 && (
              <span className="block text-[10px] text-mut">{dias} dias p/ prova</span>
            )}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <StreakBadge />
          <button
            onClick={() => supabase.auth.signOut()}
            className="cursor-pointer p-1 text-mut hover:text-red"
            aria-label="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* ===== Conteúdo ===== */}
      <main className="min-w-0 flex-1 pb-20 md:ml-60 md:pb-8">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:py-8">
          <Outlet context={{ concurso } satisfies Ctx} />
        </div>
      </main>

      {/* ===== Tab bar mobile ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-line/50 bg-navy-900/95 backdrop-blur md:hidden">
        {navLink(true)}
      </nav>
    </div>
  );
}
