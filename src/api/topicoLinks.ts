import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import type { TablesInsert, TablesUpdate, TopicoLink } from "@/types/db";

/** Bucket público onde ficam os PDFs enviados (caminho: {user}/{topico}/{uuid}.pdf). */
export const PDF_BUCKET = "topico-pdfs";

export function useTopicoLinks() {
  return useQuery({
    queryKey: ["topico_links"],
    queryFn: () =>
      fetchAll<TopicoLink>((f, t) =>
        supabase.from("topico_links").select("*").order("created_at").range(f, t)
      ),
  });
}

export function useCriarTopicoLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"topico_links">) => {
      const { error } = await supabase.from("topico_links").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_links"] }),
  });
}

export function useAtualizarTopicoLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string } & TablesUpdate<"topico_links">) => {
      const { error } = await supabase.from("topico_links").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_links"] }),
  });
}

/**
 * Envia um arquivo PDF para o Storage e cria um link (tipo "pdf") apontando
 * para ele. O caminho começa com o user_id para casar com a RLS do bucket.
 */
export function useAnexarPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      file,
      topico_id,
      user_id,
      titulo,
    }: {
      file: File;
      topico_id: string;
      user_id: string;
      titulo?: string;
    }) => {
      const path = `${user_id}/${topico_id}/${crypto.randomUUID()}.pdf`;
      const { error: upErr } = await supabase.storage
        .from(PDF_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(path);
      const nome = titulo?.trim() || file.name.replace(/\.pdf$/i, "");
      const { error } = await supabase.from("topico_links").insert({
        topico_id,
        titulo: nome,
        url: data.publicUrl,
        tipo: "pdf",
        arquivo_path: path,
      });
      if (error) {
        // Rollback do arquivo se o insert falhar, evitando arquivo órfão.
        await supabase.storage.from(PDF_BUCKET).remove([path]);
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_links"] }),
  });
}

/** Remove do Storage os arquivos PDF de uma lista de links (best-effort). */
export async function removerArquivosPdf(links: Pick<TopicoLink, "arquivo_path">[]) {
  const paths = links.map((l) => l.arquivo_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from(PDF_BUCKET).remove(paths);
}

export function useExcluirTopicoLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, arquivo_path }: Pick<TopicoLink, "id" | "arquivo_path">) => {
      const { error } = await supabase.from("topico_links").delete().eq("id", id);
      if (error) throw error;
      // Remove o arquivo do Storage (best-effort) quando o link era um PDF enviado.
      if (arquivo_path) await supabase.storage.from(PDF_BUCKET).remove([arquivo_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topico_links"] }),
  });
}
