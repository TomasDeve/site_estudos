import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Check, Clock, Link2, Plus, Pointer, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import type { FingerbotHorario } from "@/types/db";
import {
  useApertarAgora,
  useAtualizarFingerbotHorario,
  useCriarFingerbotHorario,
  useExcluirFingerbotHorario,
  useFingerbotConfigurado,
  useFingerbotDisparos,
  useFingerbotHorarios,
  useSalvarFingerbotWebhook,
  type FingerbotDisparo,
} from "@/api/fingerbot";
import { FullScreenSpinner } from "@/components/Spinner";
import { DIAS_CURTOS, DIAS_NOMES, FUSO, descreverDias, hhmm, proximoAperto } from "./agenda";

/**
 * Seção "Fingerbot": horários para o cubo apertar o botão sozinho. O banco (pg_cron, fuso
 * de Recife) chama na hora certa o link do MacroDroid no celular A50, que abre o Smart Life
 * e toca no interruptor. Também tem "Apertar agora" e o histórico. Abre em aba própria.
 */
export function FingerbotPage() {
  const navigate = useNavigate();
  const { data: horarios, isLoading } = useFingerbotHorarios();
  const { data: configurado, isLoading: carregandoConfig } = useFingerbotConfigurado();
  const apertar = useApertarAgora();
  const [adicionando, setAdicionando] = useState(false);
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const anterior = document.title;
    document.title = "Fingerbot";
    const t = setInterval(() => setAgora(new Date()), 30_000);
    return () => {
      document.title = anterior;
      clearInterval(t);
    };
  }, []);

  const proximo = useMemo(() => proximoAperto(horarios ?? [], agora), [horarios, agora]);

  if (isLoading || carregandoConfig) return <FullScreenSpinner />;

  function voltar() {
    if (window.history.length > 1) navigate(-1);
    else window.close();
  }

  function apertarAgora() {
    apertar.mutate(undefined, {
      onSuccess: () => toast.success("Enviado! O celular leva uns 30 s para apertar."),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para enviar"),
    });
  }

  const textoProximo = proximo
    ? `Próximo: ${
        proximo.emDias === 0 ? "hoje" : proximo.emDias === 1 ? "amanhã" : DIAS_NOMES[proximo.dow]
      } às ${proximo.hora}`
    : "Nenhum horário ligado";

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
        <Pointer className="size-4 shrink-0 text-gold max-sm:hidden" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold leading-snug text-txt sm:text-base">Fingerbot</h1>
          <p className="truncate text-[11px] text-mut">{textoProximo}</p>
        </div>
        <button
          onClick={apertarAgora}
          disabled={!configurado || apertar.isPending}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="size-3.5" /> {apertar.isPending ? "Enviando…" : "Apertar agora"}
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-3 pb-24 pt-4 sm:px-6 sm:py-6">
        {!configurado && <ConfigWebhook obrigatorio />}

        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wide text-mut">
              Horários · {horarios?.length ?? 0}
            </h2>
            {!adicionando && (
              <button
                onClick={() => setAdicionando(true)}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gold hover:bg-gold/10"
              >
                <Plus className="size-3.5" /> Novo horário
              </button>
            )}
          </div>

          {adicionando && <FormHorario onFechar={() => setAdicionando(false)} />}

          {!horarios?.length && !adicionando ? (
            <p className="rounded-xl border border-dashed border-line/60 px-4 py-8 text-center text-sm text-mut">
              Nenhum horário ainda. Toque em “Novo horário”, escolha a hora e os dias da semana.
            </p>
          ) : (
            <ul className="space-y-2">
              {horarios?.map((h) => <CardHorario key={h.id} horario={h} />)}
            </ul>
          )}
          <p className="px-1 text-[11px] text-mut">
            Horários no fuso de Recife ({FUSO}). Cada aperto leva uns 30 s: o celular acorda, abre o Smart
            Life, conecta no cubo e toca no botão.
          </p>
        </section>

        <Historico />

        {configurado && <ConfigWebhook />}
      </main>
    </div>
  );
}

