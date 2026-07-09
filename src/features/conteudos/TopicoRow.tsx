import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link2, Trash2, ExternalLink, Plus, Target, X, Pencil, BookOpen, SeparatorHorizontal, Check, FileUp } from "lucide-react";
import { toast } from "sonner";
import type { QuestaoLog, Topico, TopicoLink, TopicoTexto, TopicoStatus } from "@/types/db";
import { CICLO_STATUS, useAtualizarTopico, useExcluirTopico, useSetTopicoSeparador, useSetTopicoStatus } from "@/api/topicos";
import { useAnexarPdf, useAtualizarTopicoLink, useCriarTopicoLink, useExcluirTopicoLink, removerArquivosPdf } from "@/api/topicoLinks";
import { useCriarTopicoTexto, useExcluirTopicoTexto } from "@/api/topicoTextos";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/Button";
import { Input, Select } from "@/components/Field";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { STATUS_INFO } from "./statusInfo";
import { corDesempenho } from "./desempenho";
import { RegistroQuestoes } from "./RegistroQuestoes";
import { TextoReaderModal } from "./TextoReaderModal";

const TIPO_LINK: Record<string, string> = {
  questoes: "✍️",
  aula: "🎬",
  pdf: "📄",
  resumo: "📝",
  outro: "🔗",
};

type Painel = null | "links" | "questoes" | "textos";

interface Props {
  topico: Topico;
  links: TopicoLink[];
  logs: QuestaoLog[];
  textos: TopicoTexto[];
  /** Último tópico da lista: não mostra linha divisória "solta" no fim. */
  isLast?: boolean;
}

