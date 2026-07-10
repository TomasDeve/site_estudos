import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useTopicoTextos } from "@/api/topicoTextos";
import { FullScreenSpinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { TextoReader, TituloTextoInput } from "./TextoReader";

/** Página dedicada de um texto/resumo — leitura imersiva em tela cheia (abre em outra aba). */
export function TextoLeiPage() {
  const { textoId } = useParams();
  const navigate = useNavigate();
  const { data: textos, isLoading } = useTopicoTextos();

  const texto = (textos ?? []).find((t) => t.id === textoId);

  // Nome do texto na aba do navegador, já que a página vive em aba própria.
  useEffect(() => {
    if (!texto) return;
    const anterior = document.title;
    document.title = texto.titulo;
    return () => {
      document.title = anterior;
    };
  }, [texto]);

  if (isLoading) return <FullScreenSpinner />;

  if (!texto) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon="🔍"
          title="Texto não encontrado"
          message="Ele pode ter sido excluído."
          action={
            <Link to="/" className="text-sm font-semibold text-gold hover:underline">
              ← Ir para o painel
            </Link>
          }
        />
      </div>
    );
  }

  function voltar() {
    // Aba aberta direto no texto não tem histórico: tenta fechar a aba.
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-line/50 bg-navy-900/90 px-4 py-3">
        <button
          onClick={voltar}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-mut transition-colors hover:bg-navy-700 hover:text-txt"
          title="Voltar"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
        <BookOpen className="size-4 shrink-0 text-gold" />
        <TituloTextoInput
          texto={texto}
          className="w-full max-w-xl rounded-md bg-transparent px-1 py-0.5 text-base font-semibold text-txt outline-none hover:bg-navy-700/60 focus:bg-navy-900"
        />
      </header>

      <main className="flex min-h-0 w-full flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4">
        <TextoReader texto={texto} paginaCheia />
      </main>
    </div>
  );
}
