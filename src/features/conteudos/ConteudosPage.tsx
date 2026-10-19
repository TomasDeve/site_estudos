import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Plus } from "lucide-react";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { nomeDaArea } from "@/lib/concursoInfo";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import {
  progressoConcurso,
  progressoMateria,
  topicosDoConcurso,
} from "@/lib/progresso";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { MateriaFormModal } from "./MateriaFormModal";
import { STATUS_INFO } from "./statusInfo";

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
  // Cada concurso conta/mostra só o recorte de assuntos do seu edital.
  const tops = useMemo(
    () => topicosDoConcurso(topicos ?? [], concurso, vinculos ?? []),
    [topicos, concurso, vinculos]
  );
  const progresso = useMemo(
    () => progressoConcurso(concurso.id, vinculos ?? [], tops),
    [concurso.id, vinculos, tops]
  );

  if (l1 || l2 || l3) return <FullScreenSpinner />;

  const areas = ["P1", "P2", "outros"].filter((a) => meusVinculos.some((v) => v.area === a));

  return (
    <div className="space-y-6">
      {/* Resumo geral do edital */}
      <Card
        className="overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(70% 140% at 100% 0%, ${concurso.cor}1f, transparent 60%)`,
        }}
      >
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-mut">
                Edital verticalizado
              </p>
              <p className="mt-1 flex items-baseline gap-2">
                <span
                  className="text-3xl font-extrabold leading-none tabular-nums"
                  style={{ color: concurso.cor }}
                >
                  {progresso.pct}%
                </span>
                <span className="text-sm text-dim">
                  <strong className="font-bold text-txt">{progresso.concluidos}</strong> de{" "}
                  {progresso.total} tópicos concluídos
                </span>
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
          <ProgressBar value={progresso.pct} color={concurso.cor} size="lg" className="mt-3.5" />
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-xs text-mut">
          Escolha uma matéria para estudar sem distrações.
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
            <h2 className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-mut">
              {nomeDaArea(concurso, area)}
              <span className="h-px flex-1 bg-gradient-to-r from-line/70 to-transparent" aria-hidden />
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {meusVinculos
                .filter((v) => v.area === area)
                .map((v) => {
                  const materia = (materias ?? []).find((m) => m.id === v.materia_id);
                  if (!materia) return null;
                  const p = progressoMateria(materia.id, tops);
                  // Matéria fechada (100%) fica verde; as outras, na cor do concurso.
                  const corBarra = p.total > 0 && p.pct === 100 ? "#3fbf7f" : concurso.cor;
                  return (
                    <Link
                      key={v.id}
                      to={`/concurso/${concurso.id}/conteudos/${materia.id}`}
                      className="group flex items-center gap-3.5 rounded-card border border-line/50 bg-gradient-to-b from-navy-800/95 to-navy-800/70 px-4 py-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:border-line hover:shadow-pop active:translate-y-0"
                    >
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                        style={{
                          background: `linear-gradient(135deg, ${concurso.cor}2e, ${concurso.cor}0d)`,
                          boxShadow: `inset 0 0 0 1px ${concurso.cor}2b`,
                        }}
                      >
                        {materia.icone}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-txt">{materia.nome}</h3>
                        <div className="mt-2 flex items-center gap-2.5">
                          <ProgressBar value={p.pct} color={corBarra} size="sm" className="flex-1" />
                          <span className="shrink-0 text-[11px] font-medium tabular-nums text-mut">
                            {p.concluidos}/{p.total}
                          </span>
                        </div>
                      </div>
                      <span
                        className="w-11 shrink-0 text-right text-sm font-extrabold tabular-nums"
                        style={{ color: p.total === 0 ? undefined : corBarra }}
                      >
                        {p.total === 0 ? "—" : `${p.pct}%`}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-mut transition-all group-hover:translate-x-0.5 group-hover:text-gold" />
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
