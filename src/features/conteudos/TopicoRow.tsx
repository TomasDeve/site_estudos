import { useState, type FormEvent } from "react";
import { Link2, Trash2, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Topico, TopicoLink, TopicoStatus } from "@/types/db";
import { CICLO_STATUS, useExcluirTopico, useSetTopicoStatus } from "@/api/topicos";
import { useCriarTopicoLink, useExcluirTopicoLink } from "@/api/topicoLinks";
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

interface Props {
  topico: Topico;
  links: TopicoLink[];
}

export function TopicoRow({ topico, links }: Props) {
  const setStatus = useSetTopicoStatus();
  const excluirTopico = useExcluirTopico();
  const criarLink = useCriarTopicoLink();
  const excluirLink = useExcluirTopicoLink();

  const [linksAbertos, setLinksAbertos] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [novoTipo, setNovoTipo] = useState("questoes");

  const status = topico.status as TopicoStatus;
  const info = STATUS_INFO[status];

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

  return (
    <li className="group/topico">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-navy-700/40">
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

        <button
          onClick={() => setLinksAbertos((v) => !v)}
          className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs transition-colors ${
            links.length > 0
              ? "text-gold hover:bg-gold/10"
              : "text-mut opacity-0 hover:bg-navy-600 group-hover/topico:opacity-100 max-md:opacity-100"
          }`}
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

      {linksAbertos && (
        <div className="mb-2 ml-7 space-y-2 rounded-lg border border-line/50 bg-navy-900/60 p-3">
          {links.length > 0 && (
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-sm">
                  <span>{TIPO_LINK[l.tipo] ?? "🔗"}</span>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-blue hover:underline"
                  >
                    {l.titulo} <ExternalLink className="size-3 shrink-0" />
                  </a>
                  <button
                    onClick={() => excluirLink.mutate(l.id)}
                    className="cursor-pointer p-0.5 text-mut hover:text-red"
                    aria-label={`Excluir link ${l.titulo}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
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
