-- Upload de arquivos PDF nos assuntos (além dos links por URL).
-- O arquivo vira um topico_link com tipo 'pdf'; arquivo_path guarda o caminho
-- no Storage para conseguir remover o arquivo quando o link é excluído.

alter table public.topico_links add column if not exists arquivo_path text;

-- Bucket público: a URL contém user_id + uuid (não adivinhável), então o chip
-- continua abrindo direto pelo href. Só o dono envia/remove (RLS abaixo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('topico-pdfs', 'topico-pdfs', true, 52428800, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Caminho: {user_id}/{topico_id}/{uuid}.pdf → foldername[1] = dono.
drop policy if exists topico_pdfs_insert on storage.objects;
create policy topico_pdfs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'topico-pdfs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists topico_pdfs_update on storage.objects;
create policy topico_pdfs_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'topico-pdfs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists topico_pdfs_delete on storage.objects;
create policy topico_pdfs_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'topico-pdfs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
