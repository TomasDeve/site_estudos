import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type {
  AlternativaQC,
  NivelEscolaridade,
  QuestaoDificuldade,
  QuestaoImportada,
  QuestaoImportadaStatus,
  QuestaoTipo,
  TablesInsert,
  TablesUpdate,
} from "@/types/db";

const KEY = ["questoes_importadas"];

/** O que a Edge Function `estruturar-questao` devolve a partir do texto colado. */
export interface QuestaoExtraida {
  banca: string | null;
  ano: number | null;
  orgao: string | null;
  cargo: string | null;
  prova: string | null;
  disciplina: string | null;
  assunto: string | null;
  nivel: NivelEscolaridade | null;
  tipo: QuestaoTipo;
  contexto: string | null;
  enunciado: string;
  alternativas: AlternativaQC[];
  gabarito_letra: string | null;
  gabarito_bool: boolean | null;
  dificuldade: QuestaoDificuldade | null;
  comentario: string;
}

/** Todas as questões importadas do usuário, mais novas primeiro. */
export function useQuestoesImportadas() {
  return useQuery({
    queryKey: KEY,
    queryFn: () =>
      fetchAll<QuestaoImportada>((f, t) =>
        supabase
          .from("questoes_importadas")
          .select("*")
          .order("created_at", { ascending: false })
          .range(f, t)
      ),
  });
}

/**
 * Manda o texto cru para a Edge Function estruturar (colar → JSON). Não mexe no
 * banco: só devolve os campos pra tela mostrar e o usuário revisar antes de salvar.
 */
export function useEstruturarQuestao() {
  return useMutation({
    mutationFn: async (texto: string): Promise<QuestaoExtraida> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada — entre de novo no site.");

      const res = await fetch(`${supabaseUrl}/functions/v1/estruturar-questao`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ texto }),
      });

      const json = (await res.json().catch(() => null)) as
        | (QuestaoExtraida & { erro?: string })
        | null;
      if (!res.ok || !json) {
        throw new Error(json?.erro || `A IA não interpretou o texto (HTTP ${res.status}).`);
      }
      return json;
    },
  });
}

/** Salva uma questão revisada no banco de importadas. */
export function useSalvarQuestaoImportada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"questoes_importadas">) => {
      const { data, error } = await supabase
        .from("questoes_importadas")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Edita campos de uma questão importada (mapear tópico, nível, gabarito, etc.). */
export function useAtualizarQuestaoImportada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: TablesUpdate<"questoes_importadas">;
    }) => {
      const { error } = await supabase.from("questoes_importadas").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Muda o status de curadoria de várias questões de uma vez (aprovar/descartar em lote). */
export function useDefinirStatusQuestoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: QuestaoImportadaStatus }) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("questoes_importadas")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Apaga de vez uma questão importada. */
export function useExcluirQuestaoImportada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questoes_importadas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
