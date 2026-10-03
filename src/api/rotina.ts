import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import type { RotinaBloco, TablesInsert } from "@/types/db";
import { diffRotina } from "@/features/rotina/rotinaModelo";

const CHAVE = ["rotina_blocos"] as const;

/** Todos os blocos da rotina (são poucos — dezenas, no máximo). */
export async function buscarRotina(): Promise<RotinaBloco[]> {
  const { data, error } = await supabase
    .from("rotina_blocos")
    .select("*")
    .order("inicio")
    .order("created_at");
  if (error) throw error;
  return data;
}

export function useRotina() {
  return useQuery({ queryKey: CHAVE, queryFn: buscarRotina });
}

export type BlocoNovo = Pick<TablesInsert<"rotina_blocos">, "titulo" | "tipo" | "inicio" | "fim" | "dias">;

/**
 * Cria (sem `id`) ou atualiza (com `id`) um bloco. Otimista: a linha do tempo
 * muda na hora; o refetch no fim só confirma.
 */
export function useSalvarBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: BlocoNovo & { id?: string }) => {
      if (b.id) {
        const { id, ...resto } = b;
        const { error } = await supabase.from("rotina_blocos").update(resto).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rotina_blocos").insert(b);
        if (error) throw error;
      }
    },
    onMutate: async (b) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<RotinaBloco[]>(CHAVE);
      qc.setQueryData<RotinaBloco[]>(CHAVE, (old = []) =>
        b.id
          ? old.map((x) => (x.id === b.id ? { ...x, ...b, id: x.id } : x))
          : [
              ...old,
              {
                id: `tmp-${Date.now()}`,
                user_id: "",
                created_at: new Date().toISOString(),
                titulo: b.titulo ?? "",
                tipo: b.tipo ?? "outro",
                inicio: b.inicio,
                fim: b.fim,
                dias: b.dias ?? [],
              },
            ]
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rotina_blocos").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<RotinaBloco[]>(CHAVE);
      qc.setQueryData<RotinaBloco[]>(CHAVE, (old = []) => old.filter((x) => x.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Cria vários blocos de uma vez (o "Montar com um modelo"). */
export function useCriarBlocos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blocos: BlocoNovo[]) => {
      const { error } = await supabase.from("rotina_blocos").insert(blocos);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Bloco como vai e volta da IA: `ref` aponta o bloco de onde ele veio (null = novo). */
export interface BlocoIA {
  ref: string | null;
  tipo: string;
  titulo: string;
  inicio: number;
  fim: number;
}

export interface RespostaRotinaIA {
  resumo: string;
  mudancas: string[];
  blocos: BlocoIA[];
}

/**
 * Pede à IA do site (Edge Function `organizar-rotina`) a rotina reorganizada
 * conforme o pedido. Não grava nada — só devolve a proposta para a prévia.
 */
export async function pedirRotinaIA(
  body: { pedido: string; rotina: (BlocoIA & { ref: string })[]; anteriores: string[] },
  signal?: AbortSignal
): Promise<RespostaRotinaIA> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada — entre de novo no site.");

  const res = await fetch(`${supabaseUrl}/functions/v1/organizar-rotina`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as (RespostaRotinaIA & { erro?: string }) | null;
  if (!res.ok || !json || !Array.isArray(json.blocos)) {
    if (res.status === 404) throw new Error("A IA da rotina ainda não foi publicada no Supabase (função organizar-rotina).");
    throw new Error(json?.erro || `A IA não respondeu (HTTP ${res.status}).`);
  }
  return json;
}

/**
 * Troca a rotina inteira pela `nova` de uma vez (a proposta da IA, ou a anterior
 * no "Desfazer"). Grava só a diferença: insere, atualiza o que mudou e por último
 * apaga o que saiu — se algo falhar no meio, nada some. Otimista.
 */
export function useAplicarRotina() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ atual, nova }: { atual: RotinaBloco[]; nova: (BlocoNovo & { id?: string })[] }) => {
      const { inserir, atualizar, excluir } = diffRotina(atual, nova);
      if (inserir.length) {
        const { error } = await supabase.from("rotina_blocos").insert(inserir);
        if (error) throw error;
      }
      const res = await Promise.all(
        atualizar.map(({ id, ...resto }) => supabase.from("rotina_blocos").update(resto).eq("id", id))
      );
      const falha = res.find((r) => r.error);
      if (falha?.error) throw falha.error;
      if (excluir.length) {
        const { error } = await supabase.from("rotina_blocos").delete().in("id", excluir);
        if (error) throw error;
      }
    },
    onMutate: async ({ atual, nova }) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<RotinaBloco[]>(CHAVE);
      const porId = new Map(atual.map((b) => [b.id, b]));
      const usados = new Set<string>();
      qc.setQueryData<RotinaBloco[]>(
        CHAVE,
        nova.map((b, i) => {
          // Como no diffRotina: id repetido só vale uma vez.
          const antigo = b.id && !usados.has(b.id) ? porId.get(b.id) : undefined;
          if (antigo) usados.add(antigo.id);
          return {
            id: antigo?.id ?? `tmp-${Date.now()}-${i}`,
            user_id: antigo?.user_id ?? "",
            created_at: antigo?.created_at ?? new Date().toISOString(),
            titulo: b.titulo ?? "",
            tipo: b.tipo ?? "outro",
            inicio: b.inicio,
            fim: b.fim,
            dias: b.dias ?? [],
          };
        })
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
