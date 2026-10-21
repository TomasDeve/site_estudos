import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseAnonKey, supabaseUrl } from "@/lib/supabase";
import type { Json, RedacaoParagrafo, TablesInsert } from "@/types/db";
import type { TipoParagrafo } from "@/features/paragrafos/paragrafos";

const CHAVE = ["redacao_paragrafos"] as const;

/** O que a IA devolve (edge function corrigir-paragrafo). */
export interface CorrecaoParagrafo {
  conceito: 0 | 1 | 2 | 3;
  veredito: string;
  criterios: { nome: string; pontos: number; max: number; comentario: string }[];
  acertos: string[];
  melhorar: string[];
  erros: { trecho: string; correcao: string; explicacao: string }[];
  reescrita: string;
  /** Gravado pelo site (não vem da IA): abriu o "Ver resposta" antes de corrigir. */
  consultou_repertorio?: boolean;
  /** Tokens e custo da correção (a edge function mede; a saída inclui o raciocínio da IA). */
  uso?: UsoIA;
}

export interface UsoIA {
  modelo: string;
  entrada: number;
  saida: number;
  custo_usd: number;
}

export interface PedidoCorrecao {
  tipo: TipoParagrafo;
  tema: string;
  textos: { texto: string; fonte: string }[];
  aspectos: string[];
  aspecto: number | null;
  texto: string;
  linhas: number;
  meta: [number, number];
  repertorio: string[];
}

/** Chama a Edge Function `corrigir-paragrafo` (resposta inteira em JSON, sem streaming). */
export async function corrigirParagrafo(
  pedido: PedidoCorrecao,
  signal?: AbortSignal
): Promise<CorrecaoParagrafo> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão expirada — entre de novo no site.");

  const res = await fetch(`${supabaseUrl}/functions/v1/corrigir-paragrafo`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(pedido),
  });
  if (!res.ok) {
    const detalhe = await res.text().catch(() => "");
    throw new Error(detalhe.trim() || `A IA não respondeu (HTTP ${res.status}).`);
  }
  return (await res.json()) as CorrecaoParagrafo;
}

/** Os últimos parágrafos treinados (para o histórico e para o sorteio não repetir tema). */
export function useParagrafosRecentes() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redacao_paragrafos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as RedacaoParagrafo[];
    },
  });
}

/** Tokens e custo das correções do mês (só a coluna do uso, sem baixar os textos). */
export function useGastoIAMes() {
  return useQuery({
    queryKey: [...CHAVE, "gasto-mes"],
    queryFn: async () => {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
      const { data, error } = await supabase
        .from("redacao_paragrafos")
        .select("uso:correcao->uso")
        .gte("created_at", inicioMes);
      if (error) throw error;
      const usos = (data as unknown as { uso: UsoIA | null }[]).map((d) => d.uso).filter((u): u is UsoIA => !!u);
      return {
        correcoes: usos.length,
        entrada: usos.reduce((s, u) => s + u.entrada, 0),
        saida: usos.reduce((s, u) => s + u.saida, 0),
        custo: usos.reduce((s, u) => s + u.custo_usd, 0),
      };
    },
  });
}

export function useSalvarParagrafo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      linha: Omit<TablesInsert<"redacao_paragrafos">, "correcao"> & { correcao: CorrecaoParagrafo }
    ) => {
      const { data, error } = await supabase
        .from("redacao_paragrafos")
        .insert({ ...linha, correcao: linha.correcao as unknown as Json })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirParagrafo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("redacao_paragrafos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
