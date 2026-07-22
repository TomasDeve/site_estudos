import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, ListChecks, Plus, Target, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useConcursoMaterias, useDesvincularMateria, useMaterias } from "@/api/materias";
import { useCriarTopico, useTopicos } from "@/api/topicos";
import { useTopicoLinks } from "@/api/topicoLinks";
import { useTopicoTextos } from "@/api/topicoTextos";
import { useQuestoesResumo, type QuestaoResumo } from "@/api/topicoQuestoes";
import { metasPorTopico, useAplicarPlanoPadrao, useTopicoMetas } from "@/api/topicoMetas";
import { useQuestaoLogsPorMateria, useQuestaoLogsPorTopico } from "@/api/questaoLogs";
import { useRedacoes } from "@/api/redacoes";
import { materiasComuns } from "@/lib/progresso";
import type { QuestaoLog, TopicoLink, TopicoTexto } from "@/types/db";
import { Card, CardBody } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TopicoRow } from "./TopicoRow";
import { RegistroQuestoes } from "./RegistroQuestoes";
import { MateriaResumos } from "./MateriaResumos";
import { RedacoesPanel } from "./RedacoesPanel";
import { STATUS_INFO } from "./statusInfo";
import { corDesempenho } from "./desempenho";

const NOME_AREA: Record<string, string> = {
  P1: "Conhecimentos Básicos",
  P2: "Conhecimentos Específicos",
  outros: "Outros conteúdos",
};

