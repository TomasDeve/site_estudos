import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  Check,
  ChevronDown,
  Flame,
  PenLine,
  Repeat2,
  Shapes,
} from "lucide-react";
import type { RedacaoParagrafo, RedacaoSemana } from "@/types/db";
import { Button } from "@/components/Button";
import {
  embasamentoDoParagrafo,
  pontosDoParagrafo,
  TIPOS,
  type Sorteio,
  type TemaParagrafo,
  type TipoParagrafo,
} from "./paragrafos";
import { lerInformacao } from "./informacao";
import { Negrito, Proposta, corDaNota } from "./partes";
import { Bloco, Prova, Selo, decorarDoTema } from "./repertorio";
import {
  PLANO_SEMANA,
  PROPOSTAS_SEMANA,
  diaDoPlano,
  posicaoDoTema,
  rotuloSemana,
  semanaDe,
  temaDaProposta,
  type Chance,
  type DiaPlano,
  type PassoSemana,
  type PropostaSemana,
} from "./semanas";

const COR_CHANCE: Record<Chance, string> = {
  "muito alta": "bg-red/15 text-red",
  alta: "bg-amber/15 text-amber",
  média: "bg-blue/15 text-blue",
  possível: "bg-navy-700 text-dim",
};

function SeloChance({ chance }: { chance: Chance }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${COR_CHANCE[chance]}`}>
      <Flame className="size-3" aria-hidden />
      Chance {chance}
    </span>
  );
}

function propostaDe(temaId: string): PropostaSemana | undefined {
  return PROPOSTAS_SEMANA.find((p) => p.temaId === temaId);
}

/** Melhor nota de cada parágrafo do tema escrito nesta semana (chave "tipo:aspecto"). */
function notasDaSemana(historico: RedacaoParagrafo[], temaId: string, semana: string): Map<string, number> {
  const notas = new Map<string, number>();
  for (const p of historico) {
    if (p.tema_id !== temaId || semanaDe(new Date(p.created_at)) !== semana) continue;
    const chave = `${p.tipo}:${p.aspecto ?? ""}`;
    notas.set(chave, Math.max(notas.get(chave) ?? 0, Number(p.nota ?? 0)));
  }
  return notas;
}

const chaveDaParte = (p: NonNullable<PassoSemana["parte"]>) => `${p.tipo}:${p.aspecto ?? ""}`;

/**
 * O tema escolhido para a semana e o plano de 30 min por dia: segunda estuda e passa
 * para o Anki, terça a sexta escreve um parágrafo no site, domingo faz a redação inteira.
 */
export function TemaDaSemana({
  semana,
  historico,
  onEstudar,
  onEscrever,
  onMarcar,
  onTrocar,
}: {
  semana: RedacaoSemana;
  historico: RedacaoParagrafo[];
  onEstudar: (tema: TemaParagrafo, ancora?: string) => void;
  onEscrever: (s: Sorteio) => void;
  onMarcar: (dia: DiaPlano, feito: boolean) => void;
  onTrocar: () => void;
}) {
  const proposta = propostaDe(semana.tema_id);
  const tema = proposta ? temaDaProposta(proposta) : undefined;
  const notas = useMemo(
    () => notasDaSemana(historico, semana.tema_id, semana.semana),
    [historico, semana.tema_id, semana.semana]
  );
  if (!proposta || !tema) return null;
  const hoje = diaDoPlano();
  const feito = (p: PassoSemana) => (p.parte ? notas.has(chaveDaParte(p.parte)) : semana.feitos.includes(p.dia));
  const total = PLANO_SEMANA.filter(feito).length;

  return (
    <section className="rounded-card border border-gold/45 bg-navy-800/80 px-4 py-4 shadow-card sm:px-5">
      <div className="flex items-center gap-2">
        <CalendarCheck className="size-4 shrink-0 text-gold" aria-hidden />
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-dim">
          Tema da semana · {rotuloSemana(semana.semana)}
        </h2>
        <span className="ml-auto text-xs font-semibold tabular-nums text-dim">
          {total} de {PLANO_SEMANA.length}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold tabular-nums text-gold">#{posicaoDoTema(tema.id)}</span>
        <SeloChance chance={proposta.chance} />
        <span className="text-[11px] text-mut">{tema.bloco}</span>
      </div>
      <p className="mt-1.5 text-lg font-bold leading-snug text-txt">{tema.tema}</p>

      {/* barra de progresso: um traço por dia */}
      <div className="mt-3 flex gap-1" aria-hidden>
        {PLANO_SEMANA.map((p) => (
          <span key={p.dia} className={`h-1.5 flex-1 rounded-full ${feito(p) ? "bg-green" : "bg-navy-700"}`} />
        ))}
      </div>

      <ol className="mt-4 space-y-2">
        {PLANO_SEMANA.map((p) => {
          const ok = feito(p);
          const nota = p.parte ? notas.get(chaveDaParte(p.parte)) : undefined;
          const ehHoje = p.dia === hoje;
          return (
            <li
              key={p.dia}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                ehHoje ? "border-gold/50 bg-gold/5" : "border-line/40 bg-navy-900/40"
              }`}
            >
              {p.parte ? (
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                    ok ? "bg-green/15 text-green" : "bg-navy-700 text-mut"
                  }`}
                  title={ok ? "Feito no site" : "Ainda não escrito"}
                >
                  {ok ? <Check className="size-4" /> : <PenLine className="size-3.5" />}
                </span>
              ) : (
                <button
                  onClick={() => onMarcar(p.dia, !ok)}
                  aria-pressed={ok}
                  title={ok ? "Desmarcar" : "Marcar como feito"}
                  className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                    ok ? "border-green bg-green/15 text-green" : "border-line text-transparent hover:border-gold hover:text-gold/60"
                  }`}
                >
                  <Check className="size-4" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-txt">
                  <span className={ehHoje ? "text-gold" : "text-mut"}>{p.nome.slice(0, 3)}</span> · {p.titulo}
                  {ehHoje && <span className="ml-1.5 text-[10px] font-bold uppercase text-gold">hoje</span>}
                </p>
                <p className="text-xs leading-snug text-dim">{p.descricao}</p>
              </div>
              {nota != null && (
                <span className={`shrink-0 text-sm font-extrabold tabular-nums ${corDaNota(nota)}`}>
                  {nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                </span>
              )}
              {p.parte ? (
                <Button
                  size="sm"
                  variant={ok ? "ghost" : ehHoje ? "primary" : "secondary"}
                  onClick={() => onEscrever({ tema, tipo: p.parte!.tipo, aspecto: p.parte!.aspecto })}
                >
                  {ok ? "Refazer" : "Escrever"}
                </Button>
              ) : (
                <Button size="sm" variant={ehHoje && !ok ? "primary" : "secondary"} onClick={() => onEstudar(tema, p.dia === "dom" ? "modelo" : undefined)}>
                  {p.dia === "dom" ? "Modelo" : "Estudar"}
                </Button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onEstudar(tema)}>
          <BookOpen className="size-4" />
          Estudar o tema
        </Button>
        <Button variant="ghost" onClick={onTrocar}>
          <Repeat2 className="size-4" />
          Trocar tema
        </Button>
      </div>
    </section>
  );
}

