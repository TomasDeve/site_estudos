import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Bot, Camera, ClipboardCopy, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { ConcursoMateria, Redacao } from "@/types/db";
import {
  enviarFotosRedacao,
  removerFotosRedacao,
  urlFotoRedacao,
  useAtualizarRedacao,
  useCriarRedacao,
  useExcluirRedacao,
} from "@/api/redacoes";
import { useAtualizarConcursoMateria } from "@/api/materias";
import { useAuth } from "@/auth/AuthProvider";
import { fmtData, hojeISO } from "@/lib/dates";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { Field, Input, Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { RegraRedacao } from "@/features/informacoes/infoConcursos";
import { notaCebraspe, promptCorrecao } from "./redacaoNota";

const META_PADRAO = 7;

function fmtNota(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

interface Props {
  concursoId: string;
  materiaId: string;
  cor: string;
  /** vínculo da matéria no concurso (guarda a meta de redações). */
  vinculo?: ConcursoMateria;
  redacoes: Redacao[];
  /** Regra de correção do concurso (nota máxima, mínimo, fórmula do Cebraspe). */
  regra?: RegraRedacao;
}

/**
 * Redações de treino: foto da folha, correção (feita com IA, colada aqui) e nota.
 * Aparece nas matérias do tipo redação.
 */
export function RedacoesPanel({ concursoId, materiaId, cor, vinculo, redacoes, regra }: Props) {
  const setMeta = useAtualizarConcursoMateria();
  const excluir = useExcluirRedacao();

  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Redacao | null>(null);
  const [vendoId, setVendoId] = useState<string | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<Redacao | null>(null);

  // Antes da migração 0039 as colunas novas não vêm do banco: assume vazio.
  const lista = redacoes
    .map((r) => ({ ...r, fotos: r.fotos ?? [], correcao: r.correcao ?? "" }))
    .sort((a, b) => a.numero - b.numero);
  const vendo = lista.find((r) => r.id === vendoId) ?? null;
  const feitas = lista.length;
  const meta = vinculo?.meta ?? META_PADRAO;
  const comNota = lista.filter((r) => r.nota != null);
  const media =
    comNota.length > 0 ? comNota.reduce((s, r) => s + (r.nota ?? 0), 0) / comNota.length : null;
  const ultima = comNota.at(-1) ?? null;
  const melhor = comNota.reduce<Redacao | null>((m, r) => (!m || (r.nota ?? 0) > (m.nota ?? 0) ? r : m), null);
  const pct = meta > 0 ? Math.min(100, Math.round((feitas / meta) * 100)) : 0;
  const proximoNumero = lista.reduce((m, r) => Math.max(m, r.numero), 0) + 1;

  // meta editável, sincronizada com o vínculo.
  const [metaEdit, setMetaEdit] = useState(String(meta));
  useEffect(() => setMetaEdit(String(vinculo?.meta ?? META_PADRAO)), [vinculo?.meta]);

  function salvarMeta() {
    const n = Math.max(1, Math.round(Number(metaEdit) || META_PADRAO));
    setMetaEdit(String(n));
    if (!vinculo || n === (vinculo.meta ?? META_PADRAO)) return;
    setMeta.mutate(
      { id: vinculo.id, meta: n },
      { onError: (e) => toast.error(e instanceof Error ? e.message : String(e)) }
    );
  }

  function abrirNova() {
    setEditando(null);
    setFormAberto(true);
  }
  function abrirEdicao(r: Redacao) {
    setVendoId(null);
    setEditando(r);
    setFormAberto(true);
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-txt">✍️ Minhas redações</h2>
            {regra && (
              <p className="mt-0.5 text-xs text-mut">
                Vale {regra.notaMax} pontos · mínimo {regra.minimo} · até {regra.linhas} linhas
                {regra.formulaCebraspe && " · nota = conteúdo − 6 × erros ÷ linhas"}
              </p>
            )}
          </div>
          <Button size="sm" variant="secondary" onClick={abrirNova}>
            <Plus className="size-4" /> Nova redação
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon="📝" label="Redações feitas" value={`${feitas}/${meta}`} />
          <StatCard
            icon="⭐"
            label="Média"
            value={media != null ? fmtNota(media) : "—"}
            sub={comNota.length > 0 ? `${comNota.length} com nota` : "sem notas ainda"}
          />
          <StatCard
            icon="🕒"
            label="Última nota"
            value={ultima ? fmtNota(ultima.nota!) : "—"}
            sub={ultima ? `redação ${ultima.numero}` : undefined}
          />
          <StatCard
            icon="🏆"
            label="Melhor nota"
            value={melhor ? fmtNota(melhor.nota!) : "—"}
            sub={melhor ? `redação ${melhor.numero}` : undefined}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-40 flex-1">
            <ProgressBar value={pct} color={cor} size="md" showLabel />
          </div>
          <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-dim">
            Meta até a prova
            <Input
              type="number"
              min={1}
              value={metaEdit}
              onChange={(e) => setMetaEdit(e.target.value)}
              onBlur={salvarMeta}
              className="!h-8 !w-16 !px-2 text-center text-sm"
              aria-label="Meta de redações até a prova"
            />
          </label>
        </div>

        {comNota.length >= 2 && <Evolucao redacoes={comNota} cor={cor} regra={regra} />}

        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line/60 bg-navy-900/40 px-4 py-6 text-center text-sm text-mut">
            Nenhuma redação lançada ainda. Toque em <strong className="text-dim">Nova redação</strong> para
            enviar a foto da folha, colar a correção da IA e registrar a nota.
          </p>
        ) : (
          <ul className="space-y-2">
            {[...lista].reverse().map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => setVendoId(r.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line/50 bg-navy-900/50 px-3 py-2.5 text-left transition-colors hover:border-line hover:bg-navy-700/40"
                >
                  <Miniatura redacao={r} cor={cor} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-txt">
                      {r.tema.trim() || `Redação ${r.numero}`}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-mut">
                      <span>
                        nº {r.numero} · {fmtData(r.data)}
                      </span>
                      {r.fotos.length > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Camera className="size-3" /> {r.fotos.length}
                        </span>
                      )}
                      {r.correcao.trim() && (
                        <span className="inline-flex items-center gap-0.5">
                          <Bot className="size-3" /> corrigida
                        </span>
                      )}
                    </p>
                  </div>
                  <BadgeNota redacao={r} cor={cor} regra={regra} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>

      {vendo && (
        <DetalheModal
          redacao={vendo}
          cor={cor}
          regra={regra}
          onClose={() => setVendoId(null)}
          onEditar={() => abrirEdicao(vendo)}
          onExcluir={() => setExcluirAlvo(vendo)}
        />
      )}

      {formAberto && (
        <RedacaoFormModal
          concursoId={concursoId}
          materiaId={materiaId}
          proximoNumero={proximoNumero}
          redacao={editando}
          regra={regra}
          onClose={() => setFormAberto(false)}
        />
      )}

      <ConfirmDialog
        open={excluirAlvo != null}
        onClose={() => setExcluirAlvo(null)}
        onConfirm={() => {
          if (excluirAlvo) {
            excluir.mutate(
              { id: excluirAlvo.id, fotos: excluirAlvo.fotos },
              { onError: (e) => toast.error(e instanceof Error ? e.message : String(e)) }
            );
          }
          setExcluirAlvo(null);
          setVendoId(null);
        }}
        title="Excluir redação?"
        message="A redação, as fotos e a correção serão apagadas."
        confirmLabel="Excluir"
        danger
      />
    </Card>
  );
}

function Miniatura({ redacao, cor }: { redacao: Redacao; cor: string }) {
  const foto = redacao.fotos[0];
  if (foto) {
    return (
      <img
        src={urlFotoRedacao(foto)}
        alt=""
        loading="lazy"
        className="h-14 w-11 shrink-0 rounded-md border border-line/60 bg-navy-700 object-cover"
      />
    );
  }
  return (
    <span
      className="flex h-14 w-11 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums"
      style={{ background: `${cor}1a`, color: cor }}
    >
      {redacao.numero}
    </span>
  );
}

function BadgeNota({ redacao, cor, regra }: { redacao: Redacao; cor: string; regra?: RegraRedacao }) {
  if (redacao.nota == null) {
    return <span className="shrink-0 rounded-lg bg-navy-700 px-2 py-1 text-[11px] text-mut">sem nota</span>;
  }
  const abaixo = regra != null && redacao.nota < regra.minimo;
  return (
    <span
      className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold tabular-nums"
      style={abaixo ? { background: "#e5564b1f", color: "var(--color-red)" } : { background: `${cor}1a`, color: cor }}
      title={abaixo ? `Abaixo do mínimo (${regra!.minimo})` : undefined}
    >
      {fmtNota(redacao.nota)}
      {redacao.nota_max != null && <span className="text-xs font-normal text-mut">/{fmtNota(redacao.nota_max)}</span>}
    </span>
  );
}

/** Barras da nota (em % da nota máxima) de cada redação, com a linha do mínimo. */
function Evolucao({ redacoes, cor, regra }: { redacoes: Redacao[]; cor: string; regra?: RegraRedacao }) {
  const ultimas = redacoes.slice(-20);
  const pctMin = regra ? (regra.minimo / regra.notaMax) * 100 : null;
  return (
    <div className="rounded-xl border border-line/50 bg-navy-900/40 px-3 pb-2 pt-3">
      <p className="mb-2 flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide text-mut">
        Evolução das notas
        {pctMin != null && (
          <span className="flex items-center gap-1 normal-case tracking-normal text-red/80">
            <span className="w-4 border-t border-dashed border-red/70" /> mínimo {regra!.minimo}
          </span>
        )}
      </p>
      <div className="relative flex h-24 items-end gap-1">
        {pctMin != null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-red/60"
            style={{ bottom: `${pctMin}%` }}
          />
        )}
        {ultimas.map((r) => {
          const max = r.nota_max || regra?.notaMax || 10;
          const p = Math.max(2, Math.min(100, ((r.nota ?? 0) / max) * 100));
          const abaixo = regra != null && (r.nota ?? 0) < regra.minimo;
          return (
            <div
              key={r.id}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5 self-stretch"
              title={`Redação ${r.numero}: ${fmtNota(r.nota ?? 0)}/${fmtNota(max)}`}
            >
              <span className="text-[9px] tabular-nums text-dim">{fmtNota(r.nota ?? 0)}</span>
              <div
                className="w-full max-w-8 rounded-t"
                style={{ height: `${p}%`, background: abaixo ? "var(--color-red)" : cor, opacity: 0.85 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1">
        {ultimas.map((r) => (
          <span key={r.id} className="min-w-0 flex-1 text-center text-[9px] tabular-nums text-mut">
            {r.numero}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DetalheProps {
  redacao: Redacao;
  cor: string;
  regra?: RegraRedacao;
  onClose: () => void;
  onEditar: () => void;
  onExcluir: () => void;
}

function DetalheModal({ redacao: r, cor, regra, onClose, onEditar, onExcluir }: DetalheProps) {
  const temFormula = r.nota_conteudo != null && r.erros != null && r.linhas != null;
  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      telaCheiaNoCelular
      title={
        <span>
          Redação {r.numero}
          <span className="ml-2 text-sm font-normal text-mut">{fmtData(r.data)}</span>
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onExcluir} className="mr-auto !text-red">
            <Trash2 className="size-4" /> Excluir
          </Button>
          <Button variant="secondary" onClick={onEditar}>
            <Pencil className="size-4" /> Editar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-mut">Tema</p>
            <p className="text-sm font-semibold text-txt">{r.tema.trim() || "—"}</p>
          </div>
          <BadgeNota redacao={r} cor={cor} regra={regra} />
        </div>

        {temFormula && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Numero rotulo="Conteúdo (NC)" valor={fmtNota(r.nota_conteudo!)} />
            <Numero rotulo="Erros (NE)" valor={String(r.erros)} />
            <Numero rotulo="Linhas (TL)" valor={String(r.linhas)} />
          </div>
        )}

        {r.fotos.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {r.fotos.map((f, i) => (
              <a key={f} href={urlFotoRedacao(f)} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
                <img
                  src={urlFotoRedacao(f)}
                  alt={`Folha ${i + 1} da redação ${r.numero}`}
                  className="w-full rounded-xl border border-line/60 bg-navy-700"
                />
              </a>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line/60 px-4 py-4 text-center text-xs text-mut">
            Sem foto da folha.
          </p>
        )}

        {r.correcao.trim() && (
          <section>
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-mut">
              <Bot className="size-3.5" /> Correção
            </p>
            <div className="whitespace-pre-wrap rounded-xl border border-line/50 bg-navy-900/50 px-3.5 py-3 text-sm leading-relaxed text-dim">
              {r.correcao}
            </div>
          </section>
        )}

        {r.observacoes.trim() && (
          <section>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-mut">O que treinar</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-dim">{r.observacoes}</p>
          </section>
        )}
      </div>
    </Modal>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-line/50 bg-navy-900/40 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-mut">{rotulo}</p>
      <p className="text-base font-bold tabular-nums text-txt">{valor}</p>
    </div>
  );
}

interface FormProps {
  concursoId: string;
  materiaId: string;
  proximoNumero: number;
  redacao: Redacao | null;
  regra?: RegraRedacao;
  onClose: () => void;
}

function parseNum(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function RedacaoFormModal({ concursoId, materiaId, proximoNumero, redacao, regra, onClose }: FormProps) {
  const { session } = useAuth();
  const criar = useCriarRedacao();
  const atualizar = useAtualizarRedacao();
  const editando = redacao != null;
  const numero = redacao?.numero ?? proximoNumero;
  const inputFotos = useRef<HTMLInputElement>(null);
  // Se a foto falhar depois de criar a redação, tentar de novo atualiza a mesma
  // linha em vez de criar outra.
  const criadaRef = useRef<Redacao | null>(null);

  const [data, setData] = useState(redacao?.data ?? hojeISO());
  const [tema, setTema] = useState(redacao?.tema ?? "");
  const [fotosMantidas, setFotosMantidas] = useState<string[]>(redacao?.fotos ?? []);
  const [fotosNovas, setFotosNovas] = useState<File[]>([]);
  const [nc, setNc] = useState(redacao?.nota_conteudo != null ? String(redacao.nota_conteudo) : "");
  const [ne, setNe] = useState(redacao?.erros != null ? String(redacao.erros) : "");
  const [tl, setTl] = useState(redacao?.linhas != null ? String(redacao.linhas) : "");
  const [nota, setNota] = useState(redacao?.nota != null ? String(redacao.nota) : "");
  const [notaMax, setNotaMax] = useState(
    redacao?.nota_max != null ? String(redacao.nota_max) : String(regra?.notaMax ?? 10)
  );
  const [correcao, setCorrecao] = useState(redacao?.correcao ?? "");
  const [obs, setObs] = useState(redacao?.observacoes ?? "");
  const [salvando, setSalvando] = useState(false);

  // Prévia das fotos ainda não enviadas (URLs locais, liberadas ao trocar/fechar).
  const previas = useMemo(() => fotosNovas.map((f) => URL.createObjectURL(f)), [fotosNovas]);
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas]);

  // Com NC, NE e TL preenchidos, a nota sai da fórmula do Cebraspe.
  const notaFormula = regra?.formulaCebraspe
    ? notaCebraspe(parseNum(nc), parseNum(ne), parseNum(tl), regra.notaMax)
    : null;

  function adicionarFotos(lista: FileList | null) {
    if (!lista?.length) return;
    setFotosNovas((atual) => [...atual, ...Array.from(lista)]);
    if (inputFotos.current) inputFotos.current.value = "";
  }

  async function copiarPrompt() {
    try {
      await navigator.clipboard.writeText(promptCorrecao(tema, regra));
      toast.success("Pedido de correção copiado — cole na IA junto com a foto.");
    } catch {
      toast.error("Não consegui copiar.");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setSalvando(true);
    const campos = {
      tema: tema.trim(),
      data,
      nota: notaFormula ?? parseNum(nota),
      nota_max: parseNum(notaMax),
      nota_conteudo: parseNum(nc),
      erros: parseNum(ne) != null ? Math.round(parseNum(ne)!) : null,
      linhas: parseNum(tl) != null ? Math.round(parseNum(tl)!) : null,
      correcao: correcao.trim(),
      observacoes: obs.trim(),
    };
    try {
      // A redação precisa existir antes das fotos: o id entra no caminho do arquivo.
      const jaExistia = redacao ?? criadaRef.current;
      const alvo =
        jaExistia ??
        (await criar.mutateAsync({
          concurso_id: concursoId,
          materia_id: materiaId,
          numero: proximoNumero,
          ...campos,
        }));
      criadaRef.current = alvo;
      const enviadas = fotosNovas.length
        ? await enviarFotosRedacao(fotosNovas, session.user.id, alvo.id)
        : [];
      const removidas = (jaExistia?.fotos ?? []).filter((f) => !fotosMantidas.includes(f));
      if (jaExistia || enviadas.length) {
        await atualizar.mutateAsync({
          id: alvo.id,
          ...(jaExistia ? campos : {}),
          fotos: [...fotosMantidas, ...enviadas],
        });
      }
      await removerFotosRedacao(removidas);
      toast.success(editando ? "Redação atualizada." : "Redação lançada.");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      telaCheiaNoCelular
      title={editando ? `Editar redação ${numero}` : `Nova redação ${numero}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="form-redacao" loading={salvando}>
            {editando ? "Salvar" : "Lançar redação"}
          </Button>
        </>
      }
    >
      <form id="form-redacao" onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </Field>
          <Field label="Tema">
            <Input
              placeholder="Ex.: Violência contra a mulher em PE"
              value={tema}
              onChange={(e) => setTema(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Fotos da folha" hint="Pode mandar mais de uma (frente e verso, folhas)">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fotosMantidas.map((f) => (
              <FotoPrevia key={f} src={urlFotoRedacao(f)} onRemover={() => setFotosMantidas((l) => l.filter((x) => x !== f))} />
            ))}
            {previas.map((u, i) => (
              <FotoPrevia
                key={u}
                src={u}
                nova
                onRemover={() => setFotosNovas((l) => l.filter((_, j) => j !== i))}
              />
            ))}
            <button
              type="button"
              onClick={() => inputFotos.current?.click()}
              className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-mut transition-colors hover:border-gold hover:text-gold"
            >
              <ImagePlus className="size-5" />
              Adicionar
            </button>
          </div>
          <input
            ref={inputFotos}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => adicionarFotos(e.target.files)}
          />
        </Field>

        <section className="space-y-3 rounded-xl border border-line/50 bg-navy-900/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-txt">Correção</p>
            <Button type="button" size="sm" variant="ghost" onClick={copiarPrompt}>
              <ClipboardCopy className="size-4" /> Copiar pedido de correção p/ IA
            </Button>
          </div>
          <Textarea
            rows={7}
            value={correcao}
            onChange={(e) => setCorrecao(e.target.value)}
            placeholder="Cole aqui a correção que a IA fez (comentários, erros apontados, sugestões)…"
          />

          {regra?.formulaCebraspe && (
            <div>
              <p className="mb-1.5 text-xs text-dim">
                Nota pela fórmula do Cebraspe: <strong className="text-txt">NC − 6 × NE ÷ TL</strong>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Field label={`Conteúdo (0–${regra.notaMax})`}>
                  <Input type="number" step="0.25" min={0} max={regra.notaMax} inputMode="decimal" value={nc} onChange={(e) => setNc(e.target.value)} />
                </Field>
                <Field label="Erros">
                  <Input type="number" step="1" min={0} inputMode="numeric" value={ne} onChange={(e) => setNe(e.target.value)} />
                </Field>
                <Field label={`Linhas (até ${regra.linhas})`}>
                  <Input type="number" step="1" min={1} max={regra.linhas} inputMode="numeric" value={tl} onChange={(e) => setTl(e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Nota final"
              hint={notaFormula != null ? "Calculada pela fórmula" : "Deixe em branco se ainda não corrigiu"}
            >
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="Ex.: 21,5"
                value={notaFormula != null ? String(notaFormula) : nota}
                onChange={(e) => setNota(e.target.value)}
                disabled={notaFormula != null}
              />
            </Field>
            <Field label="Nota máxima">
              <Input
                type="number"
                step="0.25"
                inputMode="decimal"
                value={notaMax}
                onChange={(e) => setNotaMax(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <Field label="O que treinar na próxima" hint="Seus lembretes a partir da correção">
          <Textarea
            rows={3}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: conclusão sem proposta de intervenção; erros de crase…"
          />
        </Field>
      </form>
    </Modal>
  );
}

function FotoPrevia({ src, nova, onRemover }: { src: string; nova?: boolean; onRemover: () => void }) {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line/60 bg-navy-700">
      <img src={src} alt="" className="size-full object-cover" />
      {nova && (
        <span className="absolute bottom-1 left-1 rounded bg-navy-950/80 px-1 text-[9px] font-semibold text-gold">
          nova
        </span>
      )}
      <button
        type="button"
        onClick={onRemover}
        className="absolute right-1 top-1 cursor-pointer rounded-full bg-navy-950/80 p-1 text-txt hover:text-red"
        aria-label="Remover foto"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
