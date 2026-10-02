import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { Concurso } from "@/types/db";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { diasAte, fmtData } from "@/lib/dates";
import { INFO_CONCURSOS, type DataEdital, type InfoConcurso } from "./infoConcursos";

export function InformacoesPage() {
  return <InformacoesConteudo concurso={useConcursoAtual()} />;
}

export function InformacoesConteudo({ concurso }: { concurso: Concurso }) {
  const info = INFO_CONCURSOS[concurso.slug];
  if (!info) {
    return (
      <>
        <PageHeader title="Informações" />
        <EmptyState
          icon="📄"
          title="Sem informações do edital"
          message="Ainda não cadastrei a ficha deste concurso. Quando o edital sair, ela aparece aqui."
        />
      </>
    );
  }
  const cor = concurso.cor;

  return (
    <>
      <PageHeader
        title="Informações"
        subtitle={info.edital}
        action={
          <a
            href={info.site}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: cor }}
          >
            Página do concurso <ExternalLink className="size-3.5" />
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        {info.destaques.map((d) => (
          <StatCard key={d.rotulo} icon={d.icone} label={d.rotulo} value={d.valor} sub={d.sub} />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="lg:row-span-2">
          <CardHeader title="📅 Datas" subtitle="Cronograma previsto — pode mudar por edital de retificação" />
          <CardBody>
            <Cronograma datas={info.datas} cor={cor} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="📝 A prova" subtitle="Divisão das questões" />
          <CardBody className="space-y-3">
            {info.provas.map((p) => (
              <div key={p.prova} className="rounded-xl border border-line/50 bg-navy-900/40 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-txt">
                    <span style={{ color: cor }}>{p.prova}</span> · {p.area}
                  </p>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-txt">
                    {p.questoes} <span className="text-xs font-medium text-mut">questões</span>
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-dim">{p.materias.join(" · ")}</p>
              </div>
            ))}
            <div className="rounded-xl border border-line/50 bg-navy-900/40 p-3">
              <p className="text-xs leading-relaxed text-dim">{info.discursiva}</p>
            </div>
            <Lista itens={info.regrasProva} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="🏃 TAF — prova de capacidade física" subtitle="Índice mínimo em cada teste" />
          <CardBody className="space-y-3">
            <TabelaTaf info={info} />
            <Lista itens={info.taf.regras} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="🎒 No dia da prova" />
          <CardBody>
            <Lista itens={info.diaDaProva} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="🪜 Etapas depois da prova" subtitle="Todas eliminatórias" />
          <CardBody>
            <ol className="space-y-3">
              {info.etapas.map((e, i) => (
                <li key={e.nome} className="flex gap-3">
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: `${cor}26`, color: cor }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-txt">
                      {e.nome} <span className="text-xs font-medium text-mut">· {e.quando}</span>
                    </p>
                    <p className="text-xs leading-relaxed text-dim">{e.detalhe}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="👥 Vagas" subtitle={`${info.vagas.reduce((s, v) => s + v.n, 0).toLocaleString("pt-BR")} no total`} />
          <CardBody className="space-y-2">
            {info.vagas.map((v) => (
              <BarraVagas key={v.rotulo} rotulo={v.rotulo} n={v.n} max={info.vagas[0].n} cor={cor} />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="✅ Requisitos do cargo" />
          <CardBody>
            <Lista itens={info.requisitos} />
          </CardBody>
        </Card>

        {info.extras.map((x) => (
          <Card key={x.titulo}>
            <CardHeader title={`${x.icone} ${x.titulo}`} />
            <CardBody>
              <Lista itens={x.itens} />
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}

type Situacao = "passou" | "agora" | "proxima" | "futura";

function situacaoDe(d: DataEdital): { s: Situacao; dias: number } {
  const ateInicio = diasAte(d.inicio);
  const ateFim = diasAte(d.fim ?? d.inicio);
  if (ateFim < 0) return { s: "passou", dias: ateFim };
  if (ateInicio <= 0) return { s: "agora", dias: ateFim };
  return { s: "futura", dias: ateInicio };
}

function Cronograma({ datas, cor }: { datas: DataEdital[]; cor: string }) {
  const comSituacao = datas.map((d) => ({ d, ...situacaoDe(d) }));
  // A próxima data a acontecer ganha o realce (a primeira futura na ordem do edital).
  const iProxima = comSituacao.findIndex((x) => x.s === "futura");
  if (iProxima >= 0) comSituacao[iProxima].s = "proxima";

  return (
    <ol className="relative space-y-3 border-l border-line/50 pl-4">
      {comSituacao.map(({ d, s, dias }) => {
        const passou = s === "passou";
        const vivo = s === "agora" || s === "proxima";
        return (
          <li key={d.titulo + d.inicio} className={`relative ${passou ? "opacity-45" : ""}`}>
            <span
              className="absolute -left-[21.5px] top-1.5 size-2.5 rounded-full border-2 border-navy-800"
              style={{ background: vivo || d.destaque ? cor : "var(--color-line)" }}
            />
            <p className="text-xs font-semibold tabular-nums text-mut">
              {fmtData(d.inicio)}
              {d.fim && ` a ${fmtData(d.fim)}`}
              {s === "agora" && (
                <Selo cor={cor}>{dias === 0 ? "termina hoje" : `aberto · faltam ${dias} d`}</Selo>
              )}
              {s === "proxima" && <Selo cor={cor}>{dias === 1 ? "amanhã" : `em ${dias} dias`}</Selo>}
            </p>
            <p className={`text-sm ${d.destaque ? "font-semibold text-txt" : "text-dim"} ${passou ? "line-through" : ""}`}>
              {d.titulo}
            </p>
            {d.obs && <p className="text-[11px] leading-snug text-mut">{d.obs}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function Selo({ cor, children }: { cor: string; children: ReactNode }) {
  return (
    <span
      className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: `${cor}26`, color: cor }}
    >
      {children}
    </span>
  );
}

function TabelaTaf({ info }: { info: InfoConcurso }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line/50">
      <table className="w-full text-left text-xs">
        <thead className="bg-navy-900/60 text-[10px] uppercase tracking-wide text-mut">
          <tr>
            <th className="px-3 py-2 font-semibold">Teste</th>
            <th className="px-2 py-2 font-semibold">Homem</th>
            <th className="px-2 py-2 font-semibold">Mulher</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          {info.taf.testes.map((t) => (
            <tr key={t.teste} className="align-top">
              <td className="px-3 py-2">
                <p className="font-semibold text-txt">{t.teste}</p>
                {t.obs && <p className="text-[11px] leading-snug text-mut">{t.obs}</p>}
              </td>
              <td className="px-2 py-2 font-semibold tabular-nums text-txt">{t.homem}</td>
              <td className="px-2 py-2 tabular-nums text-dim">{t.mulher}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarraVagas({ rotulo, n, max, cor }: { rotulo: string; n: number; max: number; cor: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-dim">{rotulo}</span>
        <span className="font-semibold tabular-nums text-txt">{n.toLocaleString("pt-BR")}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-navy-700">
        <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: cor }} />
      </div>
    </div>
  );
}

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="space-y-1.5">
      {itens.map((t) => (
        <li key={t} className="flex gap-2 text-xs leading-relaxed text-dim">
          <span className="mt-[7px] size-1 shrink-0 rounded-full bg-mut" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
