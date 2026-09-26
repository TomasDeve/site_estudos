import { useMemo, useState } from "react";
import { ChevronDown, ListFilter, Search, X } from "lucide-react";
import type { Materia, Topico } from "@/types/db";
import { Button } from "@/components/Button";
import {
  alternarAssunto,
  alternarMateria,
  limparAssuntos,
  normalizarFiltro,
  semAcento,
  type FiltroQuestoes,
} from "./filtroQuestoes";

/** Uma matéria disponível no filtro, com os assuntos dela e as contagens. */
export interface GrupoFiltro {
  materia: Materia;
  total: number;
  assuntos: { topico: Topico; total: number }[];
}

interface Props {
  /** Matérias (na ordem do edital) com os assuntos que têm questão. */
  grupos: GrupoFiltro[];
  /** Filtro em vigor na lista. */
  aplicado: FiltroQuestoes;
  onAplicar: (f: FiltroQuestoes) => void;
  /** Quantas questões um filtro traria — prévia no botão "Filtrar". */
  contar: (f: FiltroQuestoes) => number;
  /** Página presa a uma matéria: só os assuntos dela entram no filtro. */
  materiaFixa?: string;
}

/** Acima disso, os assuntos de uma matéria viram um chip só ("Penal · 5 assuntos"). */
const MAX_CHIPS_POR_MATERIA = 3;

/**
 * Filtro de questões no estilo do QConcursos: escolhe a(s) matéria(s) e,
 * dentro delas, os assuntos. Matéria sem assunto marcado traz todos os dela.
 * Monta num rascunho e só vale ao clicar em "Filtrar"; a página sempre abre sem
 * filtro.
 */