/** As 15 propostas, da mais provável à menos provável, para escolher a da semana. */
export function PropostasDaSemana({
  semanas,
  atual,
  abertaDeInicio,
  onEstudar,
  onEscolher,
  escolhendo,
}: {
  semanas: RedacaoSemana[];
  atual: RedacaoSemana | undefined;
  abertaDeInicio: boolean;
  onEstudar: (tema: TemaParagrafo) => void;
  onEscolher: (temaId: string) => void;
  escolhendo: boolean;
}) {
  const [aberta, setAberta] = useState(abertaDeInicio);
  useEffect(() => setAberta(abertaDeInicio), [abertaDeInicio]);
  const feitas = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of semanas) m.set(s.tema_id, [...(m.get(s.tema_id) ?? []), s.semana]);
    return m;
  }, [semanas]);

  return (
    <section id="propostas-da-semana" className="scroll-mt-20 rounded-card border border-line/50 bg-navy-800/80 px-4 py-4 shadow-card sm:px-5">
      <button onClick={() => setAberta((v) => !v)} className="flex w-full cursor-pointer items-center gap-2 text-left" aria-expanded={aberta}>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold uppercase tracking-wide text-dim">As 15 propostas</span>
          <span className="block text-xs text-mut">Da que tem mais chance de cair para a que tem menos. Uma por semana.</span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-mut transition-transform ${aberta ? "rotate-180" : ""}`} />
      </button>

      {aberta && (
        <ol className="mt-4 space-y-2.5">
          {PROPOSTAS_SEMANA.map((p, i) => {
            const tema = temaDaProposta(p);
            const ehAtual = atual?.tema_id === p.temaId;
            const semanasFeitas = (feitas.get(p.temaId) ?? []).filter((s) => s !== atual?.semana);
            return (
              <li key={p.temaId} className={`rounded-xl border p-3 ${ehAtual ? "border-gold/50 bg-gold/5" : "border-line/40 bg-navy-900/40"}`}>
                <div className="flex gap-3">
                  <span className="w-6 shrink-0 pt-0.5 text-right text-lg font-extrabold tabular-nums text-gold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SeloChance chance={p.chance} />
                      <span className="text-[11px] text-mut">{tema.bloco}</span>
                    </div>
                    <p className="mt-1 text-[15px] font-semibold leading-snug text-txt">{tema.tema}</p>
                    <p className="mt-1 text-xs leading-relaxed text-dim">{p.porque}</p>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-mut">
                      <span className="font-semibold text-dim">Também serve para:</span> {p.serveTambem.join(" · ")}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onEstudar(tema)}>
                        <BookOpen className="size-3.5" />
                        Ver o tema
                      </Button>
                      {ehAtual ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gold">
                          <CalendarCheck className="size-3.5" />
                          Tema desta semana
                        </span>
                      ) : (
                        <Button size="sm" variant="ghost" disabled={escolhendo} onClick={() => onEscolher(p.temaId)}>
                          <CalendarCheck className="size-3.5" />
                          Escolher para esta semana
                        </Button>
                      )}
                      {semanasFeitas.length > 0 && (
                        <span className="text-[11px] text-green">
                          Feito na semana de {semanasFeitas.map(rotuloSemana).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

const PARTES: { id: string; titulo: string; tipo: TipoParagrafo; aspecto: number | null }[] = [
  { id: "intro", titulo: "Introdução", tipo: "introducao", aspecto: null },
  { id: "p1", titulo: "1º desenvolvimento", tipo: "desenvolvimento", aspecto: 0 },
  { id: "p2", titulo: "2º desenvolvimento", tipo: "desenvolvimento", aspecto: 1 },
  { id: "fim", titulo: "Conclusão", tipo: "conclusao", aspecto: 2 },
];

/**
 * O tema inteiro para estudar na segunda (e reler na semana): a proposta, o "Para decorar"
 * para o Anki, o esqueleto parágrafo por parágrafo com as provas e a redação modelo completa.
 */
export function EstudoDoTema({
  tema,
  ancora,
  ehDaSemana,
  onEscrever,
  onEscolher,
  escolhendo,
}: {
  tema: TemaParagrafo;
  ancora?: string;
  ehDaSemana: boolean;
  onEscrever: (s: Sorteio) => void;
  onEscolher: () => void;
  escolhendo: boolean;
}) {
  const proposta = propostaDe(tema.id);
  const decorar = decorarDoTema(tema);
  const e = tema.esqueleto;

  useEffect(() => {
    if (!ancora) return;
    const id = window.setTimeout(() => document.getElementById(`estudo-${ancora}`)?.scrollIntoView({ block: "start" }), 50);
    return () => window.clearTimeout(id);
  }, [ancora]);

  const atalhos = [
    { id: "proposta", nome: "Proposta" },
    { id: "decorar", nome: "Para decorar" },
    { id: "esqueleto", nome: "Esqueleto" },
    { id: "modelo", nome: "Redação modelo" },
  ];
  const ir = (id: string) => document.getElementById(`estudo-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {proposta && (
            <>
              <span className="text-xs font-bold tabular-nums text-gold">#{posicaoDoTema(tema.id)}</span>
              <SeloChance chance={proposta.chance} />
            </>
          )}
          <span className="text-[11px] text-mut">{tema.bloco}</span>
        </div>
        <h2 className="mt-1.5 text-xl font-bold leading-snug tracking-tight text-txt">{tema.tema}</h2>
        {proposta && (
          <>
            <p className="mt-1.5 text-sm leading-relaxed text-dim">{proposta.porque}</p>
            <p className="mt-1 text-xs text-mut">
              <span className="font-semibold text-dim">Também serve para:</span> {proposta.serveTambem.join(" · ")}
            </p>
          </>
        )}
        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Atalhos do tema">
          {atalhos.map((a, i) => (
            <button
              key={a.id}
              onClick={() => ir(a.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line/60 bg-navy-800/80 px-3 py-1 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-txt"
            >
              <span className="tabular-nums text-gold">{i + 1}</span>
              {a.nome}
            </button>
          ))}
        </nav>
      </div>

      <div id="estudo-proposta" className="scroll-mt-20">
        <Proposta tema={tema} tipo="introducao" aspecto={null} />
      </div>

      {decorar.length > 0 && (
        <Bloco id="estudo-decorar" numero={2} titulo="Para decorar → Anki" dica="Cada item vira um card: o número, a lei pelo nome e ano, o exemplo" Icone={Shapes} cor="text-blue">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {decorar.map((info, i) => (
              <Prova key={i} info={info} />
            ))}
          </div>
        </Bloco>
      )}

      <Bloco id="estudo-esqueleto" numero={3} titulo="Esqueleto da redação" dica="Parágrafo por parágrafo, com a prova de cada ponto" Icone={BookOpenCheck} cor="text-gold">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["dado", "lei", "caso"] as const).map((t) => (
            <Selo key={t} tipo={t} />
          ))}
        </div>
        <div className="space-y-4">
          {PARTES.map((parte) => {
            const pontos = pontosDoParagrafo(tema, parte.tipo, parte.aspecto);
            const provas = embasamentoDoParagrafo(tema, parte.tipo, parte.aspecto);
            return (
              <div key={parte.id} className="rounded-xl border border-line/50 bg-navy-900/40 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-txt">
                    {parte.titulo}
                    <span className="ml-1.5 text-[11px] font-semibold text-gold">
                      {TIPOS[parte.tipo].meta[0]} a {TIPOS[parte.tipo].meta[1]} linhas
                    </span>
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => onEscrever({ tema, tipo: parte.tipo, aspecto: parte.aspecto })}>
                    <PenLine className="size-3.5" />
                    Escrever
                  </Button>
                </div>
                {parte.aspecto != null && (
                  <p className="mt-0.5 text-xs text-dim">
                    Aspecto {parte.aspecto + 1}: <span className="text-txt">{tema.aspectos[parte.aspecto].texto}</span>
                  </p>
                )}
                <ol className="mt-2.5 space-y-2.5">
                  {pontos.map((p, i) => (
                    <li key={i}>
                      <div className="flex gap-2">
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[11px] font-extrabold text-gold">
                          {i + 1}
                        </span>
                        <p className="min-w-0 text-sm font-semibold leading-snug text-txt">
                          <Negrito texto={p} />
                        </p>
                      </div>
                      {provas[i] && (
                        <div className="mt-1.5 sm:pl-7">
                          <Prova info={lerInformacao(provas[i])} />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                {parte.tipo === "introducao" && (
                  <p className="mt-2.5 rounded-lg bg-navy-800/60 p-2.5 text-[13px] leading-relaxed text-dim">
                    <span className="font-bold text-gold">Anúncio: </span>
                    Nesse sentido, vale citar <strong className="text-txt">{e.anuncia[0]}</strong>, expor{" "}
                    <strong className="text-txt">{e.anuncia[1]}</strong> e <strong className="text-txt">{e.anuncia[2]}</strong>.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Bloco>

      <Bloco id="estudo-modelo" numero={4} titulo="Redação modelo · nota máxima" dica="Releia na sexta e antes da redação de domingo" Icone={BadgeCheck} cor="text-green">
        <div className="space-y-3 rounded-xl border border-green/30 bg-navy-900/40 p-3 sm:p-4">
          {[tema.modelo.intro, tema.modelo.p1, tema.modelo.p2, tema.modelo.fim].map((par, i) => (
            <p key={i} className="indent-6 text-[15px] leading-relaxed text-txt">
              {par}
            </p>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-mut">
          Escrita no seu esqueleto e nos critérios da Cebraspe, com cerca de 28 linhas na sua letra. Não é o único jeito
          certo: use como régua, não como texto para decorar.
        </p>
      </Bloco>

      {!ehDaSemana && (
        <div className="sticky bottom-3 z-10 flex justify-center rounded-2xl border border-line/50 bg-navy-900/90 p-2 shadow-card backdrop-blur-sm">
          <Button onClick={onEscolher} loading={escolhendo}>
            <CalendarCheck className="size-4" />
            Escolher para esta semana
          </Button>
        </div>
      )}
    </div>
  );
}
