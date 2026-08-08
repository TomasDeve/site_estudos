import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMaterias } from "@/api/materias";
import { useTopicos } from "@/api/topicos";
import {
  useAtualizarQuestaoImportada,
  useDefinirStatusQuestoes,
  useEstruturarQuestao,
  useExcluirQuestaoImportada,
  useQuestoesImportadas,
  useSalvarQuestaoImportada,
  type QuestaoExtraida,
} from "@/api/questoesImportadas";
import type { Json, QuestaoImportadaStatus } from "@/types/db";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { QuestaoImportadaCard } from "./QuestaoImportadaCard";

type Preview = QuestaoExtraida & { topico_id: string; fonte_url: string };
type FiltroStatus = QuestaoImportadaStatus | "todos";

const CHIPS: { v: FiltroStatus; label: string }[] = [
  { v: "todos", label: "Todas" },
  { v: "nova", label: "Novas" },
  { v: "aprovada", label: "Aprovadas" },
  { v: "descartada", label: "Descartadas" },
  { v: "usada", label: "Usadas" },
];

export function BancoQuestoesPage() {
  const { data: materias } = useMaterias();
  const { data: topicos } = useTopicos();
  const { data: questoes, isLoading } = useQuestoesImportadas();

  const estruturar = useEstruturarQuestao();
  const salvar = useSalvarQuestaoImportada();
  const atualizar = useAtualizarQuestaoImportada();
  const definirStatus = useDefinirStatusQuestoes();
  const excluir = useExcluirQuestaoImportada();

  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  const [fStatus, setFStatus] = useState<FiltroStatus>("nova");
  const [fNivel, setFNivel] = useState("");
  const [busca, setBusca] = useState("");

  // <optgroup>s de tópicos (agrupados por matéria) — reaproveitados em todos os selects.
  const topicoOptions = useMemo(() => {
    const ms = [...(materias ?? [])].sort((a, b) => a.nome.localeCompare(b.nome));
    return ms
      .map((m) => {
        const tops = (topicos ?? [])
          .filter((t) => t.materia_id === m.id)
          .sort((a, b) => a.ordem - b.ordem);
        if (tops.length === 0) return null;
        return (
          <optgroup key={m.id} label={`${m.icone} ${m.nome}`}>
            {tops.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </optgroup>
        );
      })
      .filter(Boolean);
  }, [materias, topicos]);

  const lista = questoes ?? [];
  const contagem = useMemo(() => {
    const c = { todos: lista.length, nova: 0, aprovada: 0, descartada: 0, usada: 0 };
    for (const q of lista) c[q.status as QuestaoImportadaStatus]++;
    return c;
  }, [lista]);

  const filtradas = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return lista.filter((q) => {
      if (fStatus !== "todos" && q.status !== fStatus) return false;
      if (fNivel && q.nivel !== fNivel) return false;
      if (b) {
        const hay = `${q.enunciado} ${q.disciplina ?? ""} ${q.assunto ?? ""} ${q.banca ?? ""}`.toLowerCase();
        if (!hay.includes(b)) return false;
      }
      return true;
    });
  }, [lista, fStatus, fNivel, busca]);

  function setP<K extends keyof Preview>(k: K, v: Preview[K]) {
    setPreview((p) => (p ? { ...p, [k]: v } : p));
  }

  async function interpretar() {
    try {
      const r = await estruturar.mutateAsync(texto);
      setPreview({ ...r, topico_id: "", fonte_url: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function salvarPreview() {
    if (!preview) return;
    if (!preview.enunciado.trim()) {
      toast.error("O enunciado está vazio.");
      return;
    }
    try {
      await salvar.mutateAsync({
        banca: preview.banca,
        ano: preview.ano,
        orgao: preview.orgao,
        cargo: preview.cargo,
        prova: preview.prova,
        disciplina: preview.disciplina,
        assunto: preview.assunto,
        nivel: preview.nivel,
        tipo: preview.tipo,
        contexto: preview.contexto,
        enunciado: preview.enunciado,
        alternativas: preview.alternativas as unknown as Json,
        gabarito_letra: preview.gabarito_letra,
        gabarito_bool: preview.gabarito_bool,
        comentario: preview.comentario,
        dificuldade: preview.dificuldade,
        topico_id: preview.topico_id || null,
        fonte_url: preview.fonte_url.trim() || null,
        status: "nova",
      });
      toast.success("Questão salva no banco! 🎉");
      setPreview(null);
      setTexto("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function statusEmLote(status: QuestaoImportadaStatus) {
    const ids = filtradas.map((q) => q.id);
    if (ids.length === 0) return;
    try {
      await definirStatus.mutateAsync({ ids, status });
      toast.success(`${ids.length} ${ids.length === 1 ? "questão" : "questões"} → ${status}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 md:py-8">
      <PageHeader
        title="Banco de questões"
        subtitle="Cole questões reais do QConcursos, trate e mapeie ao seu edital"
        action={
          <Link
            to="/concursos"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-mut hover:text-dim"
          >
            <ArrowLeft className="size-3.5" /> Voltar ao site
          </Link>
        }
      />

      {/* ===== 1 · Capturar ===== */}
      <Card>
        <CardHeader
          title="1 · Capturar"
          subtitle="No QConcursos: selecione a questão (Ctrl+A na área dela) → copie (Ctrl+C) → cole aqui. Se puder, revele o gabarito antes de copiar."
        />
        <CardBody className="space-y-3">
          <Textarea
            rows={6}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole aqui: cabeçalho (banca, ano…), enunciado, alternativas A–E e o gabarito."
            className="font-mono !text-xs"
          />
          <div className="flex justify-end">
            <Button onClick={interpretar} loading={estruturar.isPending} disabled={texto.trim().length < 20}>
              <Sparkles className="size-4" /> Interpretar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ===== 2 · Revisar e salvar ===== */}
      {preview && (
        <Card className="mt-4">
          <CardHeader title="2 · Revisar e salvar" subtitle="Confira a extração, ajuste gabarito e tópico, e salve." />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Banca">
                <Input value={preview.banca ?? ""} onChange={(e) => setP("banca", e.target.value || null)} />
              </Field>
              <Field label="Ano">
                <Input
                  type="number"
                  value={preview.ano ?? ""}
                  onChange={(e) => setP("ano", e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
              <Field label="Nível">
                <Select value={preview.nivel ?? ""} onChange={(e) => setP("nivel", (e.target.value || null) as Preview["nivel"])}>
                  <option value="">—</option>
                  <option value="fundamental">Fundamental</option>
                  <option value="medio">Médio</option>
                  <option value="superior">Superior</option>
                </Select>
              </Field>
              <Field label="Disciplina">
                <Input value={preview.disciplina ?? ""} onChange={(e) => setP("disciplina", e.target.value || null)} />
              </Field>
              <Field label="Assunto">
                <Input value={preview.assunto ?? ""} onChange={(e) => setP("assunto", e.target.value || null)} />
              </Field>
              <Field label="Dificuldade">
                <Select
                  value={preview.dificuldade ?? ""}
                  onChange={(e) => setP("dificuldade", (e.target.value || null) as Preview["dificuldade"])}
                >
                  <option value="">—</option>
                  <option value="facil">Fácil</option>
                  <option value="medio_facil">Médio-fácil</option>
                  <option value="medio_dificil">Médio-difícil</option>
                  <option value="dificil">Difícil</option>
                </Select>
              </Field>
            </div>

            {preview.contexto !== null && (
              <Field label="Comando / texto-base">
                <Textarea rows={2} value={preview.contexto ?? ""} onChange={(e) => setP("contexto", e.target.value || null)} />
              </Field>
            )}

            <Field label={preview.tipo === "ce" ? "Item (Certo/Errado)" : "Enunciado"}>
              <Textarea rows={3} value={preview.enunciado} onChange={(e) => setP("enunciado", e.target.value)} />
            </Field>

            {/* gabarito */}
            {preview.tipo === "multipla" ? (
              <div className="space-y-1.5">
                <span className="block text-xs font-medium tracking-wide text-dim">Alternativas — marque a correta</span>
                {preview.alternativas.map((a) => (
                  <label
                    key={a.letra}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm transition-colors ${
                      preview.gabarito_letra === a.letra
                        ? "border-green/40 bg-green/10 text-txt"
                        : "border-line/50 text-dim hover:border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gabarito"
                      className="mt-1"
                      checked={preview.gabarito_letra === a.letra}
                      onChange={() => setP("gabarito_letra", a.letra)}
                    />
                    <span>
                      <b>{a.letra})</b> {a.texto}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div>
                <span className="mb-1.5 block text-xs font-medium tracking-wide text-dim">Gabarito</span>
                <div className="flex gap-2">
                  {[
                    { v: true, label: "Certo" },
                    { v: false, label: "Errado" },
                  ].map(({ v, label }) => (
                    <label
                      key={label}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                        preview.gabarito_bool === v
                          ? "border-green/40 bg-green/10 text-txt"
                          : "border-line/50 text-dim hover:border-line"
                      }`}
                    >
                      <input
                        type="radio"
                        name="gabarito"
                        checked={preview.gabarito_bool === v}
                        onChange={() => setP("gabarito_bool", v)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Field label="Comentário (gerado pela IA — edite à vontade)">
              <Textarea rows={3} value={preview.comentario} onChange={(e) => setP("comentario", e.target.value)} />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Salvar no tópico">
                <Select value={preview.topico_id} onChange={(e) => setP("topico_id", e.target.value)}>
                  <option value="">— sem tópico —</option>
                  {topicoOptions}
                </Select>
              </Field>
              <Field label="Link da questão (opcional)">
                <Input
                  value={preview.fonte_url}
                  onChange={(e) => setP("fonte_url", e.target.value)}
                  placeholder="https://www.qconcursos.com/…"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Descartar
              </Button>
              <Button onClick={salvarPreview} loading={salvar.isPending}>
                Salvar no banco
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ===== Curadoria ===== */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-txt">
          Curadoria <span className="text-sm font-normal text-mut">· {contagem.todos}</span>
        </h2>

        {/* filtros */}
        <div className="mb-3 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {CHIPS.map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setFStatus(v)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  fStatus === v
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-line/60 text-dim hover:border-line hover:text-txt"
                }`}
              >
                {label} <span className="tabular-nums opacity-70">{contagem[v]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={fNivel} onChange={(e) => setFNivel(e.target.value)} className="!h-9 max-w-44 !text-xs">
              <option value="">Todos os níveis</option>
              <option value="fundamental">Fundamental</option>
              <option value="medio">Médio</option>
              <option value="superior">Superior</option>
            </Select>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mut" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por enunciado, disciplina, banca…"
                className="h-9 w-full rounded-lg border border-line bg-navy-900 pl-8 pr-3 text-xs text-txt outline-none placeholder:text-mut focus:border-gold/60"
              />
            </div>
          </div>
        </div>

        {/* ações em lote (a chave do "tirar o que não é do meu nível") */}
        {filtradas.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-line/40 bg-navy-900/50 px-3 py-2 text-xs text-dim">
            <span className="mr-auto">
              {filtradas.length} nesta seleção
              {(fNivel || busca) && " (filtrada)"}
            </span>
            {fStatus !== "aprovada" && (
              <Button size="sm" variant="secondary" onClick={() => statusEmLote("aprovada")} loading={definirStatus.isPending}>
                Aprovar todas
              </Button>
            )}
            {fStatus !== "descartada" && (
              <Button size="sm" variant="danger" onClick={() => statusEmLote("descartada")} loading={definirStatus.isPending}>
                Descartar todas
              </Button>
            )}
          </div>
        )}

        {/* lista */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-6" />
          </div>
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon="📥"
            title={lista.length === 0 ? "Nenhuma questão ainda" : "Nada nesta seleção"}
            message={
              lista.length === 0
                ? "Cole sua primeira questão lá em cima para começar o banco."
                : "Ajuste os filtros para ver outras questões."
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filtradas.map((q) => (
              <QuestaoImportadaCard
                key={q.id}
                q={q}
                topicoOptions={topicoOptions}
                onMapTopico={(topico_id) => atualizar.mutate({ id: q.id, patch: { topico_id } })}
                onStatus={(status) => atualizar.mutate({ id: q.id, patch: { status } })}
                onExcluir={() => excluir.mutate(q.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
