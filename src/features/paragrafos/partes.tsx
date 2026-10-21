import type { ReactNode } from "react";
import { BadgeCheck, Lightbulb, Sparkles } from "lucide-react";
import type { CorrecaoParagrafo, UsoIA } from "@/api/paragrafos";
import { CORINGAS, ROTULO_TIPO, tipoDoAspecto } from "./coringas";
import { rotuloDoModelo } from "./modelos";
import {
  aberturaDoParagrafo,
  modeloDoParagrafo,
  pontosDoParagrafo,
  type TemaParagrafo,
  type TipoParagrafo,
} from "./paragrafos";

/** Texto com **negrito** (o formato dos fontes do PDF). */
export function Negrito({ texto }: { texto: string }) {
  const partes = texto.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {partes.map((p, i) => (i % 2 ? <strong key={i} className="font-semibold text-txt">{p}</strong> : p))}
    </>
  );
}

export function Secao({ titulo, children, className = "" }: { titulo: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-line/50 bg-navy-800/80 px-4 py-4 shadow-card sm:px-5 ${className}`}>
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-dim">{titulo}</h2>
      {children}
    </section>
  );
}

/** A proposta como na prova: textos motivadores, tema e os 3 aspectos (o do parágrafo em destaque). */
export function Proposta({
  tema,
  tipo,
  aspecto,
  recolherTextos = false,
}: {
  tema: TemaParagrafo;
  tipo: TipoParagrafo;
  aspecto: number | null;
  recolherTextos?: boolean;
}) {
  const textos = (
    <div className="space-y-3">
      {tema.textos.map((t, i) => (
        <div key={i} className="border-l-2 border-line pl-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-mut">Texto {i + 1}</p>
          <p className="mt-1 text-sm leading-relaxed text-dim">{t.texto}</p>
          {t.fonte && <p className="mt-1 text-[11px] italic text-mut">{t.fonte}</p>}
        </div>
      ))}
    </div>
  );
  return (
    <Secao titulo={`Proposta · ${tema.bloco}`}>
      {recolherTextos ? (
        <details className="mb-4">
          <summary className="cursor-pointer text-xs font-semibold text-dim hover:text-txt">Textos motivadores</summary>
          <div className="mt-3">{textos}</div>
        </details>
      ) : (
        <div className="mb-4">{textos}</div>
      )}
      <p className="text-[15px] font-bold leading-snug text-txt">{tema.tema}</p>
      <p className="mt-2 text-xs text-mut">Ao elaborar seu texto, aborde os seguintes aspectos:</p>
      <ol className="mt-2 space-y-1.5">
        {tema.aspectos.map((a, i) => {
          const alvo = tipo === "introducao" || i === aspecto;
          return (
            <li
              key={i}
              className={`flex gap-2 rounded-lg px-2.5 py-1.5 text-sm leading-snug ${
                alvo ? "bg-gold/10 text-txt ring-1 ring-gold/40" : "text-mut"
              }`}
            >
              <span className={`font-bold tabular-nums ${alvo ? "text-gold" : ""}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                {a.texto}
                <span className="ml-1.5 whitespace-nowrap text-[11px] text-mut">[valor: {a.valor} pontos]</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Secao>
  );
}

const CONCEITOS = ["não abordou", "só mencionou", "desenvolveu de forma insuficiente", "desenvolveu articulado ao tema"];

export function corDaNota(n: number): string {
  return n >= 8 ? "text-green" : n >= 6 ? "text-gold" : "text-red";
}

/** Grifa no parágrafo os trechos que a IA marcou como erro. */
function TextoComErros({ texto, erros }: { texto: string; erros: CorrecaoParagrafo["erros"] }) {
  const marcas: { ini: number; fim: number }[] = [];
  for (const e of erros) {
    const ini = e.trecho ? texto.indexOf(e.trecho) : -1;
    if (ini >= 0 && !marcas.some((m) => ini < m.fim && ini + e.trecho.length > m.ini))
      marcas.push({ ini, fim: ini + e.trecho.length });
  }
  marcas.sort((a, b) => a.ini - b.ini);
  const partes: ReactNode[] = [];
  let pos = 0;
  marcas.forEach((m, i) => {
    partes.push(texto.slice(pos, m.ini));
    partes.push(
      <mark key={i} className="rounded-sm bg-red/20 px-0.5 text-txt underline decoration-red decoration-wavy underline-offset-4">
        {texto.slice(m.ini, m.fim)}
      </mark>
    );
    pos = m.fim;
  });
  partes.push(texto.slice(pos));
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-dim">{partes}</p>;
}

