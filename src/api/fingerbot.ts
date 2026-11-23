import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FingerbotHorario, TablesInsert, TablesUpdate } from "@/types/db";

const CHAVE = ["fingerbot", "horarios"];
const CHAVE_DISPAROS = ["fingerbot", "disparos"];
const CHAVE_CONFIG = ["fingerbot", "config"];

/** Horários do cubo, do mais cedo para o mais tarde. */
export function useFingerbotHorarios() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async (): Promise<FingerbotHorario[]> => {
      const { data, error } = await supabase
        .from("fingerbot_horarios")
        .select("*")
        .order("hora")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarFingerbotHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"fingerbot_horarios">) => {
      const { error } = await supabase.from("fingerbot_horarios").insert(input);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Atualiza um horário (hora, dias, ligado/desligado, rótulo); remenda o cache na hora. */
export function useAtualizarFingerbotHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"fingerbot_horarios">) => {
      const { error } = await supabase.from("fingerbot_horarios").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<FingerbotHorario[]>(CHAVE);
      qc.setQueryData<FingerbotHorario[]>(CHAVE, (old) => old?.map((h) => (h.id === id ? { ...h, ...patch } : h)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirFingerbotHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fingerbot_horarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Se o link do webhook do MacroDroid já está salvo (o link em si não aparece na tela). */
export function useFingerbotConfigurado() {
  return useQuery({
    queryKey: CHAVE_CONFIG,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.from("fingerbot_config").select("user_id").maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

/** Troca o link do webhook (quando o MacroDroid gerar outro). */
export function useSalvarFingerbotWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (webhook_url: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("fingerbot_config")
        .upsert({ user_id: u.user?.id, webhook_url, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE_CONFIG }),
  });
}

export interface FingerbotDisparo {
  id: number;
  origem: string;
  horario_id: string | null;
  criado_em: string;
  status_code: number | null;
  erro: string | null;
}

/** Últimos disparos (agenda e manual) com o resultado do pedido ao MacroDroid. */
export function useFingerbotDisparos() {
  return useQuery({
    queryKey: CHAVE_DISPAROS,
    queryFn: async (): Promise<FingerbotDisparo[]> => {
      const { data, error } = await supabase.rpc("fingerbot_ultimos_disparos", { p_limite: 15 });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

/** "Apertar agora": chama o webhook na hora (o banco trava repetição em menos de 40 s). */
export function useApertarAgora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fingerbot_apertar_agora");
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CHAVE_DISPAROS });
      // o pg_net grava a resposta alguns segundos depois
      setTimeout(() => qc.invalidateQueries({ queryKey: CHAVE_DISPAROS }), 5000);
    },
  });
}
