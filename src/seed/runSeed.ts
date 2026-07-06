import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { SEED_MATERIAS, SEED_CONCURSOS, SEED_FERRAMENTAS } from "./seedData";

export interface SeedResultado {
  materias: number;
  topicosNovos: number;
  concursos: number;
}

/** Importa o catálogo PMAL + PC AL. Idempotente: pode rodar mais de uma vez. */
export async function runSeed(): Promise<SeedResultado> {
  // 1. Matérias (upsert por user_id+slug)
  const { data: mats, error: eMat } = await supabase
    .from("materias")
    .upsert(
      SEED_MATERIAS.map((m) => ({ slug: m.slug, nome: m.nome, icone: m.icone })),
      { onConflict: "user_id,slug" }
    )
    .select("id, slug");
  if (eMat) throw eMat;
  const matId = new Map(mats.map((m) => [m.slug, m.id]));

  // 2. Tópicos: insere apenas os que ainda não existem (chave lógica materia_id+ordem),
  //    preservando status de quem já estudou.
  const existentes = await fetchAll<{ materia_id: string; ordem: number }>((f, t) =>
    supabase.from("topicos").select("materia_id, ordem").range(f, t)
  );
  const jaTem = new Set(existentes.map((t) => `${t.materia_id}:${t.ordem}`));
  const novosTopicos = SEED_MATERIAS.flatMap((m) =>
    m.topicos
      .map((titulo, ordem) => ({ materia_id: matId.get(m.slug)!, titulo, ordem }))
      .filter((t) => !jaTem.has(`${t.materia_id}:${t.ordem}`))
  );
  if (novosTopicos.length > 0) {
    const { error } = await supabase.from("topicos").insert(novosTopicos);
    if (error) throw error;
  }

  // 3. Concursos (upsert por user_id+slug)
  const { data: concs, error: eConc } = await supabase
    .from("concursos")
    .upsert(
      SEED_CONCURSOS.map((c) => ({
        slug: c.slug,
        nome: c.nome,
        nome_curto: c.nomeCurto,
        orgao: c.orgao,
        banca: c.banca,
        status: c.status,
        icone: c.icone,
        cor: c.cor,
        data_prova: c.dataProva,
        nota_data: c.notaData,
        duracao_prova: c.duracaoProva,
        estrutura: c.estrutura as never,
        ordem: c.ordem,
      })),
      { onConflict: "user_id,slug" }
    )
    .select("id, slug, nome, data_prova");
  if (eConc) throw eConc;
  const concId = new Map(concs.map((c) => [c.slug, c.id]));

  // 4. Vínculos concurso ↔ matéria
  const vinculos = SEED_CONCURSOS.flatMap((c) =>
    c.materias.map((cm) => ({
      concurso_id: concId.get(c.slug)!,
      materia_id: matId.get(cm.materiaSlug)!,
      area: cm.area,
      peso_questoes: cm.peso,
      ordem: cm.ordem,
    }))
  );
  const { error: eVinc } = await supabase
    .from("concurso_materias")
    .upsert(vinculos, { onConflict: "concurso_id,materia_id" });
  if (eVinc) throw eVinc;

  // 5. Evento de prova para cada concurso com data (se ainda não houver)
  const { data: eventosProva, error: eEv } = await supabase
    .from("eventos")
    .select("concurso_id")
    .eq("tipo", "prova");
  if (eEv) throw eEv;
  const temProva = new Set((eventosProva ?? []).map((e) => e.concurso_id));
  const novosEventos = concs
    .filter((c) => c.data_prova && !temProva.has(c.id))
    .map((c) => ({
      concurso_id: c.id,
      titulo: `Prova — ${c.nome}`,
      tipo: "prova",
      data: c.data_prova!,
    }));
  if (novosEventos.length > 0) {
    const { error } = await supabase.from("eventos").insert(novosEventos);
    if (error) throw error;
  }

  // 6. Ferramentas default (só se a caixa estiver vazia)
  const { count, error: eFer } = await supabase
    .from("ferramentas")
    .select("id", { count: "exact", head: true });
  if (eFer) throw eFer;
  if ((count ?? 0) === 0) {
    const { error } = await supabase.from("ferramentas").insert(SEED_FERRAMENTAS);
    if (error) throw error;
  }

  return {
    materias: mats.length,
    topicosNovos: novosTopicos.length,
    concursos: concs.length,
  };
}