export function Correcao({
  correcao,
  texto,
  nota,
  notaConteudo,
  linhas,
  meta,
  segundos,
}: {
  correcao: CorrecaoParagrafo;
  texto: string;
  nota: number;
  notaConteudo: number;
  linhas: number;
  meta: [number, number];
  segundos: number | null;
}) {
  const ne = correcao.erros.length;
  return (
    <div className="space-y-4">
      <Secao titulo="Nota">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <span className={`text-5xl font-extrabold tabular-nums ${corDaNota(nota)}`}>
              {nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="ml-1 text-sm text-mut">de 10</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:grid-cols-4">
            <Dado rotulo="Conceito" valor={`${correcao.conceito} de 3`} />
            <Dado rotulo="Conteúdo" valor={notaConteudo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} />
            <Dado rotulo="Erros" valor={String(ne)} />
            <Dado
              rotulo="Linhas"
              valor={`${linhas} (meta ${meta[0]}–${meta[1]})`}
              alerta={linhas < meta[0] || linhas > meta[1]}
            />
            {segundos != null && <Dado rotulo="Tempo" valor={fmtTempo(segundos)} />}
          </dl>
        </div>
        <p className="mt-2 text-xs text-mut">
          Conceito {correcao.conceito}: {CONCEITOS[correcao.conceito]}. Como no quesito da banca, o conceito dá o
          conteúdo (3 = 10; 2 ≈ 6,7; 1 ≈ 3,3), e a nota = conteúdo − 2 × erros ÷ linhas (a conta da Cebraspe, em
          escala 10).
        </p>
        <p className="mt-3 text-sm leading-relaxed text-txt">{correcao.veredito}</p>
        {correcao.uso && (
          <p className="mt-3 border-t border-line/40 pt-2 text-[11px] text-mut">
            Gasto desta correção ({rotuloDoModelo(correcao.uso.modelo)}): <GastoIA uso={correcao.uso} />
          </p>
        )}
      </Secao>

      <Secao titulo="O que pesou no conceito">
        <ul className="divide-y divide-line/40">
          {correcao.criterios.map((c, i) => (
            <li key={i} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-txt">{c.nome}</span>
                <SituacaoCriterio criterio={c} />
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-dim">{c.comentario}</p>
            </li>
          ))}
        </ul>
      </Secao>

      <div className="grid gap-4 sm:grid-cols-2">
        <Secao titulo="O que funcionou">
          <Lista itens={correcao.acertos} cor="text-green" vazio="Nada que se destaque ainda." />
        </Secao>
        <Secao titulo="O que melhorar">
          <Lista itens={correcao.melhorar} cor="text-gold" vazio="Nada a melhorar." />
        </Secao>
      </div>

      <Secao titulo={`Seu parágrafo${ne ? ` · ${ne} ${ne === 1 ? "erro" : "erros"} de português` : ""}`}>
        <TextoComErros texto={texto} erros={correcao.erros} />
        {ne > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line/40 pt-3">
            {correcao.erros.map((e, i) => (
              <li key={i} className="text-sm leading-snug">
                <span className="text-red line-through decoration-red/70">{e.trecho}</span>
                <span className="mx-1.5 text-mut">→</span>
                <span className="font-semibold text-green">{e.correcao}</span>
                <p className="mt-0.5 text-xs text-mut">{e.explicacao}</p>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao
        titulo={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-gold" /> Seu parágrafo nota máxima
          </span>
        }
        className="ring-1 ring-gold/30"
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-txt">{correcao.reescrita}</p>
      </Secao>
    </div>
  );
}

const SITUACOES = {
  ok: { rotulo: "ok", cor: "bg-green/15 text-green" },
  parcial: { rotulo: "parcial", cor: "bg-amber/15 text-amber" },
  faltou: { rotulo: "faltou", cor: "bg-red/15 text-red" },
} as const;

/** Situação do critério; correções antigas (com pontos) viram ok/parcial/faltou pela proporção. */
function SituacaoCriterio({ criterio }: { criterio: CorrecaoParagrafo["criterios"][number] }) {
  let s = criterio.situacao;
  if (!s && criterio.max) {
    const r = (criterio.pontos ?? 0) / criterio.max;
    s = r >= 0.99 ? "ok" : r > 0 ? "parcial" : "faltou";
  }
  if (!s) return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${SITUACOES[s].cor}`}>
      {SITUACOES[s].rotulo}
    </span>
  );
}

function Dado({ rotulo, valor, alerta = false }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-mut">{rotulo}</dt>
      <dd className={`font-semibold tabular-nums ${alerta ? "text-amber" : "text-txt"}`}>{valor}</dd>
    </div>
  );
}

function Lista({ itens, cor, vazio }: { itens: string[]; cor: string; vazio: string }) {
  if (!itens.length) return <p className="text-sm text-mut">{vazio}</p>;
  return (
    <ul className="space-y-2">
      {itens.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm leading-snug text-dim">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-current ${cor}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function fmtUSD(v: number): string {
  return `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: v < 0.1 ? 3 : 2, maximumFractionDigits: v < 0.1 ? 3 : 2 })}`;
}

export function fmtTokens(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil` : n.toLocaleString("pt-BR");
}

/** "3.120 tokens de entrada + 2.850 de saída ≈ US$ 0,069" */
export function GastoIA({ uso }: { uso: Pick<UsoIA, "entrada" | "saida" | "custo_usd"> }) {
  return (
    <span className="tabular-nums">
      {fmtTokens(uso.entrada)} tokens de entrada + {fmtTokens(uso.saida)} de saída ≈{" "}
      <strong className="font-semibold text-dim">{fmtUSD(uso.custo_usd)}</strong>
    </span>
  );
}

export function fmtTempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** O repertório coringa daquele parágrafo: os pontos do tema, o "para decorar" e os 6 coringas. */
export function Repertorio({
  tema,
  tipo,
  aspecto,
}: {
  tema: TemaParagrafo;
  tipo: TipoParagrafo;
  aspecto: number | null;
}) {
  const pontos = pontosDoParagrafo(tema, tipo, aspecto);
  const tipoAsp = tipo === "introducao" ? "cenario" : tipoDoAspecto(tema.aspectos[aspecto ?? 0].texto);
  const coringas = CORINGAS.filter((c) => c.frases[tipoAsp]);
  const e = tema.esqueleto;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pt-2">
        <Lightbulb className="size-5 text-gold" />
        <h2 className="text-lg font-bold text-txt">Repertório para este parágrafo</h2>
      </div>

      <Secao titulo={tipo === "introducao" ? "Fatos para abrir" : `Pontos para o aspecto ${(aspecto ?? 0) + 1}`}>
        <ul className="space-y-2">
          {pontos.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-txt">
              <span className="font-bold text-gold">{i + 1}.</span>
              <span>
                <Negrito texto={p} />
              </span>
            </li>
          ))}
        </ul>
        {tipo === "introducao" && (
          <div className="mt-4 border-t border-line/40 pt-3">
            <p className="text-xs font-semibold text-dim">Anúncio dos aspectos</p>
            <p className="mt-1 text-sm leading-relaxed text-dim">
              Nesse sentido, vale citar <strong className="text-txt">{e.anuncia[0]}</strong>, expor{" "}
              <strong className="text-txt">{e.anuncia[1]}</strong> e <strong className="text-txt">{e.anuncia[2]}</strong>.
            </p>
            {e.pronta && (
              <>
                <p className="mt-3 text-xs font-semibold text-dim">Introdução pronta (do PDF)</p>
                <p className="mt-1 text-sm italic leading-relaxed text-dim">{e.pronta}</p>
              </>
            )}
          </div>
        )}
      </Secao>

      {tema.decorar.length > 0 && (
        <Secao titulo="Para decorar deste tema">
          <ul className="space-y-2.5">
            {tema.decorar.map((d, i) => (
              <li key={i} className="text-sm leading-snug text-dim">
                {d.titulo && (
                  <strong className="font-semibold text-txt">
                    {d.titulo}
                    {d.texto ? ": " : ""}
                  </strong>
                )}
                <Negrito texto={d.texto} />
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo={`Coringas · ${ROTULO_TIPO[tipoAsp]}`}>
        <p className="mb-3 text-xs text-mut">
          Servem em quase todo tema. Pegue 2 de coringas diferentes e você tem os 2 pontos do parágrafo.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {coringas.map((c) => (
            <div key={c.nome} className="rounded-xl border border-line/50 bg-navy-900/60 px-3 py-2.5">
              <p className="text-xs font-bold text-gold">{c.nome}</p>
              <p className="mt-1 text-sm leading-snug text-txt">{c.frases[tipoAsp]}.</p>
              <p className="mt-1 text-[11px] text-mut">{c.base}</p>
            </div>
          ))}
        </div>
      </Secao>

      <p className="text-center text-xs text-mut">Abertura do esqueleto: {aberturaDoParagrafo(tipo, aspecto)}</p>

      {/* O modelo fica por último: primeiro o repertório, depois a resposta pronta. */}
      <Secao
        titulo={
          <span className="inline-flex items-center gap-1.5">
            <BadgeCheck className="size-3.5 text-green" /> Parágrafo modelo · nota máxima
          </span>
        }
        className="ring-1 ring-green/30"
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-txt">
          {modeloDoParagrafo(tema, tipo, aspecto)}
        </p>
        <p className="mt-3 border-t border-line/40 pt-2 text-[11px] leading-relaxed text-mut">
          Escrito no seu esqueleto, pelos critérios da Cebraspe: responde ao aspecto com as palavras do enunciado,
          desenvolve 2 pontos com informação concreta e fecha ligando ao tema, sem os erros que a banca desconta
          (estrangeirismo entre aspas, vírgulas da norma, nada de falar com o leitor). Não é o único jeito certo: outra
          abordagem bem desenvolvida também tira nota máxima.
        </p>
      </Secao>
    </div>
  );
}
