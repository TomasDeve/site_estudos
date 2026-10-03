import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Redacao, TablesInsert } from "@/types/db";

const KEY = ["redacoes"];

/** Bucket público das fotos das redações (caminho: {user}/{redacao}/{uuid}.ext). */
export const FOTOS_BUCKET = "redacao-fotos";

export function urlFotoRedacao(path: string): string {
  return supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Foto de celular chega com 3–8 MB: reduz para no máximo 2000 px no lado maior
 * (JPEG 85%), que ainda deixa a letra legível. Se o navegador não conseguir abrir
 * a imagem (ex.: HEIC no Chrome), envia o arquivo original.
 */
async function reduzirFoto(file: File): Promise<Blob> {
  const MAX = 2000;
  try {
    const bmp = await createImageBitmap(file);
    const escala = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    if (escala === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

/** Envia as fotos de uma redação e devolve os caminhos no bucket. */
export async function enviarFotosRedacao(
  files: File[],
  userId: string,
  redacaoId: string
): Promise<string[]> {
  const caminhos: string[] = [];
  for (const file of files) {
    const blob = await reduzirFoto(file);
    const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${redacaoId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(FOTOS_BUCKET)
      .upload(path, blob, { contentType: blob.type || file.type, upsert: false });
    if (error) {
      // não deixa metade das fotos órfãs no bucket
      if (caminhos.length) await supabase.storage.from(FOTOS_BUCKET).remove(caminhos);
      throw error;
    }
    caminhos.push(path);
  }
  return caminhos;
}

/** Remove fotos do bucket (best-effort: um arquivo órfão não deve travar a tela). */
export async function removerFotosRedacao(paths: string[]) {
  if (paths.length) await supabase.storage.from(FOTOS_BUCKET).remove(paths);
}

/** Todas as redações do usuário (filtra por concurso/matéria no componente). */
export function useRedacoes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Redacao[]> => {
      const { data, error } = await supabase
        .from("redacoes")
        .select("*")
        .order("numero")
        .order("data");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarRedacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"redacoes">) => {
      const { data, error } = await supabase
        .from("redacoes")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as Redacao;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

type CamposRedacao = Partial<
  Pick<
    Redacao,
    | "tema"
    | "nota"
    | "nota_max"
    | "data"
    | "observacoes"
    | "numero"
    | "fotos"
    | "correcao"
    | "nota_conteudo"
    | "erros"
    | "linhas"
  >
>;

export function useAtualizarRedacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string } & CamposRedacao) => {
      const { error } = await supabase.from("redacoes").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useExcluirRedacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, fotos }: Pick<Redacao, "id" | "fotos">) => {
      const { error } = await supabase.from("redacoes").delete().eq("id", id);
      if (error) throw error;
      await removerFotosRedacao(fotos ?? []);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
