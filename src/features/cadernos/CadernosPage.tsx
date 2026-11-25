import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { nomeDaArea } from "@/lib/concursoInfo";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useCadernos } from "@/api/cadernos";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { STATUS_INFO } from "@/features/conteudos/statusInfo";
import type { Caderno, Materia } from "@/types/db";
import { pctCaderno, pctGeral, situacaoDosCapitulos, type SituacaoCapitulo } from "./progresso";

// Mesmas cores da bolinha dos assuntos: verde visto, amarelo em andamento, vazio falta.
const SITUACAO: Record<SituacaoCapitulo, { label: string; cor: string; cheio: boolean }> = {
  visto: { label: "Visto", cor: STATUS_INFO.concluido.cor, cheio: true },
  andamento: { label: "Em andamento", cor: STATUS_INFO.estudando.cor, cheio: true },
  falta: { label: "Falta", cor: STATUS_INFO.nao_estudado.cor, cheio: false },
};

// Matérias que não têm caderno por natureza (não entram no aviso "sem caderno").
const SEM_CADERNO_ESPERADO = new Set(["redacao", "atualidades"]);

export function CadernosPage() {
  const concurso = useConcursoAtual();
  const { data: cadernos, isLoading: l1 } = useCadernos();
  const { data: materias, isLoading: l2 } = useMaterias();
  const { data: vinculos, isLoading: l3 } = useConcursoMaterias();
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());

  const meus = useMemo(
    () => (cadernos ?? []).filter((c) => c.concurso_id === concurso.id),
    [cadernos, concurso.id]
  );
  // Matérias do concurso na ordem do edital, cada uma com o seu caderno (se tiver).
  const linhas = useMemo(() => {
    return (vinculos ?? [])
      .filter((v) => v.concurso_id === concurso.id && !v.riscada)
      .sort((a, b) => a.ordem - b.ordem)
      .map((v) => ({
        area: v.area,
        materia: (materias ?? []).find((m) => m.id === v.materia_id),
        caderno: meus.find((c) => c.materia_id === v.materia_id),
      }))
      .filter(
        (l): l is { area: string; materia: Materia; caderno: Caderno | undefined } =>
          !!l.materia &&
          (!!l.caderno ||
            (l.area !== "outros" && !SEM_CADERNO_ESPERADO.has(l.materia.slug ?? "")))
      );
  }, [vinculos, materias, meus, concurso.id]);

  if (l1 || l2 || l3) return <FullScreenSpinner />;

  if (meus.length === 0) {
    return (
      <EmptyState
        icon="📒"
        title="Nenhum caderno cadastrado"
        message="Os cadernos impressos deste concurso aparecem aqui com a porcentagem e os capítulos."
      />
    );
  }

  const geral = pctGeral(meus);
  const lidas = meus.reduce((s, c) => s + Math.min(c.pagina_atual, c.total_paginas), 0);
  const total = meus.reduce((s, c) => s + c.total_paginas, 0);
  const areas = ["P1", "P2", "outros"].filter((a) => linhas.some((l) => l.area === a));

  function alternar(id: string) {
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-6">
      <Card
        className="overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(70% 140% at 100% 0%, ${concurso.cor}1f, transparent 60%)`,
        }}
      >
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-mut">Cadernos</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span
                  className="text-3xl font-extrabold leading-none tabular-nums"
                  style={{ color: concurso.cor }}
                >
                  {geral}%
                </span>
                <span className="text-sm text-dim">
                  <strong className="font-bold text-txt">{lidas}</strong> de {total} páginas
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-mut">
              {Object.values(SITUACAO).map((s) => (
                <span key={s.label} className="flex items-center gap-1.5">
                  <Bolinha cor={s.cor} cheio={s.cheio} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>
          <ProgressBar value={geral} color={concurso.cor} size="lg" className="mt-3.5" />
        </CardBody>
      </Card>

      {areas.map((area) => (
        <section key={area}>
          <h2 className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-mut">
            {nomeDaArea(concurso, area)}
            <span className="h-px flex-1 bg-gradient-to-r from-line/70 to-transparent" aria-hidden />
          </h2>
          <div className="space-y-2.5">
            {linhas
              .filter((l) => l.area === area)
              .map(({ materia, caderno }) =>
                caderno ? (
                  <LinhaCaderno
                    key={caderno.id}
                    materia={materia}
                    caderno={caderno}
                    cor={concurso.cor}
                    aberto={abertos.has(caderno.id)}
                    onAlternar={() => alternar(caderno.id)}
                  />
                ) : (
                  <div
                    key={materia.id}
                    className="flex items-center gap-3.5 rounded-card border border-dashed border-line/50 px-4 py-3 text-sm text-mut"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xl opacity-60">
                      {materia.icone}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{materia.nome}</span>
                    <span className="shrink-0 text-xs">sem caderno ainda</span>
                  </div>
                )
              )}
          </div>
        </section>
      ))}
    </div>
  );
}

function LinhaCaderno({
  materia,
  caderno,
  cor,
  aberto,
  onAlternar,
}: {
  materia: Materia;
  caderno: Caderno;
  cor: string;
  aberto: boolean;
  onAlternar: () => void;
}) {
  const pct = pctCaderno(caderno);
  const caps = situacaoDosCapitulos(caderno);
  const vistos = caps.filter((c) => c.situacao === "visto").length;
  const andamento = caps.filter((c) => c.situacao === "andamento").length;
  const faltam = caps.length - vistos - andamento;
  const corBarra = pct >= 100 ? STATUS_INFO.concluido.cor : cor;

  return (
    <div className="overflow-hidden rounded-card border border-line/50 bg-gradient-to-b from-navy-800/95 to-navy-800/70 shadow-card">
      <button
        onClick={onAlternar}
        aria-expanded={aberto}
        className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-navy-700/30"
      >
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
          style={{ background: `${cor}1a`, boxShadow: `inset 0 0 0 1px ${cor}2e` }}
        >
          {materia.icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-bold text-txt">{materia.nome}</span>
            <span className="shrink-0 text-sm font-extrabold tabular-nums" style={{ color: corBarra }}>
              {pct}%
            </span>
          </span>
          <ProgressBar value={pct} color={corBarra} size="sm" className="mt-1.5" />
          <span className="mt-1.5 block truncate text-[11px] text-mut">
            pág. {caderno.pagina_atual} de {caderno.total_paginas} · {vistos}{" "}
            {vistos === 1 ? "visto" : "vistos"}
            {andamento > 0 ? ` · ${andamento} em andamento` : ""} · {faltam}{" "}
            {faltam === 1 ? "falta" : "faltam"}
          </span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-mut transition-transform ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="border-t border-line/40 px-4 pb-3 pt-2.5">
          <p className="mb-2 text-[11px] text-mut">{caderno.titulo}</p>
          {caderno.observacao && (
            <p className="mb-2.5 rounded-lg bg-gold/10 px-3 py-2 text-xs text-dim">{caderno.observacao}</p>
          )}
          <ul className="space-y-0.5">
            {caps.map((c) => {
              const s = SITUACAO[c.situacao];
              return (
                <li
                  key={`${c.pagina}-${c.titulo}`}
                  className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 ${
                    c.situacao === "andamento" ? "bg-amber/10" : ""
                  }`}
                >
                  <Bolinha cor={s.cor} cheio={s.cheio} className="mt-1" titulo={s.label} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[13px] leading-snug ${
                        c.situacao === "falta" ? "text-txt" : "text-dim"
                      }`}
                    >
                      {c.n !== null && <span className="font-semibold text-mut">{c.n}. </span>}
                      {c.titulo}
                    </span>
                    {c.situacao === "andamento" && (
                      <span className="block text-[11px] font-semibold" style={{ color: s.cor }}>
                        parou na pág. {caderno.pagina_atual} · faltam {c.ate - caderno.pagina_atual} págs.
                        do capítulo
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-mut">
                    {c.pagina === c.ate ? `p. ${c.pagina}` : `p. ${c.pagina}–${c.ate}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Bolinha({
  cor,
  cheio,
  className = "",
  titulo,
}: {
  cor: string;
  cheio: boolean;
  className?: string;
  titulo?: string;
}) {
  return (
    <span
      className={`size-2.5 shrink-0 rounded-full border ${className}`}
      style={{ borderColor: cor, background: cheio ? cor : "transparent" }}
      title={titulo}
      aria-label={titulo}
    />
  );
}