const campo =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-navy-950 px-3 text-sm text-txt outline-none placeholder:text-mut/70 focus:border-gold/60";

function SeletorDias({ dias, onChange }: { dias: number[]; onChange: (d: number[]) => void }) {
  return (
    <div className="flex gap-1">
      {DIAS_CURTOS.map((letra, d) => {
        const on = dias.includes(d);
        return (
          <button
            key={d}
            type="button"
            title={DIAS_NOMES[d]}
            aria-pressed={on}
            onClick={() => {
              const novo = on ? dias.filter((x) => x !== d) : [...dias, d].sort((a, b) => a - b);
              if (novo.length) onChange(novo);
              else toast.error("Deixe pelo menos um dia");
            }}
            className={`size-8 cursor-pointer rounded-full border text-xs font-bold transition-colors ${
              on ? "border-gold/70 bg-gold/20 text-gold" : "border-line/60 text-mut hover:text-txt"
            }`}
          >
            {letra}
          </button>
        );
      })}
    </div>
  );
}

function FormHorario({ onFechar }: { onFechar: () => void }) {
  const criar = useCriarFingerbotHorario();
  const [hora, setHora] = useState("07:00");
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [rotulo, setRotulo] = useState("");

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(hora)) {
      toast.error("Escolha a hora");
      return;
    }
    criar.mutate(
      { hora: `${hora}:00`, dias, rotulo: rotulo.trim() },
      {
        onSuccess: () => {
          toast.success("Horário salvo");
          onFechar();
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Não deu para salvar"),
      }
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-3 rounded-xl border border-gold/40 bg-navy-800 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
          className={`${campo} w-32 text-lg font-semibold tabular-nums`}
          required
        />
        <SeletorDias dias={dias} onChange={setDias} />
      </div>
      <input
        value={rotulo}
        onChange={(e) => setRotulo(e.target.value)}
        placeholder="Nome (opcional) — ex.: Ligar o PC"
        className={campo}
        maxLength={60}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onFechar}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-dim hover:text-txt"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={criar.isPending}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-navy-950 disabled:opacity-50"
        >
          <Check className="size-3.5" /> Salvar
        </button>
      </div>
    </form>
  );
}

