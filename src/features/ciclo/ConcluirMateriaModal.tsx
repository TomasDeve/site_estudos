import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useRegistrarBlocoFeito } from "@/api/planoHoras";
import { ATIVIDADES, type AtividadeChave } from "@/features/metas/planoDias";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/Field";

const DURACOES = [15, 25, 30, 45, 60, 90, 120];

/** Mesmo visual do rótulo do Field. */
const ROTULO = "mb-1.5 block text-xs font-medium tracking-wide text-dim";

/** Texto livre não entra: aqui o bloco é sempre da matéria da vez. */
const ATIVIDADES_DO_BLOCO = ATIVIDADES.filter((a) => a.chave !== "livre");

interface Props {
  open: boolean;
  onClose: () => void;
  materiaId: string;
  materiaNome: string;
  materiaIcone: string;
  dataISO: string;
  /** Avança o ciclo: depois de lançar o bloco, ou direto no "Já registrei". */
  onAvancar: () => Promise<void>;
}

/**
 * "Concluir e avançar" do Ciclo: lança no plano do Painel um bloco já feito da
 * matéria da vez (o tempo soma no dia) e avança o ciclo. "Já registrei" só
 * avança — para quando o bloco já está no plano.
 */
export function ConcluirMateriaModal({
  open,
  onClose,
  materiaId,
  materiaNome,
  materiaIcone,
  dataISO,
  onAvancar,
}: Props) {
  const registrar = useRegistrarBlocoFeito();
  const [nota, setNota] = useState("");
  const [atividade, setAtividade] = useState<AtividadeChave>("teoria");
  const [duracao, setDuracao] = useState("30");
  const [dia, setDia] = useState(dataISO);
  const [pulando, setPulando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNota("");
    setAtividade("teoria");
    setDuracao("30");
    setDia(dataISO);
  }, [open, dataISO]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await registrar.mutateAsync({
        data: dia,
        materia_id: materiaId,
        atividade,
        nota: nota.trim(),
        minutos: Number(duracao),
      });
      await onAvancar();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onJaRegistrei() {
    setPulando(true);
    try {
      await onAvancar();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPulando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar estudo e avançar"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="secondary" onClick={onJaRegistrei} loading={pulando}>
            Já registrei
          </Button>
          <Button type="submit" form="form-concluir-materia" loading={registrar.isPending}>
            Salvar e avançar
          </Button>
        </>
      }
    >
      <form id="form-concluir-materia" onSubmit={onSubmit} className="space-y-4">
        <p className="flex items-center gap-2 rounded-lg border border-line/50 bg-navy-900/50 px-3 py-2 text-sm font-semibold text-txt">
          <span className="text-base leading-none">{materiaIcone}</span> {materiaNome}
          <span className="ml-auto text-[11px] font-normal text-mut">entra feito no plano do Painel</span>
        </p>
        <Field label="O que estudou? (opcional)">
          <Input
            autoFocus
            placeholder="Ex.: crimes contra a pessoa, 30 questões"
            value={nota}
            maxLength={120}
            onChange={(e) => setNota(e.target.value)}
          />
        </Field>
        {/* Grades de botões fora do <label> do Field: clicar no vão entre eles
            acionaria o 1º botão. */}
        <div>
          <span className={ROTULO}>Atividade</span>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ATIVIDADES_DO_BLOCO.map((a) => {
              const ativo = atividade === a.chave;
              return (
                <button
                  key={a.chave}
                  type="button"
                  onClick={() => setAtividade(a.chave)}
                  aria-pressed={ativo}
                  className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors ${
                    ativo
                      ? `border-current ${a.fundo} ${a.texto}`
                      : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
                  }`}
                >
                  <span className="leading-none">{a.icone}</span>
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <span className={ROTULO}>Duração</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {DURACOES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuracao(String(d))}
                className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  duracao === String(d)
                    ? "border-gold/60 bg-gold/15 text-gold"
                    : "border-line bg-navy-900 text-dim hover:border-gold/40"
                }`}
              >
                {d}min
              </button>
            ))}
            <Input
              type="number"
              min="1"
              max="600"
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
              className="!h-8 w-20 !text-xs"
              aria-label="Duração em minutos"
            />
          </div>
        </div>
        <Field label="Dia">
          <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
