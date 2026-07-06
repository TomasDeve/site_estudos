import { NavLink, Outlet, useOutletContext, useParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import type { Concurso } from "@/types/db";
import { useConcurso } from "@/api/concursos";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { diasAte, fmtData } from "@/lib/dates";

interface Ctx {
  concurso: Concurso;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConcursoAtual(): Concurso {
  return useOutletContext<Ctx>().concurso;
}

const abas = [
  { to: ".", label: "Dashboard", end: true },
  { to: "conteudos", label: "Conteúdos", end: false },
];

export function ConcursoLayout() {
  const { concursoId } = useParams();
  const { concurso, isLoading } = useConcurso(concursoId);

  if (isLoading) return <FullScreenSpinner />;
  if (!concurso) {
    return (
      <EmptyState
        icon="🔍"
        title="Concurso não encontrado"
        message="Ele pode ter sido excluído."
        action={
          <Link to="/" className="text-sm font-semibold text-gold hover:underline">
            Voltar para o início
          </Link>
        }
      />
    );
  }

  const dias = concurso.data_prova ? diasAte(concurso.data_prova) : null;

  return (
    <div>
      <div className="mb-5">
        <Link
          to="/"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-mut transition-colors hover:text-dim"
        >
          <ArrowLeft className="size-3.5" /> Todos os concursos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="flex size-12 items-center justify-center rounded-xl text-2xl"
            style={{ background: `${concurso.cor}1a` }}
          >
            {concurso.icone}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight tracking-tight sm:text-xl">
              {concurso.nome}
            </h1>
            <p className="mt-0.5 text-xs text-dim">
              {[concurso.orgao, concurso.banca].filter(Boolean).join(" · ")}
              {concurso.data_prova && (
                <>
                  {" · "}
                  {dias !== null && dias >= 0 ? (
                    <span className="font-semibold" style={{ color: concurso.cor }}>
                      {dias === 0 ? "prova HOJE" : `${dias} ${dias === 1 ? "dia" : "dias"} para a prova`}
                    </span>
                  ) : (
                    "prova realizada"
                  )}{" "}
                  ({fmtData(concurso.data_prova)})
                </>
              )}
            </p>
          </div>
        </div>

        <nav className="mt-4 flex gap-1 border-b border-line/50">
          {abas.map((a) => (
            <NavLink
              key={a.to}
              to={a.to}
              end={a.end}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-gold text-gold"
                    : "border-transparent text-dim hover:border-line hover:text-txt"
                }`
              }
            >
              {a.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet context={{ concurso } satisfies Ctx} />
    </div>
  );
}
