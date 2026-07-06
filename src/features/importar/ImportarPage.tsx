import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMaterias } from "@/api/materias";
import { useAliases, useSalvarAliases } from "@/api/aliases";
import { useCriarQuestaoLogsEmLote } from "@/api/questaoLogs";
import { hojeISO } from "@/lib/dates";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Field, Input, Select, Textarea } from "@/components/Field";
import { matchMateria, normalizar, parseQconcursos, type ParsedRow } from "./parser";

interface LinhaPreview extends ParsedRow {
  materiaId: string | ""; // "" = ignorar
  autoMatch: boolean;
}

const COR_CONFIANCA: Record<string, string> = {
  alta: "bg-green",
  media: "bg-amber",
  baixa: "bg-red",
};

export function ImportarPage() {
  const navigate = useNavigate();
  const { data: materias } = useMaterias();
  const { data: aliases } = useAliases();
  const salvarAliases = useSalvarAliases();
  const inserirLote = useCriarQuestaoLogsEmLote();

  const [texto, setTexto] = useState("");
  const [data, setData] = useState(hojeISO());
  const [linhas, setLinhas] = useState<LinhaPreview[] | null>(null);

  const aliasesMap = useMemo(
    () => new Map((aliases ?? []).map((a) => [a.alias_normalizado, a.materia_id])),
    [aliases]
  );

  function interpretar() {
    const rows = parseQconcursos(texto);
    if (rows.length === 0) {
      toast.error(
        "Não consegui interpretar nada. Copie a tabela de estatísticas do Qconcursos (nome da matéria + números) e cole aqui."
      );
      return;
    }
    setLinhas(
      rows.map((r) => {
        const m = matchMateria(
          r.materiaTexto,
          (materias ?? []).map((x) => ({ id: x.id, slug: x.slug, nome: x.nome })),
          aliasesMap
        );
        return { ...r, materiaId: m.materiaId ?? "", autoMatch: m.materiaId !== null };
      })
    );
  }

  async function confirmar() {
    if (!linhas) return;
    const validas = linhas.filter((l) => l.materiaId !== "" || l.materiaTexto);
    if (validas.length === 0) return;
    try {
      // memoriza os mapeamentos escolhidos para os próximos imports
      const paresAlias = linhas
        .filter((l) => l.materiaId !== "")
        .map((l) => ({ alias_normalizado: normalizar(l.materiaTexto), materia_id: l.materiaId }));
      await salvarAliases.mutateAsync(paresAlias);

      await inserirLote.mutateAsync(
        validas.map((l) => ({
          data,
          total: l.total,
          acertos: l.acertos,
          materia_id: l.materiaId || null,
          materia_texto: l.materiaTexto,
          origem: "import_qc",
        }))
      );
      toast.success(`${validas.length} registros importados! 🎉`);
      navigate("..");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to=".."
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-mut hover:text-dim"
        >
          <ArrowLeft className="size-3.5" /> Métricas
        </Link>
        <PageHeader
          title="Importar do Qconcursos"
          subtitle="O Qconcursos não tem API — mas colar e interpretar resolve em segundos"
        />
      </div>

      <Card>
        <CardHeader
          title="1 · Cole as estatísticas"
          subtitle="No Qconcursos: Meu desempenho → estatísticas por disciplina → selecione a tabela (Ctrl+A na área) → copie (Ctrl+C) → cole aqui"
        />
        <CardBody className="space-y-3">
          <Textarea
            rows={8}
            placeholder={"Exemplo do que funciona:\nLíngua Portuguesa\t120\t90\t30\nDireito Constitucional\n132 questões\n99 acertos (75%)"}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="font-mono !text-xs"
          />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field label="Data de referência" hint="Os registros entram nesta data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
            <Button onClick={interpretar} disabled={texto.trim() === ""}>
              <Sparkles className="size-4" /> Interpretar
            </Button>
          </div>
        </CardBody>
      </Card>

      {linhas && (
        <Card>
          <CardHeader
            title="2 · Confira e confirme"
            subtitle="Ajuste a matéria de cada linha — o site memoriza para o próximo import"
          />
          <CardBody className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-mut">
                  <th className="py-2 pr-2 font-semibold">Texto detectado</th>
                  <th className="px-2 py-2 font-semibold">Matéria no site</th>
                  <th className="px-2 py-2 text-right font-semibold">Questões</th>
                  <th className="px-2 py-2 text-right font-semibold">Acertos</th>
                  <th className="px-2 py-2 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) => (
                  <tr key={i} className="border-t border-line/30">
                    <td className="max-w-44 truncate py-2 pr-2 text-xs text-dim" title={l.materiaTexto}>
                      <span
                        className={`mr-2 inline-block size-2 rounded-full ${COR_CONFIANCA[l.confianca]}`}
                        title={`Confiança da leitura: ${l.confianca}`}
                      />
                      {l.materiaTexto}
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={l.materiaId}
                        onChange={(e) =>
                          setLinhas((old) =>
                            old!.map((x, j) => (j === i ? { ...x, materiaId: e.target.value } : x))
                          )
                        }
                        className="!h-8 !text-xs"
                      >
                        <option value="">— sem matéria (geral) —</option>
                        {(materias ?? []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.icone} {m.nome}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-txt">{l.total}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-txt">{l.acertos}</td>
                    <td className="px-2 py-2 text-right font-bold tabular-nums text-gold">
                      {Math.round((l.acertos / l.total) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setLinhas(null)}>
                Voltar
              </Button>
              <Button
                onClick={confirmar}
                loading={salvarAliases.isPending || inserirLote.isPending}
              >
                Importar {linhas.length} {linhas.length === 1 ? "registro" : "registros"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