function CardHorario({ horario: h }: { horario: FingerbotHorario }) {
  const atualizar = useAtualizarFingerbotHorario();
  const excluir = useExcluirFingerbotHorario();
  const [confirmando, setConfirmando] = useState(false);

  function salvar(patch: Partial<Pick<FingerbotHorario, "hora" | "dias" | "ativo">>) {
    atualizar.mutate(
      { id: h.id, ...patch },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar") }
    );
  }

  return (
    <li
      className={`space-y-2 rounded-xl border bg-navy-800 p-3 transition-opacity ${
        h.ativo ? "border-line/60" : "border-line/30 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="time"
          defaultValue={hhmm(h.hora)}
          key={h.hora}
          onBlur={(e) => {
            const v = e.target.value;
            if (/^\d{2}:\d{2}$/.test(v) && v !== hhmm(h.hora)) salvar({ hora: `${v}:00` });
          }}
          className="w-28 rounded-lg border border-transparent bg-transparent px-1 text-2xl font-bold tabular-nums text-txt outline-none hover:border-line focus:border-gold/60"
          aria-label="Hora"
        />
        <div className="min-w-0 flex-1">
          {h.rotulo && <p className="truncate text-sm font-semibold text-txt">{h.rotulo}</p>}
          <p className="truncate text-xs text-mut">{descreverDias(h.dias)}</p>
        </div>
        <button
          role="switch"
          aria-checked={h.ativo}
          aria-label={h.ativo ? "Desligar horário" : "Ligar horário"}
          onClick={() => salvar({ ativo: !h.ativo })}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            h.ativo ? "bg-green" : "bg-navy-600"
          }`}
        >
          <span
            className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${h.ativo ? "left-[22px]" : "left-0.5"}`}
          />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2">
        <SeletorDias dias={h.dias} onChange={(dias) => salvar({ dias })} />
        {confirmando ? (
          <span className="flex items-center gap-1">
            <button
              onClick={() =>
                excluir.mutate(h.id, {
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para excluir"),
                })
              }
              className="cursor-pointer rounded-lg bg-red/15 px-2 py-1 text-xs font-semibold text-red hover:bg-red/25"
            >
              Excluir
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="cursor-pointer rounded-lg p-1 text-mut hover:text-txt"
              aria-label="Cancelar"
            >
              <X className="size-4" />
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmando(true)}
            className="cursor-pointer rounded-lg p-1.5 text-mut hover:bg-red/10 hover:text-red"
            aria-label="Excluir horário"
            title="Excluir horário"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}

function Historico() {
  const { data: disparos } = useFingerbotDisparos();
  const { data: horarios } = useFingerbotHorarios();
  const porId = new Map((horarios ?? []).map((h) => [h.id, h]));

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-mut">Últimos apertos</h2>
      {!disparos?.length ? (
        <p className="px-1 text-xs text-mut">Nenhum ainda.</p>
      ) : (
        <ul className="divide-y divide-line/40 rounded-xl border border-line/50 bg-navy-800">
          {disparos.map((d) => (
            <LinhaDisparo key={d.id} d={d} horario={d.horario_id ? porId.get(d.horario_id) : undefined} />
          ))}
        </ul>
      )}
    </section>
  );
}

function LinhaDisparo({ d, horario }: { d: FingerbotDisparo; horario?: FingerbotHorario }) {
  const quando = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d.criado_em));
  const ok = d.status_code !== null && d.status_code >= 200 && d.status_code < 300;
  const falhou = !!d.erro || (d.status_code !== null && !ok);
  return (
    <li className="flex items-center gap-2 px-3 py-2 text-xs">
      {d.origem === "manual" ? (
        <Zap className="size-3.5 shrink-0 text-gold" />
      ) : (
        <Clock className="size-3.5 shrink-0 text-blue" />
      )}
      <span className="tabular-nums text-dim">{quando}</span>
      <span className="min-w-0 flex-1 truncate text-mut">
        {d.origem === "manual" ? "Apertar agora" : horario?.rotulo || (horario ? `Horário ${hhmm(horario.hora)}` : "Horário")}
      </span>
      <span className={`shrink-0 font-semibold ${falhou ? "text-red" : ok ? "text-green" : "text-mut"}`}>
        {falhou ? (d.erro ? "Falhou" : `Erro ${d.status_code}`) : ok ? "Enviado" : "Enviando…"}
      </span>
    </li>
  );
}

function ConfigWebhook({ obrigatorio = false }: { obrigatorio?: boolean }) {
  const salvar = useSalvarFingerbotWebhook();
  const [aberto, setAberto] = useState(obrigatorio);
  const [url, setUrl] = useState("");

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex cursor-pointer items-center gap-1.5 px-1 text-[11px] text-mut hover:text-dim"
      >
        <Link2 className="size-3.5" /> Trocar o link do MacroDroid
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        salvar.mutate(url.trim(), {
          onSuccess: () => {
            toast.success("Link salvo");
            setUrl("");
            if (!obrigatorio) setAberto(false);
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : "Link inválido"),
        });
      }}
      className="space-y-2 rounded-xl border border-line/60 bg-navy-800 p-3"
    >
      <p className="text-xs text-dim">
        Cole o link do gatilho <b>Webhook (URL)</b> da macro “Fingerbot” no MacroDroid (começa com
        https://trigger.macrodroid.com/).
      </p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://trigger.macrodroid.com/…"
          className={campo}
          required
        />
        <button
          type="submit"
          disabled={salvar.isPending}
          className="shrink-0 cursor-pointer rounded-lg bg-gold px-3 text-xs font-bold text-navy-950 disabled:opacity-50"
        >
          Salvar
        </button>
        {!obrigatorio && (
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="shrink-0 cursor-pointer rounded-lg px-2 text-mut hover:text-txt"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </form>
  );
}
