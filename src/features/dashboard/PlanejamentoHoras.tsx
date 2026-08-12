import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Clock3, Scale, SplitSquareHorizontal, TimerReset } from "lucide-react";
import type { Concurso } from "@/types/db";
import { useAtualizarHorasConcurso, useToggleSistemaHoras } from "@/api/concursos";
import {
  useAtualizarHorasMateria,
  useConcursoMaterias,
  useDistribuirHorasMaterias,
  useMaterias,
} from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { distribuirIgual, distribuirPorPeso, somaHoras } from "@/lib/horas";
import { diasAte, fmtHoras } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { HoraInput } from "@/components/HoraInput";
import { RestanteBadge } from "@/components/RestanteBadge";
import { BarraHoras } from "@/features/horas/BarraHoras";
import { RegistrarEstudoModal } from "@/features/horas/RegistrarEstudoModal";

/** Interruptor liga/desliga acessível (role=switch). */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        checked ? "bg-gold" : "bg-navy-700"
      }`}
    >
      <span
        className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Balde de horas do concurso (Conteúdo / Revisão) — número grande + campo. */
function BaldeHoras({
  titulo,
  emoji,
  cor,
  value,
  onCommit,
}: {
  titulo: string;
  emoji: string;
  cor: string;
  value: number;
  onCommit: (h: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line/50 bg-navy-900/40 px-3 py-2.5">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
        style={{ background: `${cor}1a` }}
      >
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-mut">{titulo}</p>
        <p className="text-sm font-semibold tabular-nums text-txt">{fmtHoras(value)}</p>
      </div>
      <HoraInput value={value} onCommit={onCommit} ariaLabel={`Horas de ${titulo}`} />
    </div>
  );
}

/**
 * Painel de orçamento de horas do concurso: divide o tempo total em Conteúdo e
 * Revisão (Anki) e reparte o de Conteúdo entre as matérias, com "Distribuir" e
 * o "restante" ao vivo. Um interruptor liga/desliga toda a camada de horas —
 * quando desligado, o app não mostra nenhum campo de hora. Quando ligado, o
 * botão "Registrar estudo" abate o tempo estudado dos assuntos.
 */
export function PlanejamentoHoras({ concurso }: { concurso: Concurso }) {
  const { data: vinculos } = useConcursoMaterias();
  const { data: materias } = useMaterias();
  const { data: topicos } = useTopicos();
  const setHorasConcurso = useAtualizarHorasConcurso();
  const setHorasMateria = useAtualizarHorasMateria();
  const distribuir = useDistribuirHorasMaterias();
  const toggleSistema = useToggleSistemaHoras();

  const ativo = concurso.sistema_horas;

  // Card inteiro começa minimizado por padrão — só o cabeçalho e o resumo aparecem.
  const [expandido, setExpandido] = useState(false);
  const [aberto, setAberto] = useState(true);
  const [modalEstudo, setModalEstudo] = useState(false);

  const meusVinculos = useMemo(
    () =>
      (vinculos ?? [])
        .filter((v) => v.concurso_id === concurso.id)
        .sort((a, b) => a.ordem - b.ordem),
    [vinculos, concurso.id]
  );

  // Horas já estudadas por matéria (soma dos assuntos), para a barra de cada linha.
  const estudadoPorMateria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const t of topicos ?? []) {
      mapa.set(t.materia_id, (mapa.get(t.materia_id) ?? 0) + (t.horas_estudadas || 0));
    }
    return mapa;
  }, [topicos]);

  const conteudo = concurso.horas_conteudo || 0;
  const revisao = concurso.horas_revisao || 0;
  const total = conteudo + revisao;
  const dias = concurso.data_prova ? diasAte(concurso.data_prova) : null;
  const hDia = dias && dias > 0 ? total / dias : null;
  const distribuido = somaHoras(meusVinculos.map((v) => v.horas_alvo));
  const materiaDe = (id: string) => (materias ?? []).find((m) => m.id === id);
  const podeDistribuir = meusVinculos.length > 0 && conteudo > 0;

  function aplicar(horas: number[]) {
    distribuir.mutate(meusVinculos.map((v, i) => ({ id: v.id, horas_alvo: horas[i] ?? 0 })));
  }

  // ===== Desligado: só o interruptor e o convite =====
  if (!ativo) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-txt">
                <Clock3 className="size-4 text-gold" /> Sistema de horas
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-mut">
                Ative para definir suas horas por matéria e assunto e registrar o tempo estudado —
                o tempo vai sendo abatido de cada assunto.
              </p>
            </div>
            <Switch
              checked={false}
              onChange={() => toggleSistema.mutate({ id: concurso.id, sistema_horas: true })}
              label="Ativar sistema de horas"
            />
          </div>
        </CardBody>
      </Card>
    );
  }

  // ===== Ligado: planejamento completo + registrar estudo =====
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 text-left"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-txt">
              <ChevronRight
                className={`size-4 text-gold transition-transform ${expandido ? "rotate-90" : ""}`}
              />
              <Clock3 className="size-4 text-gold" /> Planejamento de horas
            </h2>
            {total > 0 && (
              <p className="text-xs text-mut">
                <strong className="tabular-nums text-txt">{fmtHoras(total)}</strong> no total
                {hDia !== null && (
                  <>
                    {" "}
                    · {dias} dias · ≈ <strong className="text-dim">{fmtHoras(hDia)}</strong>/dia
                  </>
                )}
              </p>
            )}
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => setModalEstudo(true)}>
              <TimerReset className="size-3.5" /> Registrar estudo
            </Button>
            <Switch
              checked
              onChange={() => toggleSistema.mutate({ id: concurso.id, sistema_horas: false })}
              label="Desativar sistema de horas"
            />
          </div>
        </div>

        {expandido && (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <BaldeHoras
                titulo="Conteúdo"
                emoji="📚"
                cor={concurso.cor}
                value={conteudo}
                onCommit={(h) => setHorasConcurso.mutate({ id: concurso.id, horas_conteudo: h })}
              />
              <BaldeHoras
                titulo="Revisão · Anki"
                emoji="🔁"
                cor="#8b7bd8"
                value={revisao}
                onCommit={(h) => setHorasConcurso.mutate({ id: concurso.id, horas_revisao: h })}
              />
            </div>

            <div className="mt-4 border-t border-line/30 pt-3">
              <button
                onClick={() => setAberto((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-txt">
                  <ChevronRight
                    className={`size-4 text-mut transition-transform ${aberto ? "rotate-90" : ""}`}
                  />
                  Distribuição do conteúdo por matéria
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="tabular-nums text-mut">
                    {fmtHoras(distribuido)} / {fmtHoras(conteudo)}
                  </span>
                  <RestanteBadge total={conteudo} distribuido={distribuido} />
                </span>
              </button>

              {aberto && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => aplicar(distribuirIgual(conteudo, meusVinculos.length))}
                      disabled={!podeDistribuir}
                      title="Reparte as horas de conteúdo igualmente entre as matérias"
                    >
                      <SplitSquareHorizontal className="size-3.5" /> Distribuir igual
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        aplicar(
                          distribuirPorPeso(
                            conteudo,
                            meusVinculos.map((v) => v.peso_questoes ?? 0)
                          )
                        )
                      }
                      disabled={!podeDistribuir}
                      title="Reparte proporcional ao peso de questões de cada matéria (prioriza quem cai mais)"
                    >
                      <Scale className="size-3.5" /> Por peso das questões
                    </Button>
                  </div>

                  {meusVinculos.length === 0 ? (
                    <p className="py-2 text-center text-sm text-mut">
                      Nenhuma matéria neste concurso ainda.
                    </p>
                  ) : (
                    <ul className="max-h-[420px] space-y-0.5 overflow-y-auto pr-1">
                      {meusVinculos.map((v) => {
                        const m = materiaDe(v.materia_id);
                        const estudado = estudadoPorMateria.get(v.materia_id) ?? 0;
                        return (
                          <li
                            key={v.id}
                            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-navy-700/40"
                          >
                            <span className="shrink-0 text-base">{m?.icone ?? "📘"}</span>
                            <Link
                              to={`/concurso/${concurso.id}/conteudos/${v.materia_id}`}
                              className="min-w-0 flex-1 truncate text-sm text-dim transition-colors hover:text-gold"
                              title={`Abrir ${m?.nome ?? "matéria"} e distribuir por assunto`}
                            >
                              {m?.nome ?? "matéria"}
                            </Link>
                            <div className="hidden w-28 shrink-0 sm:block">
                              <BarraHoras alvo={v.horas_alvo} estudado={estudado} cor={concurso.cor} size="sm" />
                            </div>
                            <HoraInput
                              value={v.horas_alvo}
                              onCommit={(h) => setHorasMateria.mutate({ id: v.id, horas_alvo: h })}
                              ariaLabel={`Horas de ${m?.nome ?? "matéria"}`}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </CardBody>

      <RegistrarEstudoModal
        open={modalEstudo}
        onClose={() => setModalEstudo(false)}
        concurso={concurso}
      />
    </Card>
  );
}
