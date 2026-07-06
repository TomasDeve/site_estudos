import { useMemo, useState, type FormEvent } from "react";
import { Link2, Trash2, ExternalLink, Plus, Target, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { QuestaoLog, Topico, TopicoLink, TopicoStatus } from "@/types/db";
import { CICLO_STATUS, useExcluirTopico, useSetTopicoStatus } from "@/api/topicos";
import { useCriarTopicoLink, useExcluirTopicoLink } from "@/api/topicoLinks";
import { useCriarQuestaoLog, useExcluirQuestaoLog } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { Button } from "@/components/Button";
import { Input, Select } from "@/components/Field";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { STATUS_INFO } from "./statusInfo";

const TIPO_LINK: Record<string, string> = {
  questoes: "✍️",
  aula: "🎬",
  pdf: "📄",
  resumo: "📝",
  outro: "🔗",
};

/** Cor da taxa de acerto: verde forte, amarelo mediano, vermelho fraco. */
function corDesempenho(pct: number) {
  if (pct >= 70) return { texto: "text-green", fundo: "bg-green/10 hover:bg-green/20" };
  if (pct >= 50) return { texto: "text-amber", fundo: "bg-amber/10 hover:bg-amber/20" };
  return { texto: "text-red", fundo: "bg-red/10 hover:bg-red/20" };
}

type Painel = null | "links" | "questoes";

interface Props {
  topico: Topico;
  links: TopicoLink[];
  logs: QuestaoLog[];
}

export function TopicoRow({ topico, links, logs }: Props) {
  const setStatus = useSetTopicoStatus();
  const excluirTopico = useExcluirTopico();
  const criarLink = useCriarTopicoLink();
  const excluirLink = useExcluirTopicoLink();
  const criarLog = useCriarQuestaoLog();
  const excluirLog = useExcluirQuestaoLog();

  const [painel, setPainel] = useState<Painel>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [novoTipo, setNovoTipo] = useState("questoes");

  const [total, setTotal] = useState("");
  const [acertos, setAcertos] = useState("");
  const [dataLog, setDataLog] = useState(hojeISO());

  const status = topico.status as TopicoStatus;
  const info = STATUS_INFO[status];

  // Desempenho acumulado do assunto (todos os registros).
  const resumo = useMemo(() => {
    const t = logs.reduce((s, l) => s + l.total, 0);
    const a = logs.reduce((s, l) => s + l.acertos, 0);
    return { total: t, acertos: a, pct: t > 0 ? Math.round((a / t) * 100) : null };
  }, [logs]);

  function alternar(p: Painel) {
    setPainel((atual) => (atual === p ? null : p));
  }

  async function onAddLink(e: FormEvent) {
    e.preventDefault();
    try {
      const url = novaUrl.trim().startsWith("http") ? novaUrl.trim() : `https://${novaUrl.trim()}`;
      await criarLink.mutateAsync({
        topico_id: topico.id,
        titulo: novoTitulo.trim() || novoTipo,
        url,
        tipo: novoTipo,
      });
      setNovoTitulo("");
      setNovaUrl("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onAddLog(e: FormEvent) {
    e.preventDefault();
    const t = Number(total);
    const a = Number(acertos);
    if (!Number.isInteger(t) || t <= 0) return toast.error("Total de questões inválido.");
    if (!Number.isInteger(a) || a < 0 || a > t)
      return toast.error("Acertos deve ficar entre 0 e o total.");
    try {
      await criarLog.mutateAsync({
        data: dataLog,
        total: t,
        acertos: a,
        materia_id: topico.materia_id,
        topico_id: topico.id,
        origem: "manual",
      });
      toast.success(`${a}/${t} (${Math.round((a / t) * 100)}%) registrado 🎯`);
      setTotal("");
      setAcertos("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  const cor = resumo.pct !== null ? corDesempenho(resumo.pct) : null;

  return (
    <li className="group/topico">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-navy-700/40">
        {/* bolinha de status: clique cicla */}
        <button
          onClick={() => setStatus.mutate({ id: topico.id, status: CICLO_STATUS[status] })}
          className="size-4.5 shrink-0 cursor-pointer rounded-full border-2 transition-all hover:scale-125"
          style={{
            borderColor: info.cor,
            background: status === "nao_estudado" ? "transparent" : info.cor,
          }}
          title={`${info.label} → clique: ${STATUS_INFO[CICLO_STATUS[status]].label}`}
          aria-label={`${topico.titulo}: ${info.label}`}
        />
        <span
          className={`min-w-0 flex-1 text-sm leading-snug ${
            status === "concluido" ? "text-mut" : "text-txt"
          }`}
        >
          {topico.titulo}
        </span>

        {/* desempenho: mostra a taxa de acerto, ou convida a registrar */}
        <button
          onClick={() => alternar("questoes")}
          className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold transition-colors ${
            cor
              ? `${cor.texto} ${cor.fundo}`
              : "text-mut opacity-0 hover:bg-navy-600 group-hover/topico:opacity-100 max-md:opacity-100"
          } ${painel === "questoes" ? "ring-1 ring-line" : ""}`}
          title={
            resumo.pct !== null
              ? `${resumo.acertos}/${resumo.total} questões · ${resumo.pct}% de acerto`
              : "Registrar questões deste assunto"
          }
        >
          <Target className="size-3.5" />
          {resumo.pct !== null && <span className="tabular-nums">{resumo.pct}%</span>}
        </button>

        {/* adicionar/gerenciar links */}
        <button
          onClick={() => alternar("links")}
          className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors ${
            links.length > 0
              ? "text-gold hover:bg-gold/10"
              : "text-mut opacity-0 hover:bg-navy-600 group-hover/topico:opacity-100 max-md:opacity-100"
          } ${painel === "links" ? "ring-1 ring-line" : ""}`}
          title="Links do tópico (questões, aulas...)"
        >
          <Link2 className="size-3.5" />
          {links.length > 0 && <span className="font-semibold">{links.length}</span>}
        </button>

        <button
          onClick={() => setConfirmarExclusao(true)}
          className="shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-colors hover:bg-red/10 hover:text-red group-hover/topico:opacity-100"
          title="Excluir tópico"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Chips dos links — sempre visíveis, abrem direto. */}
      {links.length > 0 && (
        <div className="mb-1.5 ml-7 flex flex-wrap items-center gap-1.5">
          {links.map((l) => (
            <span
              key={l.id}
              className="group/chip inline-flex items-center overflow-hidden rounded-full border border-line/60 bg-navy-900/60 text-xs transition-colors hover:border-gold/40"
            >
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 py-1 pl-2.5 pr-1.5 text-dim transition-colors hover:text-gold"
              >
                <span>{TIPO_LINK[l.tipo] ?? "🔗"}</span>
                <span className="max-w-40 truncate">{l.titulo}</span>
                <ExternalLink className="size-3 shrink-0 opacity-60" />
              </a>
              <button
                onClick={() => excluirLink.mutate(l.id)}
                className="flex h-full items-center px-1 text-mut opacity-0 transition-colors hover:text-red group-hover/chip:opacity-100 max-md:opacity-100"
                aria-label={`Excluir link ${l.titulo}`}
                title="Excluir link"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Painel: registrar/ver desempenho do assunto. */}
      {painel === "questoes" && (
        <div className="mb-2 ml-7 space-y-3 rounded-lg border border-line/50 bg-navy-900/60 p-3">
          {resumo.pct !== null && cor ? (
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold tabular-nums ${cor.texto}`}>{resumo.pct}%</span>
              <span className="text-xs text-mut">
                {resumo.acertos}/{resumo.total} questões ·{" "}
                {logs.length} {logs.length === 1 ? "registro" : "registros"}
              </span>
            </div>
          ) : (
            <p className="text-xs text-mut">
              Fez questões deste assunto? Anote quantas e quantas acertou.
            </p>
          )}

          <form onSubmit={onAddLog} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-dim">Questões</span>
              <Input
                type="number"
                required
                min="1"
                placeholder="30"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="!h-8 w-20 !text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-dim">Acertos</span>
              <Input
                type="number"
                required
                min="0"
                placeholder="24"
                value={acertos}
                onChange={(e) => setAcertos(e.target.value)}
                className="!h-8 w-20 !text-xs"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-dim">Data</span>
              <Input
                type="date"
                value={dataLog}
                onChange={(e) => setDataLog(e.target.value)}
                className="!h-8 w-36 !text-xs"
              />
            </label>
            <Button size="sm" type="submit" variant="secondary" loading={criarLog.isPending}>
              <Plus className="size-3.5" /> Registrar
            </Button>
          </form>

          {logs.length > 0 && (
            <ul className="space-y-1 border-t border-line/30 pt-2">
              {logs.slice(0, 5).map((l) => {
                const pct = Math.round((l.acertos / l.total) * 100);
                return (
                  <li key={l.id} className="flex items-center gap-2 text-xs text-dim">
                    <span className="w-12 shrink-0 tabular-nums text-mut">
                      {format(parseISO(l.data), "dd/MM")}
                    </span>
                    <span className="tabular-nums">
                      {l.acertos}/{l.total}
                    </span>
                    <span className={`font-semibold tabular-nums ${corDesempenho(pct).texto}`}>
                      {pct}%
                    </span>
                    <button
                      onClick={() => excluirLog.mutate(l.id)}
                      className="ml-auto shrink-0 cursor-pointer p-0.5 text-mut transition-colors hover:text-red"
                      aria-label="Excluir registro"
                      title="Excluir registro"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Painel: adicionar link (só abre no clique). */}
      {painel === "links" && (
        <div className="mb-2 ml-7 rounded-lg border border-line/50 bg-navy-900/60 p-3">
          <form onSubmit={onAddLink} className="flex flex-wrap items-center gap-2">
            <Select
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
              className="!h-8 w-28 !text-xs"
            >
              <option value="questoes">Questões</option>
              <option value="aula">Aula</option>
              <option value="pdf">PDF</option>
              <option value="resumo">Resumo</option>
              <option value="outro">Outro</option>
            </Select>
            <Input
              placeholder="Título (opcional)"
              value={novoTitulo}
              onChange={(e) => setNovoTitulo(e.target.value)}
              className="!h-8 w-36 flex-1 !text-xs"
            />
            <Input
              required
              placeholder="https://..."
              value={novaUrl}
              onChange={(e) => setNovaUrl(e.target.value)}
              className="!h-8 w-40 flex-[2] !text-xs"
            />
            <Button size="sm" type="submit" variant="secondary" loading={criarLink.isPending}>
              <Plus className="size-3.5" /> Adicionar
            </Button>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={() => {
          excluirTopico.mutate(topico.id);
          setConfirmarExclusao(false);
        }}
        title="Excluir tópico?"
        message={`"${topico.titulo}" e seus links serão excluídos. O progresso dele some de TODOS os concursos que usam esta matéria.`}
        confirmLabel="Excluir"
        danger
      />
    </li>
  );
}
