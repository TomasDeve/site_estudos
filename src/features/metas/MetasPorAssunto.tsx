import { useMemo } from "react";
import { Link } from "react-router";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import { useTopicoMetas, metasPorTopico } from "@/api/topicoMetas";
import { useQuestaoLogsPorTopico } from "@/api/questaoLogs";
import { avaliarMeta, placarAssunto } from "@/features/conteudos/metasTopico";
import { STATUS_INFO } from "@/features/conteudos/statusInfo";
import type { QuestaoLog, TopicoStatus } from "@/types/db";
import { Card, CardBody, CardHeader } from "@/components/Card";

/**
 * O placar de todos os assuntos do concurso: quantas metas cada um já fechou e
 * qual é a próxima que falta. Quem está quase lá aparece primeiro — é onde o
 * próximo esforço rende mais.
 */
export function MetasPorAssunto() {
  const concurso = useConcursoAtual();
  const { data: materias } = useMaterias();
  const { data: vinculos } = useConcursoMaterias();
  const { data: topicos } = useTopicos();
  const { data: metas } = useTopicoMetas();
  const { data: logs } = useQuestaoLogsPorTopico();

  const linhas = useMemo(() => {
    const doConcurso = (vinculos ?? []).filter((v) => v.concurso_id === concurso.id);
    const ordemMateria = new Map(doConcurso.map((v) => [v.materia_id, v.ordem]));
    const porTopico = metasPorTopico(metas);

    const logsPorTopico = new Map<string, QuestaoLog[]>();
    for (const l of logs ?? []) {
      if (!l.topico_id) continue;
      const arr = logsPorTopico.get(l.topico_id) ?? [];
      arr.push(l);
      logsPorTopico.set(l.topico_id, arr);
    }

    return (topicos ?? [])
      .filter((t) => ordemMateria.has(t.materia_id) && (porTopico.get(t.id) ?? []).length > 0)
      .map((t) => {
        const doAssunto = porTopico.get(t.id)!;
        const seusLogs = logsPorTopico.get(t.id) ?? [];
        const placar = placarAssunto(doAssunto, seusLogs);
        const pendente = [...doAssunto]
          .sort((a, b) => a.ordem - b.ordem)
          .map((m) => ({ meta: m, estado: avaliarMeta(m, seusLogs) }))
          .find((x) => !x.estado.concluida);
        return {
          topico: t,
          materia: (materias ?? []).find((m) => m.id === t.materia_id),
          placar,
          pendente,
          progresso: placar.total === 0 ? 0 : placar.feitas / placar.total,
        };
      })
      .sort(
        (a, b) =>
          Number(a.placar.fechado) - Number(b.placar.fechado) || // quem falta primeiro
          b.progresso - a.progresso || // depois, quem está mais perto
          (ordemMateria.get(a.topico.materia_id) ?? 0) - (ordemMateria.get(b.topico.materia_id) ?? 0) ||
          a.topico.ordem - b.topico.ordem
      );
  }, [topicos, metas, logs, vinculos, materias, concurso.id]);

  const fechados = linhas.filter((l) => l.placar.fechado).length;

  return (
    <Card>
      <CardHeader
        title="Metas por assunto"
        subtitle="O que ainda falta para dar cada assunto por concluído"
        action={
          linhas.length > 0 ? (
            <span className="text-xs font-semibold tabular-nums text-dim">
              <span className={fechados > 0 ? "text-green" : ""}>{fechados}</span>/{linhas.length}{" "}
              fechados
            </span>
          ) : undefined
        }
      />
      <CardBody>
        {linhas.length === 0 ? (
          <p className="py-2 text-center text-xs leading-relaxed text-mut">
            Nenhum assunto com metas ainda. Abra uma matéria em Conteúdos e use{" "}
            <span className="text-dim">Aplicar metas</span> para criar o plano padrão — ler a lei,
            resumir, 20 questões em 2 dias, 85% nas últimas 20 e o teste frio.
          </p>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {linhas.map(({ topico, materia, placar, pendente, progresso }) => {
              const info = STATUS_INFO[topico.status as TopicoStatus];
              return (
                <li key={topico.id}>
                  <Link
                    to={`/concurso/${concurso.id}/conteudos/${topico.materia_id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-navy-700/40"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full border"
                      style={{
                        borderColor: info.cor,
                        background: topico.status === "nao_estudado" ? "transparent" : info.cor,
                      }}
                      title={info.label}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-txt">{topico.titulo}</p>
                      <p className="truncate text-[11px] text-mut">
                        {materia?.icone} {materia?.nome}
                        {pendente && ` · falta: ${pendente.meta.titulo}`}
                      </p>
                    </div>
                    <div className="flex w-24 shrink-0 items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-navy-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            placar.fechado ? "bg-green" : "bg-amber/70"
                          }`}
                          style={{ width: `${Math.round(progresso * 100)}%` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          placar.fechado ? "text-green" : "text-dim"
                        }`}
                      >
                        {placar.feitas}/{placar.total}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
