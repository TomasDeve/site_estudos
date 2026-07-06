import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { TopicoStatus } from "@/types/db";

/**
 * Importa o progresso do site v1: cole o JSON do
 * localStorage["estudos_concursos_v2"] (ou só o objeto `topics`).
 * Formato: { topics: { "materiaSlug:indice": 0|1|2|3 } }
 * Mapa de status: 1→estudando, 2→revisar, 3→concluido (0 é ignorado).
 */
const MAPA_STATUS: Record<number, TopicoStatus> = {
  1: "estudando",
  2: "revisar",
  3: "concluido",
};

export interface ImportLegadoResultado {
  aplicados: number;
  ignorados: number;
}

export async function importLegacyProgress(rawJson: string): Promise<ImportLegadoResultado> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("JSON inválido. Cole exatamente o valor de estudos_concursos_v2.");
  }
  const obj = parsed as { topics?: Record<string, number> } & Record<string, unknown>;
  const topics: Record<string, number> =
    obj.topics ?? (parsed as Record<string, number>);
  const entradas = Object.entries(topics).filter(
    ([k, v]) => typeof v === "number" && v > 0 && k.includes(":")
  );
  if (entradas.length === 0) {
    throw new Error("Nenhum progresso encontrado no JSON colado.");
  }

  const materias = await fetchAll<{ id: string; slug: string }>((f, t) =>
    supabase.from("materias").select("id, slug").range(f, t)
  );
  const topicos = await fetchAll<{ id: string; materia_id: string; ordem: number }>((f, t) =>
    supabase.from("topicos").select("id, materia_id, ordem").range(f, t)
  );
  const matPorSlug = new Map(materias.map((m) => [m.slug, m.id]));
  const topPorChave = new Map(topicos.map((t) => [`${t.materia_id}:${t.ordem}`, t.id]));

  const porStatus: Record<TopicoStatus, string[]> = {
    nao_estudado: [],
    estudando: [],
    revisar: [],
    concluido: [],
  };
  let ignorados = 0;
  for (const [chave, valor] of entradas) {
    const sep = chave.lastIndexOf(":");
    const slug = chave.slice(0, sep);
    const ordem = Number(chave.slice(sep + 1));
    const materiaId = matPorSlug.get(slug);
    const topicoId = materiaId != null ? topPorChave.get(`${materiaId}:${ordem}`) : undefined;
    const status = MAPA_STATUS[valor];
    if (topicoId && status) porStatus[status].push(topicoId);
    else ignorados++;
  }

  let aplicados = 0;
  for (const [status, ids] of Object.entries(porStatus) as [TopicoStatus, string[]][]) {
    for (let i = 0; i < ids.length; i += 200) {
      const lote = ids.slice(i, i + 200);
      const { error } = await supabase.from("topicos").update({ status }).in("id", lote);
      if (error) throw error;
      aplicados += lote.length;
    }
  }
  return { aplicados, ignorados };
}
