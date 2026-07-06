import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { materiasComuns, progressoConcurso, progressoMateria } from "@/lib/progresso";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { MateriaFormModal } from "./MateriaFormModal";
import { STATUS_INFO } from "./statusInfo";

const NOME_AREA: Record<string, string> = {
  P1: "Conhecimentos Básicos",
  P2: "Conhecimentos Específicos",
  outros: "Outros conteúdos",
};

export function ConteudosPage() {
  const concurso = useConcursoAtual();
  const { data: materias, isLoading: l1 } = useMaterias();
  const { data: vinculos, isLoading: l2 } = useConcursoMaterias();
  const { data: topicos, isLoading: l3 } = useTopicos();

  const [modalMateria, setModalMateria] = useState(false);

  const meusVinculos = useMemo(
    () =>
      (vinculos ?? [])
        .filter((v) => v.concurso_id === concurso.id)
        .sort((a, b) => a.ordem - b.ordem),
    [vinculos, concurso.id]
  );
  const comuns = useMemo(() => materiasComuns(vinculos ?? []), [vinculos]);
  const progresso = useMemo(
    () => progressoConcurso(concurso.id, vinculos ?? [], topicos ?? []),
    [concurso.id, vinculos, topicos]
  );

  if (l1 || l2 || l3) return <FullScreenSpinner />;

  const areas = ["P1", "P2", "outros"].filter((a) => meusVinculos.some((v) => v.area === a));

  return (
    <div className="space-y-6">
      {/* Resumo geral do edital */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-mut">
                Edital verticalizado
              </p>
              <p className="mt-0.5 text-sm text-dim">
                <strong className="text-lg font-bold text-txt">{progresso.concluidos}</strong> de{" "}
                {progresso.total} tópicos concluídos
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-mut">
              {Object.entries(STATUS_INFO).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-full border"
                    style={{
                      borderColor: v.cor,
                      background: k === "nao_estudado" ? "transparent" : v.cor,
                    }}
                  />
                  {v.label}
                </span>
              ))}
            </div>
          </div>
          <ProgressBar
            value={progresso.pct}
            color={concurso.cor}
            size="lg"
            showLabel
            className="mt-3"
          />
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-mut">
          Escolha uma matéria para estudar sem distrações. Matérias{" "}
          <span className="font-bold text-gold">comuns</span> compartilham progresso entre
          concursos.
        </p>
        <Button variant="secondary" size="sm" onClick={() => setModalMateria(true)}>
          <Plus className="size-4" /> Matéria
        </Button>
      </div>

      {meusVinculos.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Nenhuma matéria neste concurso"
          message="Adicione matérias do catálogo ou crie novas para montar o edital verticalizado."
          action={
            <Button onClick={() => setModalMateria(true)}>
              <Plus className="size-4" /> Adicionar matéria
            </Button>
          }
        />
      ) : (
        areas.map((area) => (
          <section key={area}>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-mut">
              {NOME_AREA[area]}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {meusVinculos
                .filter((v) => v.area === area)
                .map((v) => {
                  const materia = (materias ?? []).find((m) => m.id === v.materia_id);
                  if (!materia) return null;
                  const p = progressoMateria(materia.id, topicos ?? []);
                  return (
                    <Link
                      key={v.id}
                      to={`/concurso/${concurso.id}/conteudos/${materia.id}`}
                      className="group flex items-center gap-3.5 rounded-card border border-line/60 bg-navy-800/80 px-4 py-3.5 transition-colors hover:border-line hover:bg-navy-700/50"
                    >
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                        style={{ background: `${concurso.cor}14` }}
                      >
                        {materia.icone}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-txt">{materia.nome}</h3>
                          {comuns.has(materia.id) && (
                            <span
                              className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold"
                              title="Matéria usada em outro concurso: o progresso conta para todos"
                            >
                              Comum
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2.5">
                          <ProgressBar
                            value={p.pct}
                            color={concurso.cor}
                            size="sm"
                            className="flex-1"
                          />
                          <span className="shrink-0 text-[11px] font-medium tabular-nums text-mut">
                            {p.concluidos}/{p.total} · {p.pct}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-mut transition-colors group-hover:text-gold" />
                    </Link>
                  );
                })}
            </div>
          </section>
        ))
      )}

      <MateriaFormModal
        open={modalMateria}
        onClose={() => setModalMateria(false)}
        concursoId={concurso.id}
        materias={materias ?? []}
        vinculos={vinculos ?? []}
      />
    </div>
  );
}
