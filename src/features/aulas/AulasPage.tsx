import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, MonitorPlay, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { Aula, Materia } from "@/types/db";
import { useAulas, useAtualizarAula, useCriarAula, useExcluirAula } from "@/api/aulas";
import { concursoDeEstudo, useConcursos } from "@/api/concursos";
import { useConcursoMaterias, useMaterias } from "@/api/materias";
import { getConcursoAtual } from "@/lib/currentConcurso";
import { EmptyState } from "@/components/EmptyState";
import { FullScreenSpinner } from "@/components/Spinner";
import { MenuMais } from "@/components/MenuMais";
import { formatarParei, idYoutube, lerParei, linkContinuar, miniatura, site } from "./tempo";

/**
 * Seção "Aulas": links de aulas para assistir no tempo livre, separados por matéria.
 * Em cada aula ele anota onde parou e marca quando terminar. No YouTube, o botão
 * "Continuar" abre o vídeo já no ponto em que parou. Abre em aba própria.
 */
export function AulasPage() {
  const navigate = useNavigate();
  const { data: aulas, isLoading } = useAulas();
  const { data: materias, isLoading: carregandoMaterias } = useMaterias();
  const { data: concursos } = useConcursos();
  const { data: vinculos } = useConcursoMaterias();
  const [filtro, setFiltro] = useState<"assistir" | "concluidas">("assistir");
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    const anterior = document.title;
    document.title = "Aulas";
    return () => {
      document.title = anterior;
    };
  }, []);

  // Matérias do concurso em estudo, na ordem do edital (as riscadas ficam de fora).
  const materiasDoConcurso = useMemo(() => {
    const lista = (concursos ?? []).filter((c) => c.status !== "arquivado");
    const atual = lista.find((c) => c.id === getConcursoAtual()) ?? concursoDeEstudo(lista);
    const porId = new Map((materias ?? []).map((m) => [m.id, m]));
    return (vinculos ?? [])
      .filter((v) => v.concurso_id === atual?.id && !v.riscada)
      .sort((a, b) => a.ordem - b.ordem)
      .map((v) => porId.get(v.materia_id))
      .filter((m): m is Materia => !!m);
  }, [concursos, vinculos, materias]);

  const paraAssistir = (aulas ?? []).filter((a) => !a.concluida);
  const concluidas = (aulas ?? []).filter((a) => a.concluida);
  const visiveis = filtro === "assistir" ? paraAssistir : concluidas;

  // Grupos por matéria: primeiro as do edital (na ordem dele), depois as outras e,
  // por último, "Sem matéria".
  const grupos = useMemo(() => {
    const posicao = new Map(materiasDoConcurso.map((m, i) => [m.id, i]));
    const mapa = new Map<string | null, Aula[]>();
    for (const a of visiveis) {
      const l = mapa.get(a.materia_id) ?? [];
      l.push(a);
      mapa.set(a.materia_id, l);
    }
    const nome = (id: string | null) => materias?.find((m) => m.id === id)?.nome ?? "";
    return [...mapa.entries()].sort(([a], [b]) => {
      if (a === null) return 1;
      if (b === null) return -1;
      const pa = posicao.get(a) ?? 999;
      const pb = posicao.get(b) ?? 999;
      return pa !== pb ? pa - pb : nome(a).localeCompare(nome(b));
    });
  }, [visiveis, materiasDoConcurso, materias]);

  if (isLoading || carregandoMaterias) return <FullScreenSpinner />;

  const materiaPorId = new Map((materias ?? []).map((m) => [m.id, m]));

  function voltar() {
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line/50 bg-navy-900/90 px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
        <button
          onClick={voltar}
          className="shrink-0 cursor-pointer rounded-lg p-2 text-mut transition-colors hover:bg-navy-700 hover:text-txt sm:p-1.5"
          title="Voltar"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" />
        </button>
        <MonitorPlay className="size-4 shrink-0 text-gold max-sm:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold leading-snug text-txt sm:text-base">Aulas</h1>
          <p className="truncate text-[11px] text-mut">
            {paraAssistir.length} para assistir · {concluidas.length}{" "}
            {concluidas.length === 1 ? "concluída" : "concluídas"}
          </p>
        </div>
        {!adicionando && (
          <button
            onClick={() => setAdicionando(true)}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-950 transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" /> Adicionar aula
          </button>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 pb-24 pt-4 sm:px-6 sm:py-6">
        {adicionando && (
          <FormAula
            materias={materiasDoConcurso}
            onFechar={() => setAdicionando(false)}
            onSalvo={() => {
              setAdicionando(false);
              setFiltro("assistir");
            }}
          />
        )}

        {!aulas?.length ? (
          !adicionando && (
            <EmptyState
              icon="🎬"
              title="Nenhuma aula guardada"
              message="Toque em “Adicionar aula”, cole o link (do YouTube ou de outro site) e escolha a matéria. Depois é só anotar onde parou e marcar quando terminar."
            />
          )
        ) : (
          <>
            <div className="flex gap-1.5">
              <Aba ativa={filtro === "assistir"} onClick={() => setFiltro("assistir")}>
                Para assistir · {paraAssistir.length}
              </Aba>
              <Aba ativa={filtro === "concluidas"} onClick={() => setFiltro("concluidas")}>
                Concluídas · {concluidas.length}
              </Aba>
            </div>

            {!visiveis.length ? (
              <p className="rounded-xl border border-dashed border-line/60 px-4 py-8 text-center text-sm text-mut">
                {filtro === "assistir"
                  ? "Nenhuma aula esperando. Tudo assistido!"
                  : "Nenhuma aula concluída ainda."}
              </p>
            ) : (
              grupos.map(([materiaId, lista]) => {
                const materia = materiaId ? materiaPorId.get(materiaId) : undefined;
                return (
                  <section key={materiaId ?? "sem"} className="space-y-2">
                    <h2 className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-mut">
                      <span className="text-base normal-case">{materia?.icone ?? "📂"}</span>
                      <span className="truncate">{materia?.nome ?? "Sem matéria"}</span>
                      <span className="tabular-nums">· {lista.length}</span>
                    </h2>
                    <ul className="space-y-2">
                      {lista.map((a) => (
                        <CardAula key={a.id} aula={a} materias={materiasDoConcurso} />
                      ))}
                    </ul>
                  </section>
                );
              })
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Aba({ ativa, onClick, children }: { ativa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors ${
        ativa ? "border-gold/60 bg-gold/15 text-gold" : "border-line/60 text-dim hover:border-line hover:text-txt"
      }`}
    >
      {children}
    </button>
  );
}

const campo =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-navy-950 px-3 text-sm text-txt outline-none placeholder:text-mut/70 focus:border-gold/60";

/** Título do vídeo pelo oEmbed do YouTube (se der; senão fica em branco). */
async function tituloDoYoutube(url: string): Promise<string | null> {
  if (!idYoutube(url)) return null;
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(linkContinuar(url, 0))}`
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { title?: string };
    return j.title?.trim() || null;
  } catch {
    return null;
  }
}

/** Formulário para adicionar ou editar uma aula: link, título e matéria. */
function FormAula({
  aula,
  materias,
  onFechar,
  onSalvo,
}: {
  aula?: Aula;
  materias: Materia[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const criar = useCriarAula();
  const atualizar = useAtualizarAula();
  const [url, setUrl] = useState(aula?.url ?? "");
  const [titulo, setTitulo] = useState(aula?.titulo ?? "");
  const [materiaId, setMateriaId] = useState<string>(aula?.materia_id ?? "");
  const [buscandoTitulo, setBuscandoTitulo] = useState(false);

  async function preencherTitulo(link: string) {
    if (titulo.trim() || !link.trim()) return;
    setBuscandoTitulo(true);
    const t = await tituloDoYoutube(link.trim());
    setBuscandoTitulo(false);
    if (t) setTitulo((atual) => atual || t);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const link = url.trim();
    if (!link) {
      toast.error("Cole o link da aula.");
      return;
    }
    const dados = {
      url: link,
      titulo: titulo.trim() || (await tituloDoYoutube(link)) || "",
      materia_id: materiaId || null,
    };
    try {
      if (aula) await atualizar.mutateAsync({ id: aula.id, ...dados });
      else await criar.mutateAsync(dados);
      toast.success(aula ? "Aula atualizada." : "Aula adicionada.");
      onSalvo();
    } catch {
      toast.error("Não consegui salvar a aula. Tente de novo.");
    }
  }

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <form
      onSubmit={salvar}
      className="space-y-2.5 rounded-xl border border-gold/30 bg-navy-900/70 p-3.5 shadow-card"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-gold">
          {aula ? "Editar aula" : "Nova aula"}
        </p>
        <button
          type="button"
          onClick={onFechar}
          className="cursor-pointer rounded-md p-1 text-mut transition-colors hover:text-txt"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={(e) => preencherTitulo(e.target.value)}
        onPaste={(e) => preencherTitulo(e.clipboardData.getData("text"))}
        placeholder="Link da aula (YouTube ou outro site)"
        inputMode="url"
        autoFocus={!aula}
        className={campo}
      />
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder={buscandoTitulo ? "Buscando o título do vídeo…" : "Título (se ficar em branco, uso o do vídeo)"}
        className={campo}
      />
      <select value={materiaId} onChange={(e) => setMateriaId(e.target.value)} className={`${campo} cursor-pointer`}>
        <option value="">Sem matéria</option>
        {materias.map((m) => (
          <option key={m.id} value={m.id}>
            {m.icone} {m.nome}
          </option>
        ))}
      </select>
      <div className="flex justify-end gap-2 pt-0.5">
        <button
          type="button"
          onClick={onFechar}
          className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-dim transition-colors hover:text-txt"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando}
          className="cursor-pointer rounded-lg bg-gold px-4 py-2 text-xs font-bold text-navy-950 transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

/** Uma aula: miniatura, título, "Parei em", continuar e concluída. */
function CardAula({ aula, materias }: { aula: Aula; materias: Materia[] }) {
  const atualizar = useAtualizarAula();
  const excluir = useExcluirAula();
  const [editando, setEditando] = useState(false);
  const [parei, setParei] = useState(formatarParei(aula.parei_seg));

  // Se o valor mudar por fora (outra aba, edição), o campo acompanha.
  useEffect(() => {
    setParei(formatarParei(aula.parei_seg));
  }, [aula.parei_seg]);

  if (editando) {
    return (
      <li>
        <FormAula aula={aula} materias={materias} onFechar={() => setEditando(false)} onSalvo={() => setEditando(false)} />
      </li>
    );
  }

  const thumb = miniatura(aula.url);
  const ehYoutube = !!idYoutube(aula.url);
  const link = linkContinuar(aula.url, aula.parei_seg);

  function salvarParei() {
    const seg = lerParei(parei);
    if (seg === null) {
      toast.error("Não entendi o tempo. Escreva assim: 12:34 ou 1:02:34.");
      setParei(formatarParei(aula.parei_seg));
      return;
    }
    setParei(formatarParei(seg));
    if (seg !== aula.parei_seg) atualizar.mutate({ id: aula.id, parei_seg: seg });
  }

  function alternarConcluida() {
    const concluida = !aula.concluida;
    atualizar.mutate(
      { id: aula.id, concluida, concluida_em: concluida ? new Date().toISOString() : null },
      { onSuccess: () => toast.success(concluida ? "Aula concluída." : "Aula voltou para assistir.") }
    );
  }

  function apagar() {
    if (!window.confirm(`Excluir a aula "${aula.titulo || site(aula.url)}"?`)) return;
    excluir.mutate(aula.id, { onSuccess: () => toast.success("Aula excluída.") });
  }

  return (
    <li
      className={`rounded-xl border p-3 transition-colors ${
        aula.concluida ? "border-green/25 bg-green/5" : "border-line/50 bg-navy-900/40"
      }`}
    >
      <div className="flex gap-3">
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="relative block aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-navy-700/70 sm:w-36"
          title="Abrir a aula"
        >
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-mut">
              <MonitorPlay className="size-6" />
            </span>
          )}
          {aula.parei_seg > 0 && !aula.concluida && (
            <span className="absolute bottom-1 right-1 rounded bg-navy-950/85 px-1 text-[10px] font-semibold tabular-nums text-txt">
              {formatarParei(aula.parei_seg)}
            </span>
          )}
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="line-clamp-2 text-sm font-semibold leading-snug text-txt [overflow-wrap:anywhere] hover:underline"
          >
            {aula.titulo || site(aula.url)}
          </a>
          <p className="mt-0.5 truncate text-[11px] text-mut">
            {ehYoutube ? "YouTube" : site(aula.url)}
            {aula.concluida && aula.concluida_em && (
              <> · concluída em {format(parseISO(aula.concluida_em), "dd/MM")}</>
            )}
          </p>
        </div>
        <MenuMais
          itens={[
            { icone: <Pencil className="size-4" />, label: "Editar", onClick: () => setEditando(true) },
            { icone: <Trash2 className="size-4" />, label: "Excluir", onClick: apagar, danger: true },
          ]}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-dim">
          Parei em
          <input
            value={parei}
            onChange={(e) => setParei(e.target.value)}
            onBlur={salvarParei}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            onFocus={(e) => e.currentTarget.select()}
            inputMode="numeric"
            placeholder="0:00"
            aria-label="Tempo em que parou"
            className="h-8 w-20 rounded-lg border border-line bg-navy-950 px-2 text-center text-sm tabular-nums text-txt outline-none focus:border-gold/60"
          />
        </label>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-line/70 px-2.5 py-1.5 text-xs font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold"
        >
          <Play className="size-3.5" />
          {aula.parei_seg > 0 && ehYoutube ? `Continuar de ${formatarParei(aula.parei_seg)}` : "Assistir"}
        </a>
        <button
          onClick={alternarConcluida}
          className={`ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            aula.concluida
              ? "border-green/40 bg-green/15 text-green"
              : "border-line/70 text-dim hover:border-green/50 hover:text-green"
          }`}
          aria-pressed={aula.concluida}
        >
          <Check className="size-3.5" />
          {aula.concluida ? "Concluída" : "Marcar concluída"}
        </button>
      </div>
    </li>
  );
}
