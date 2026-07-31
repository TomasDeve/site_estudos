import { useEffect, useRef, useState } from "react";
import { NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { useAtualizarTopicoTexto } from "@/api/topicoTextos";
import {
  chaveDestinoResumo,
  lerResumoAberto,
  substituirResumoAberto,
} from "./ResumoRapido";
import {
  corpoBlocoQuestao,
  removerBlocoQuestao,
  substituirCorpoBlocoQuestao,
} from "./resumoBlocos";

interface Props {
  questaoId: string;
  /** Onde o trecho vive: resumo do assunto (caderno) ou da matéria (misturado). */
  destino: { topicoId?: string; materiaId?: string };
  /** Id do texto do resumo no banco — usado para gravar quando o painel está fechado. */
  resumoTextoId: string | undefined;
  /** Conteúdo do resumo no banco (fallback quando o painel não está aberto). */
  conteudoBanco: string;
  /** A questão saiu do resumo — a página esquece dela (o botão volta a "Adicionar"). */
  onRemovido: () => void;
  onClose: () => void;
}

/**
 * "No resumo": mostra só o trecho que entrou no resumo a partir desta questão e
 * deixa editar ou remover apenas ele. Enquanto o painel "Resumo rápido" do mesmo
 * destino está aberto, ele é a fonte da verdade (edições que ainda não salvaram
 * também aparecem aqui); senão, trabalha direto sobre o texto do banco.
 */
export function EditarTrechoResumoModal({
  questaoId,
  destino,
  resumoTextoId,
  conteudoBanco,
  onRemovido,
  onClose,
}: Props) {
  const atualizar = useAtualizarTopicoTexto();
  const editorRef = useRef<HTMLDivElement>(null);
  const [salvando, setSalvando] = useState(false);

  const chave = chaveDestinoResumo(destino);
  // O painel aberto (se for deste destino) vence o banco: pega o que está à vista.
  const conteudoAtual = lerResumoAberto(chave) ?? conteudoBanco;
  const corpoInicial = corpoBlocoQuestao(conteudoAtual, questaoId);
  const naoAchou = corpoInicial == null;

  useEffect(() => {
    if (editorRef.current && corpoInicial != null) {
      editorRef.current.innerHTML = corpoInicial;
    }
    // Só na abertura: o corpo inicial é o retrato do trecho neste momento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Grava o resumo inteiro: pelo painel aberto (salva sozinho) ou direto no banco. */
  async function persistir(novoConteudo: string) {
    if (substituirResumoAberto(chave, novoConteudo)) return;
    if (resumoTextoId) {
      await atualizar.mutateAsync({ id: resumoTextoId, conteudo: novoConteudo });
    }
  }

  async function salvar() {
    const corpo = editorRef.current?.innerHTML ?? "";
    const novo = substituirCorpoBlocoQuestao(conteudoAtual, questaoId, corpo);
    if (novo == null) {
      toast.error("Não achei mais este trecho no resumo.");
      onClose();
      return;
    }
    setSalvando(true);
    try {
      await persistir(novo);
      toast.success("Trecho atualizado 📝");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setSalvando(false);
    }
  }

  async function remover() {
    setSalvando(true);
    try {
      await persistir(removerBlocoQuestao(conteudoAtual, questaoId));
      onRemovido();
      toast.success("Trecho removido do resumo.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
      setSalvando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-lg"
      title={
        <span className="flex items-center gap-2">
          <NotebookPen className="size-4 shrink-0 text-gold" /> Trecho no resumo
        </span>
      }
      footer={
        naoAchou ? (
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        ) : (
          <>
            <Button variant="danger" onClick={remover} loading={salvando} className="mr-auto">
              <Trash2 className="size-4" /> Remover do resumo
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvar} loading={salvando}>
              Salvar
            </Button>
          </>
        )
      }
    >
      {naoAchou ? (
        <p className="text-sm text-dim">
          Este trecho não está mais no resumo — ele pode ter sido apagado direto no bloco de
          notas. Você pode adicioná-lo de novo pela própria questão.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs leading-relaxed text-mut">
            Isto foi o que entrou no seu resumo a partir desta questão. Edite à vontade — é a
            mesma anotação que aparece no “Resumo rápido”.
          </p>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="conteudo-lei min-h-32 max-h-[50dvh] overflow-y-auto rounded-lg border border-line bg-navy-950 px-3 py-2.5 outline-none focus:border-gold/60"
          />
        </>
      )}
    </Modal>
  );
}
