import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { runSeed } from "@/seed/runSeed";
import { importLegacyProgress } from "@/seed/importLegacyProgress";
import { Card, CardBody } from "@/components/Card";
import { Button } from "@/components/Button";
import { Textarea } from "@/components/Field";

export function SeedCard() {
  const qc = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [mostrarLegado, setMostrarLegado] = useState(false);
  const [jsonLegado, setJsonLegado] = useState("");
  const [importando, setImportando] = useState(false);

  async function onSeed() {
    setSeeding(true);
    try {
      const r = await runSeed();
      await qc.invalidateQueries();
      toast.success(
        `Catálogo importado: ${r.concursos} concursos, ${r.materias} matérias, ${r.topicosNovos} tópicos.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSeeding(false);
    }
  }

  async function onImportLegado() {
    setImportando(true);
    try {
      const r = await importLegacyProgress(jsonLegado);
      await qc.invalidateQueries();
      toast.success(
        `Progresso migrado: ${r.aplicados} tópicos atualizados` +
          (r.ignorados > 0 ? ` (${r.ignorados} ignorados).` : ".")
      );
      setJsonLegado("");
      setMostrarLegado(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setImportando(false);
    }
  }

  return (
    <Card className="border-gold/25 bg-gradient-to-br from-navy-800 to-navy-700/60">
      <CardBody className="py-6">
        <div className="flex items-start gap-4">
          <span className="text-3xl">🚀</span>
          <div className="flex-1">
            <h3 className="font-bold text-txt">Comece por aqui</h3>
            <p className="mt-1 text-sm leading-relaxed text-dim">
              Importe o catálogo pronto com <strong>PMAL 2026 — Soldado</strong> e{" "}
              <strong>PC AL 2026 — Escrivão</strong>: 22 matérias e 194 tópicos de edital
              verticalizado. Ou crie um concurso do zero no botão acima.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={onSeed} loading={seeding}>
                Importar PMAL + PC AL
              </Button>
              <Button variant="ghost" onClick={() => setMostrarLegado((v) => !v)}>
                Migrar progresso do site antigo
              </Button>
            </div>
            {mostrarLegado && (
              <div className="mt-4 space-y-2 rounded-xl border border-line/60 bg-navy-900/60 p-4">
                <p className="text-xs leading-relaxed text-mut">
                  No site antigo, abra o DevTools (F12) → Console e rode{" "}
                  <code className="rounded bg-navy-700 px-1.5 py-0.5 text-gold-soft">
                    copy(localStorage.getItem("estudos_concursos_v2"))
                  </code>
                  . Depois cole aqui. (Rode a importação do catálogo primeiro.)
                </p>
                <Textarea
                  rows={4}
                  placeholder='{"lastConcurso":"pmal_soldado","topics":{"portugues:0":3,...}}'
                  value={jsonLegado}
                  onChange={(e) => setJsonLegado(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={onImportLegado}
                  loading={importando}
                  disabled={jsonLegado.trim() === ""}
                >
                  Aplicar progresso
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