export function TopicoRow({ topico, links, logs, textos, isLast }: Props) {
  const setStatus = useSetTopicoStatus();
  const setSeparador = useSetTopicoSeparador();
  const atualizar = useAtualizarTopico();
  const excluirTopico = useExcluirTopico();
  const criarLink = useCriarTopicoLink();
  const atualizarLink = useAtualizarTopicoLink();
  const excluirLink = useExcluirTopicoLink();
  const anexarPdf = useAnexarPdf();
  const criarTexto = useCriarTopicoTexto();
  const excluirTexto = useExcluirTopicoTexto();
  const { session } = useAuth();
  const arquivoRef = useRef<HTMLInputElement>(null);

  const [painel, setPainel] = useState<Painel>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [editando, setEditando] = useState(false);
  const [tituloEdit, setTituloEdit] = useState(topico.titulo);
  const [textoAberto, setTextoAberto] = useState<TopicoTexto | null>(null);

  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [novoTipo, setNovoTipo] = useState("questoes");
  const [editandoLink, setEditandoLink] = useState<TopicoLink | null>(null);

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

  function abrirEdicao() {
    setTituloEdit(topico.titulo);
    setEditando(true);
  }

  async function salvarTitulo() {
    const t = tituloEdit.trim();
    setEditando(false);
    if (!t || t === topico.titulo) {
      setTituloEdit(topico.titulo);
      return;
    }
    try {
      await atualizar.mutateAsync({ id: topico.id, titulo: t });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setTituloEdit(topico.titulo);
    }
  }

  function limparFormLink() {
    setEditandoLink(null);
    setNovoTitulo("");
    setNovaUrl("");
    setNovoTipo("questoes");
  }

  function abrirNovoLink() {
    limparFormLink();
    alternar("links");
  }

  function iniciarEdicaoLink(l: TopicoLink) {
    setEditandoLink(l);
    setNovoTitulo(l.titulo);
    setNovaUrl(l.url);
    setNovoTipo(l.tipo);
    setPainel("links");
  }

  async function onSubmitLink(e: FormEvent) {
    e.preventDefault();
    try {
      const url = novaUrl.trim().startsWith("http") ? novaUrl.trim() : `https://${novaUrl.trim()}`;
      const dados = { titulo: novoTitulo.trim() || novoTipo, url, tipo: novoTipo };
      if (editandoLink) {
        await atualizarLink.mutateAsync({ id: editandoLink.id, ...dados });
      } else {
        await criarLink.mutateAsync({ topico_id: topico.id, ...dados });
      }
      limparFormLink();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onArquivoSelecionado(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reenviar o mesmo arquivo depois
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Selecione um arquivo PDF.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("O PDF deve ter no máximo 50 MB.");
      return;
    }
    if (!session) {
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }
    try {
      await anexarPdf.mutateAsync({
        file,
        topico_id: topico.id,
        user_id: session.user.id,
        titulo: novoTitulo,
      });
      limparFormLink();
      toast.success("PDF enviado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onNovoTexto() {
    try {
      const novo = await criarTexto.mutateAsync({
        topico_id: topico.id,
        titulo: "Texto de lei",
        ordem: textos.length,
      });
      setTextoAberto(novo);
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
        {editando ? (
          <input
            autoFocus
            value={tituloEdit}
            onChange={(e) => setTituloEdit(e.target.value)}
            onBlur={salvarTitulo}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                salvarTitulo();
              } else if (e.key === "Escape") {
                setTituloEdit(topico.titulo);
                setEditando(false);
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-line bg-navy-950 px-2 py-1 text-sm text-txt outline-none focus:border-gold/60"
            placeholder="Nome do assunto"
          />
        ) : (
          <span
            onDoubleClick={abrirEdicao}
            className={`min-w-0 flex-1 text-sm leading-snug ${
              status === "concluido" ? "text-mut" : "text-txt"
            }`}
          >
            {topico.titulo}
          </span>
        )}

        {/* renomear assunto */}
        {!editando && (
          <button
            onClick={abrirEdicao}
            className="shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-navy-600 hover:text-dim group-hover/topico:opacity-100 max-md:opacity-100"
            title="Renomear assunto"
            aria-label={`Renomear ${topico.titulo}`}
          >
            <Pencil className="size-3.5" />
          </button>
        )}

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
          {resumo.pct !== null && (
            <span className="tabular-nums">
              {resumo.total}Q · {resumo.pct}%
            </span>
          )}
        </button>

        {/* textos de lei */}
        <button
          onClick={() => alternar("textos")}
          className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors ${
            textos.length > 0
              ? "text-gold hover:bg-gold/10"
              : "text-mut opacity-0 hover:bg-navy-600 group-hover/topico:opacity-100 max-md:opacity-100"
          } ${painel === "textos" ? "ring-1 ring-line" : ""}`}
          title="Textos de lei deste assunto"
        >
          <BookOpen className="size-3.5" />
          {textos.length > 0 && <span className="font-semibold">{textos.length}</span>}
        </button>

        {/* adicionar/gerenciar links */}
        <button
          onClick={abrirNovoLink}
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

        {/* linha divisória após o assunto: agrupa assuntos estudados juntos */}
        <button
          onClick={() =>
            setSeparador.mutate({ id: topico.id, separador_apos: !topico.separador_apos })
          }
          className={`flex shrink-0 cursor-pointer items-center rounded-md p-1 transition-colors ${
            topico.separador_apos
              ? "text-gold hover:bg-gold/10"
              : "text-mut opacity-0 hover:bg-navy-600 hover:text-dim group-hover/topico:opacity-100 max-md:opacity-100"
          }`}
          title={
            topico.separador_apos
              ? "Remover linha divisória após este assunto"
              : "Adicionar linha divisória após este assunto"
          }
          aria-label={
            topico.separador_apos ? "Remover linha divisória" : "Adicionar linha divisória"
          }
        >
          <SeparatorHorizontal className="size-3.5" />
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
                onClick={() => iniciarEdicaoLink(l)}
                className={`flex h-full items-center px-1 opacity-0 transition-colors hover:text-gold group-hover/chip:opacity-100 max-md:opacity-100 ${
                  editandoLink?.id === l.id ? "text-gold opacity-100" : "text-mut"
                }`}
                aria-label={`Editar link ${l.titulo}`}
                title="Editar link"
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={() => excluirLink.mutate(l)}
                className="flex h-full items-center px-1 pr-1.5 text-mut opacity-0 transition-colors hover:text-red group-hover/chip:opacity-100 max-md:opacity-100"
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
        <div className="mb-2 ml-7 rounded-lg border border-line/50 bg-navy-900/60 p-3">
          <RegistroQuestoes materiaId={topico.materia_id} topicoId={topico.id} logs={logs} />
        </div>
      )}

      {/* Painel: textos de lei do assunto. */}
      {painel === "textos" && (
        <div className="mb-2 ml-7 space-y-2 rounded-lg border border-line/50 bg-navy-900/60 p-3">
          {textos.length === 0 ? (
            <p className="text-xs text-mut">
              Nenhum texto ainda. Adicione o texto de lei deste assunto para ler aqui, marcar e
              acompanhar as leituras.
            </p>
          ) : (
            <ul className="space-y-1">
              {textos.map((t) => (
                <li key={t.id} className="group/txt flex items-center gap-1">
                  <button
                    onClick={() => setTextoAberto(t)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-txt transition-colors hover:bg-navy-700/50"
                  >
                    <BookOpen className="size-3.5 shrink-0 text-gold" />
                    <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                    {t.leituras > 0 && (
                      <span className="shrink-0 text-[10px] tabular-nums text-mut">
                        Lido {t.leituras}x
                      </span>
                    )}
                  </button>
                  <a
                    href={`/texto/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-navy-700 hover:text-gold group-hover/txt:opacity-100 max-md:opacity-100"
                    aria-label={`Abrir ${t.titulo} em tela cheia`}
                    title="Abrir em tela cheia (nova aba)"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    onClick={() => excluirTexto.mutate(t.id)}
                    className="shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-red/10 hover:text-red group-hover/txt:opacity-100 max-md:opacity-100"
                    aria-label={`Excluir ${t.titulo}`}
                    title="Excluir texto"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={onNovoTexto}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-dim transition-colors hover:text-gold"
          >
            <Plus className="size-3.5" /> Novo texto
          </button>
        </div>
      )}

      {/* Painel: adicionar/editar link (só abre no clique). */}
      {painel === "links" && (
        <div className="mb-2 ml-7 rounded-lg border border-line/50 bg-navy-900/60 p-3">
          {editandoLink && (
            <p className="mb-2 text-xs font-medium text-gold">Editando link</p>
          )}
          <form onSubmit={onSubmitLink} className="flex flex-wrap items-center gap-2">
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
            <Button
              size="sm"
              type="submit"
              variant="secondary"
              loading={editandoLink ? atualizarLink.isPending : criarLink.isPending}
            >
              {editandoLink ? (
                <>
                  <Check className="size-3.5" /> Salvar
                </>
              ) : (
                <>
                  <Plus className="size-3.5" /> Adicionar
                </>
              )}
            </Button>
            {editandoLink && (
              <Button size="sm" type="button" variant="ghost" onClick={limparFormLink}>
                Cancelar
              </Button>
            )}
          </form>
          {!editandoLink && (
            <div className="mt-2 flex items-center gap-2 border-t border-line/30 pt-2">
              <span className="text-xs text-mut">ou envie um arquivo do seu computador:</span>
              <input
                ref={arquivoRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={onArquivoSelecionado}
              />
              <Button
                size="sm"
                type="button"
                variant="ghost"
                loading={anexarPdf.isPending}
                onClick={() => arquivoRef.current?.click()}
              >
                <FileUp className="size-3.5" /> Enviar PDF
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Linha divisória que separa este assunto do próximo grupo. */}
      {topico.separador_apos && !isLast && (
        <div className="mx-2 my-2.5 border-t border-dashed border-line" role="separator" />
      )}

      {textoAberto && (
        <TextoReaderModal texto={textoAberto} onClose={() => setTextoAberto(null)} />
      )}

      <ConfirmDialog
        open={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={() => {
          removerArquivosPdf(links).catch(() => {}); // limpa PDFs órfãos do Storage
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