export function MateriaPage() {
  const concurso = useConcursoAtual();
  const { materiaId } = useParams();
  const navigate = useNavigate();

  const { data: materias, isLoading: l1 } = useMaterias();
  const { data: vinculos, isLoading: l2 } = useConcursoMaterias();
  const { data: topicos, isLoading: l3 } = useTopicos();
  const { data: links, isLoading: l4 } = useTopicoLinks();
  const { data: textos } = useTopicoTextos();
  const { data: questoes } = useQuestoesResumo();
  const { data: metas } = useTopicoMetas();
  const { data: logs } = useQuestaoLogsPorTopico();
  const { data: logsMateria } = useQuestaoLogsPorMateria(materiaId);
  const { data: redacoes } = useRedacoes();

  const criarTopico = useCriarTopico();
  const desvincular = useDesvincularMateria();
  const aplicarPlano = useAplicarPlanoPadrao();

  const [novoTopico, setNovoTopico] = useState("");
  const [adicionando, setAdicionando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [abrirQuestoes, setAbrirQuestoes] = useState(false);

  const irPara = `/concurso/${concurso.id}/conteudos`;

  // Matérias deste concurso, na ordem do edital (para navegar entre elas).
  const meusVinculos = useMemo(
    () =>
      (vinculos ?? [])
        .filter((v) => v.concurso_id === concurso.id)
        .sort((a, b) => a.ordem - b.ordem),
    [vinculos, concurso.id]
  );
  const idx = meusVinculos.findIndex((v) => v.materia_id === materiaId);
  const vinculo = idx >= 0 ? meusVinculos[idx] : undefined;
  const materia = (materias ?? []).find((m) => m.id === materiaId);
  const comum = useMemo(() => materiasComuns(vinculos ?? []).has(materiaId ?? ""), [vinculos, materiaId]);

  const meusTopicos = useMemo(
    () =>
      (topicos ?? [])
        .filter((t) => t.materia_id === materiaId)
        .sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)),
    [topicos, materiaId]
  );
  const linksPorTopico = useMemo(() => {
    const mapa = new Map<string, TopicoLink[]>();
    for (const l of links ?? []) {
      const arr = mapa.get(l.topico_id) ?? [];
      arr.push(l);
      mapa.set(l.topico_id, arr);
    }
    return mapa;
  }, [links]);
  const textosPorTopico = useMemo(() => {
    const mapa = new Map<string, TopicoTexto[]>();
    for (const t of textos ?? []) {
      if (!t.topico_id) continue; // textos gerais da matéria não entram por tópico
      const arr = mapa.get(t.topico_id) ?? [];
      arr.push(t);
      mapa.set(t.topico_id, arr);
    }
    return mapa;
  }, [textos]);
  const questoesPorTopico = useMemo(() => {
    const mapa = new Map<string, QuestaoResumo[]>();
    for (const q of questoes ?? []) {
      const arr = mapa.get(q.topico_id) ?? [];
      arr.push(q);
      mapa.set(q.topico_id, arr);
    }
    return mapa;
  }, [questoes]);
  const metasDoTopico = useMemo(() => metasPorTopico(metas), [metas]);
  const logsPorTopico = useMemo(() => {
    const mapa = new Map<string, QuestaoLog[]>();
    for (const l of logs ?? []) {
      if (!l.topico_id) continue;
      const arr = mapa.get(l.topico_id) ?? [];
      arr.push(l);
      mapa.set(l.topico_id, arr);
    }
    return mapa;
  }, [logs]);

  // Registros avulsos da matéria (sem tópico), somados no dia via +Acerto/+Erro
  // ou registrados em bateria direto na matéria.
  const geral = useMemo(() => {
    const t = (logsMateria ?? []).reduce((s, l) => s + l.total, 0);
    const a = (logsMateria ?? []).reduce((s, l) => s + l.acertos, 0);
    return { total: t, acertos: a, pct: t > 0 ? Math.round((a / t) * 100) : null };
  }, [logsMateria]);

  // Desempenho em questões acumulado da matéria (tópicos + registros avulsos).
  const desempenho = useMemo(() => {
    const ids = new Set(meusTopicos.map((t) => t.id));
    let total = geral.total;
    let acertos = geral.acertos;
    for (const l of logs ?? []) {
      if (l.topico_id && ids.has(l.topico_id)) {
        total += l.total;
        acertos += l.acertos;
      }
    }
    return { total, acertos, pct: total > 0 ? Math.round((acertos / total) * 100) : null };
  }, [logs, meusTopicos, geral]);

  if (l1 || l2 || l3 || l4) return <FullScreenSpinner />;

  if (!materia || !vinculo) {
    return (
      <EmptyState
        icon="🔍"
        title="Matéria não encontrada neste concurso"
        message="Ela pode ter sido removida do concurso."
        action={
          <Link to={irPara} className="text-sm font-semibold text-gold hover:underline">
            ← Voltar para Conteúdos
          </Link>
        }
      />
    );
  }

  // Assuntos que ainda não têm metas: dá para aplicar o plano padrão de uma vez.
  const semMetas = meusTopicos.filter((t) => (metasDoTopico.get(t.id) ?? []).length === 0);
  const concluidos = meusTopicos.filter((t) => t.status === "concluido").length;
  const pct = meusTopicos.length === 0 ? 0 : Math.round((concluidos / meusTopicos.length) * 100);
  const anterior = idx > 0 ? meusVinculos[idx - 1] : undefined;
  const proximo = idx < meusVinculos.length - 1 ? meusVinculos[idx + 1] : undefined;
  const nomeDe = (mId: string) => (materias ?? []).find((m) => m.id === mId)?.nome ?? "matéria";
  const iconeDe = (mId: string) => (materias ?? []).find((m) => m.id === mId)?.icone ?? "📘";
  const cor = desempenho.pct !== null ? corDesempenho(desempenho.pct) : null;

  const ehRedacao = materia.tipo === "redacao";
  const textosDaMateria = (textos ?? []).filter((t) => t.materia_id === materia.id);
  const redacoesDaMateria = (redacoes ?? []).filter(
    (r) => r.materia_id === materia.id && r.concurso_id === concurso.id
  );

  async function onAddTopico(e: FormEvent) {
    e.preventDefault();
    const titulo = novoTopico.trim();
    if (!titulo) return;
    try {
      const maiorOrdem = meusTopicos.reduce((m, t) => Math.max(m, t.ordem), -1);
      await criarTopico.mutateAsync({ materia_id: materia!.id, titulo, ordem: maiorOrdem + 1 });
      setNovoTopico("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-5">
      <Link
        to={irPara}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-mut transition-colors hover:text-gold"
      >
        <ArrowLeft className="size-3.5" /> Conteúdos
      </Link>

      {/* Cabeçalho imersivo da matéria */}
      <Card>
        <CardBody>
          <div className="flex items-start gap-4">
            <span
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ background: `${concurso.cor}1a` }}
            >
              {materia.icone}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-txt sm:text-2xl">
                  {materia.nome}
                </h1>
                <span className="rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim">
                  {NOME_AREA[vinculo.area] ?? vinculo.area}
                </span>
                {comum && (
                  <span
                    className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold"
                    title="Matéria usada em outro concurso: o progresso conta para todos"
                  >
                    Comum
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex min-w-52 flex-1 items-center gap-2.5">
                  <ProgressBar value={pct} color={concurso.cor} size="md" className="flex-1" />
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-dim">
                    {concluidos}/{meusTopicos.length} · {pct}%
                  </span>
                </div>
                {desempenho.pct !== null && cor && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${cor.texto} ${cor.fundo}`}
                    title={`${desempenho.acertos}/${desempenho.total} questões registradas nos tópicos`}
                  >
                    <Target className="size-3.5" /> {desempenho.pct}% em questões
                    <span className="font-normal text-mut">
                      ({desempenho.acertos}/{desempenho.total})
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Redação: notas dos treinos. Demais matérias: questões gerais. */}
      {ehRedacao ? (
        <RedacoesPanel
          concursoId={concurso.id}
          materiaId={materia.id}
          cor={concurso.cor}
          vinculo={vinculo}
          redacoes={redacoesDaMateria}
        />
      ) : (
        <Card>
          <CardBody>
            <button
              onClick={() => setAbrirQuestoes((v) => !v)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-txt">
                <Target className="size-4 text-gold" /> Questões da matéria (geral)
              </span>
              <span className="flex items-center gap-2 text-xs text-mut">
                {geral.pct !== null
                  ? `${geral.acertos}/${geral.total} · ${geral.pct}%`
                  : "registrar"}
                <ChevronRight
                  className={`size-4 transition-transform ${abrirQuestoes ? "rotate-90" : ""}`}
                />
              </span>
            </button>
            {abrirQuestoes && (
              <div className="mt-3 border-t border-line/30 pt-3">
                <p className="mb-3 text-xs text-mut">
                  Resolveu questões misturando vários assuntos no filtro? Registre direto aqui, sem
                  escolher um tópico.
                </p>
                <RegistroQuestoes materiaId={materia.id} topicoId={null} logs={logsMateria ?? []} />
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Resumos gerais da matéria (não presos a um assunto) */}
      <MateriaResumos materiaId={materia.id} textos={textosDaMateria} />

      {/* Tópicos da matéria */}
      <Card>
        <CardBody>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-txt">Tópicos do edital</h2>
            <div className="flex items-center gap-2.5 text-[11px] text-mut">
              {Object.entries(STATUS_INFO).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span
                    className="size-2.5 rounded-full border"
                    style={{
                      borderColor: v.cor,
                      background: k === "nao_estudado" ? "transparent" : v.cor,
                    }}
                  />
                  <span className="max-sm:hidden">{v.label}</span>
                </span>
              ))}
            </div>
          </div>

          {meusTopicos.length === 0 ? (
            <p className="py-4 text-center text-sm text-mut">
              Nenhum tópico ainda. Adicione o primeiro abaixo.
            </p>
          ) : (
            <ul className="mt-1">
              {meusTopicos.map((t, i) => (
                <TopicoRow
                  key={t.id}
                  topico={t}
                  links={linksPorTopico.get(t.id) ?? []}
                  logs={logsPorTopico.get(t.id) ?? []}
                  textos={textosPorTopico.get(t.id) ?? []}
                  questoes={questoesPorTopico.get(t.id) ?? []}
                  metas={metasDoTopico.get(t.id) ?? []}
                  isLast={i === meusTopicos.length - 1}
                />
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/30 pt-3">
            {adicionando ? (
              <form onSubmit={onAddTopico} className="flex items-center gap-2">
                <Input
                  autoFocus
                  placeholder="Título do novo tópico"
                  value={novoTopico}
                  onChange={(e) => setNovoTopico(e.target.value)}
                  className="!h-9 flex-1 !text-sm"
                />
                <Button size="sm" type="submit" variant="secondary" loading={criarTopico.isPending}>
                  Adicionar
                </Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setAdicionando(false)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <button
                onClick={() => setAdicionando(true)}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-gold"
              >
                <Plus className="size-3.5" /> Novo tópico
              </button>
            )}

            {semMetas.length > 0 && (
              <button
                onClick={() =>
                  aplicarPlano.mutate(
                    semMetas.map((t) => t.id),
                    {
                      onSuccess: (n) =>
                        toast.success(`Plano padrão aplicado em ${n} ${n === 1 ? "assunto" : "assuntos"}.`),
                      onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
                    }
                  )
                }
                disabled={aplicarPlano.isPending}
                className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-gold disabled:opacity-50"
                title="Cria as 5 metas padrão nos assuntos que ainda não têm"
              >
                <ListChecks className="size-3.5" />
                Aplicar metas em {semMetas.length}{" "}
                {semMetas.length === 1 ? "assunto" : "assuntos"}
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Navegar entre matérias + remover do concurso */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {anterior && (
            <Link
              to={`/concurso/${concurso.id}/conteudos/${anterior.materia_id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/60 bg-navy-800/80 px-3 py-2 text-xs text-dim transition-colors hover:border-line hover:text-txt"
            >
              <ChevronLeft className="size-4" />
              <span className="max-w-32 truncate">
                {iconeDe(anterior.materia_id)} {nomeDe(anterior.materia_id)}
              </span>
            </Link>
          )}
          {proximo && (
            <Link
              to={`/concurso/${concurso.id}/conteudos/${proximo.materia_id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line/60 bg-navy-800/80 px-3 py-2 text-xs text-dim transition-colors hover:border-line hover:text-txt"
            >
              <span className="max-w-32 truncate">
                {iconeDe(proximo.materia_id)} {nomeDe(proximo.materia_id)}
              </span>
              <ChevronRight className="size-4" />
            </Link>
          )}
        </div>

        <button
          onClick={() => setConfirmarRemocao(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-mut transition-colors hover:text-red"
          title="Remove a matéria deste concurso (o progresso fica guardado no catálogo)"
        >
          <Unlink className="size-3.5" /> Remover do concurso
        </button>
      </div>

      <ConfirmDialog
        open={confirmarRemocao}
        onClose={() => setConfirmarRemocao(false)}
        onConfirm={() => {
          desvincular.mutate(vinculo.id);
          setConfirmarRemocao(false);
          navigate(irPara);
        }}
        title="Remover matéria do concurso?"
        message={`"${materia.nome}" sai deste concurso, mas a matéria e o progresso dos tópicos continuam no catálogo (e em outros concursos que a usam).`}
        confirmLabel="Remover"
        danger
      />
    </div>
  );
}