export function FiltroMateriaAssunto({ grupos, aplicado, onAplicar, contar, materiaFixa }: Props) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<FiltroQuestoes>(aplicado);
  const [busca, setBusca] = useState("");

  const grupoPorId = useMemo(() => new Map(grupos.map((g) => [g.materia.id, g])), [grupos]);
  const tituloPorId = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of grupos) for (const a of g.assuntos) m.set(a.topico.id, a.topico.titulo);
    return m;
  }, [grupos]);

  function abrir() {
    setRascunho(aplicado);
    setBusca("");
    setAberto(true);
  }

  function aplicar(f: FiltroQuestoes) {
    onAplicar(normalizarFiltro(f, materiaFixa));
    setAberto(false);
  }

  // Na página de uma matéria, os assuntos dela aparecem direto (a matéria é o escopo).
  const materiasNoRascunho = materiaFixa
    ? grupos.filter((g) => g.materia.id === materiaFixa)
    : rascunho.map((i) => grupoPorId.get(i.materiaId)).filter((g): g is GrupoFiltro => !!g);
  const marcadosDe = (materiaId: string) =>
    new Set(rascunho.find((i) => i.materiaId === materiaId)?.assuntos ?? []);
  const termo = semAcento(busca.trim());
  const previa = contar(normalizarFiltro(rascunho, materiaFixa));

  return (
    <div className="space-y-2">
      {/* Linha do filtro: o botão e o que está valendo, nos mesmos chips das pílulas */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wide text-mut">
          Filtro
        </span>
        {aplicado.length === 0 ? (
          <button
            type="button"
            onClick={() => (aberto ? setAberto(false) : abrir())}
            aria-expanded={aberto}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              aberto
                ? "border-gold/50 text-gold"
                : "border-line text-dim hover:border-gold/50 hover:text-gold"
            }`}
          >
            <ListFilter className="size-3.5" />
            {materiaFixa ? "Escolher assuntos" : "Matéria e assunto"}
            <ChevronDown className={`size-3 transition-transform ${aberto ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <>
            {aplicado.flatMap((item) => {
              const g = grupoPorId.get(item.materiaId);
              const icone = g?.materia.icone;
              const nome = g?.materia.nome ?? "Matéria";
              if (item.assuntos.length === 0) {
                return [
                  <ChipFiltro
                    key={item.materiaId}
                    icone={icone}
                    label={`${nome} · todos os assuntos`}
                    onRemover={() => aplicar(alternarMateria(aplicado, item.materiaId))}
                  />,
                ];
              }
              if (item.assuntos.length > MAX_CHIPS_POR_MATERIA) {
                return [
                  <ChipFiltro
                    key={item.materiaId}
                    icone={icone}
                    label={`${nome} · ${item.assuntos.length} assuntos`}
                    title={item.assuntos.map((a) => tituloPorId.get(a) ?? "Assunto").join("\n")}
                    onRemover={() => aplicar(alternarMateria(aplicado, item.materiaId))}
                  />,
                ];
              }
              return item.assuntos.map((a) => (
                <ChipFiltro
                  key={a}
                  icone={icone}
                  label={tituloPorId.get(a) ?? "Assunto"}
                  title={`${nome} › ${tituloPorId.get(a) ?? "Assunto"}`}
                  onRemover={() => aplicar(alternarAssunto(aplicado, item.materiaId, a))}
                />
              ));
            })}
            <button
              type="button"
              onClick={() => (aberto ? setAberto(false) : abrir())}
              aria-expanded={aberto}
              className="cursor-pointer px-1.5 py-1 text-[11px] font-semibold text-dim transition-colors hover:text-gold"
            >
              {aberto ? "Fechar" : "Editar"}
            </button>
            <button
              type="button"
              onClick={() => aplicar([])}
              className="cursor-pointer px-1.5 py-1 text-[11px] font-semibold text-mut transition-colors hover:text-red"
            >
              Limpar
            </button>
          </>
        )}
      </div>

      {aberto && (
        <div className="space-y-4 rounded-xl border border-line/60 bg-navy-900/60 p-3 sm:p-4">
          {!materiaFixa && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-mut">
                Matéria
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {grupos.map((g) => {
                  const ativo = rascunho.some((i) => i.materiaId === g.materia.id);
                  return (
                    <button
                      key={g.materia.id}
                      type="button"
                      onClick={() => setRascunho((r) => alternarMateria(r, g.materia.id))}
                      aria-pressed={ativo}
                      className={`flex max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        ativo
                          ? "border-gold/40 bg-gold/15 text-gold"
                          : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
                      }`}
                    >
                      <span className="text-xs leading-none">{g.materia.icone}</span>
                      <span className="truncate">{g.materia.nome}</span>
                      <span className="tabular-nums opacity-70">{g.total}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-mut">
                Assuntos
              </h3>
              {materiasNoRascunho.length > 0 && (
                <label className="ml-auto flex h-7 w-full items-center gap-1.5 rounded-lg border border-line/60 bg-navy-950/40 px-2 focus-within:border-gold/50 sm:w-56">
                  <Search className="size-3.5 shrink-0 text-mut" />
                  <input
                    type="search"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar assunto"
                    className="min-w-0 flex-1 bg-transparent text-xs text-txt outline-none placeholder:text-mut"
                  />
                </label>
              )}
            </div>

            {materiasNoRascunho.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line/50 px-3 py-4 text-center text-xs text-mut">
                Escolha uma matéria para ver os assuntos dela.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-mut">
                  Sem assunto marcado, entram todos os assuntos da matéria.
                </p>
                {materiasNoRascunho.map((g) => {
                  const marcados = marcadosDe(g.materia.id);
                  const visiveis = termo
                    ? g.assuntos.filter((a) => semAcento(a.topico.titulo).includes(termo))
                    : g.assuntos;
                  return (
                    <div key={g.materia.id}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-xs leading-none">{g.materia.icone}</span>
                        <span className="min-w-0 truncate text-xs font-semibold text-txt">
                          {g.materia.nome}
                        </span>
                        <span className="shrink-0 text-[11px] text-mut">
                          {marcados.size > 0
                            ? `${marcados.size} de ${g.assuntos.length} marcados`
                            : "todos os assuntos"}
                        </span>
                        {marcados.size > 0 && (
                          <button
                            type="button"
                            onClick={() => setRascunho((r) => limparAssuntos(r, g.materia.id))}
                            className="ml-auto shrink-0 cursor-pointer text-[11px] font-medium text-dim transition-colors hover:text-gold"
                          >
                            Desmarcar
                          </button>
                        )}
                      </div>
                      {visiveis.length === 0 ? (
                        <p className="px-1 py-2 text-xs text-mut">
                          {termo ? "Nenhum assunto com esse nome." : "Nenhum assunto com questão."}
                        </p>
                      ) : (
                        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                          {visiveis.map(({ topico: t, total }) => (
                            <label
                              key={t.id}
                              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-2.5 py-1.5 transition-colors ${
                                marcados.has(t.id)
                                  ? "border-gold/40 bg-gold/10"
                                  : "border-line/50 bg-navy-900/50 hover:border-line"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={marcados.has(t.id)}
                                onChange={() =>
                                  setRascunho((r) => alternarAssunto(r, g.materia.id, t.id))
                                }
                                className="mt-0.5 size-3.5 shrink-0 accent-gold"
                              />
                              <span
                                className={`min-w-0 flex-1 text-xs ${
                                  marcados.has(t.id) ? "text-txt" : "text-dim"
                                }`}
                              >
                                {t.titulo}
                              </span>
                              <span className="shrink-0 text-[11px] tabular-nums text-mut">
                                {total}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-2 border-t border-line/40 pt-3">
            <button
              type="button"
              onClick={() => setRascunho([])}
              disabled={rascunho.length === 0}
              className="cursor-pointer text-xs font-medium text-mut transition-colors hover:text-red disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-mut"
            >
              Limpar seleção
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={() => aplicar(rascunho)}>
                <ListFilter className="size-3.5" />
                Filtrar
                <span className="tabular-nums opacity-80">· {previa}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipFiltro({
  icone,
  label,
  title,
  onRemover,
}: {
  icone?: string;
  label: string;
  title?: string;
  onRemover: () => void;
}) {
  return (
    <span
      title={title ?? label}
      className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-gold/40 bg-gold/15 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-gold"
    >
      {icone && <span className="text-xs leading-none">{icone}</span>}
      <span className="min-w-0 truncate sm:max-w-64">{label}</span>
      <button
        type="button"
        onClick={onRemover}
        className="shrink-0 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-gold/20"
        aria-label={`Tirar “${label}” do filtro`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
