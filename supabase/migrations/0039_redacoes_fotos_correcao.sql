-- Redações: fotos da folha manuscrita + correção (feita fora, com IA) + nota pela
-- fórmula do Cebraspe (NPD = NC − 6 × NE ÷ TL).
--   fotos         caminhos no bucket redacao-fotos ({user_id}/{redacao_id}/{uuid}.jpg)
--   correcao      texto da correção colado da IA
--   nota_conteudo NC — domínio do conteúdo (apresentação, estrutura, desenvolvimento)
--   erros         NE — erros de grafia, morfossintaxe e propriedade vocabular
--   linhas        TL — linhas efetivamente escritas
-- `nota` continua sendo a nota final (calculada pela fórmula quando NC/NE/TL vêm preenchidos).

alter table public.redacoes add column if not exists fotos text[] not null default '{}';
alter table public.redacoes add column if not exists correcao text not null default '';
alter table public.redacoes add column if not exists nota_conteudo numeric;
alter table public.redacoes add column if not exists erros integer;
alter table public.redacoes add column if not exists linhas integer;

-- Bucket público como o dos PDFs: a URL leva user_id + uuid (não adivinhável).
-- Só o dono envia/remove (RLS abaixo).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'redacao-fotos', 'redacao-fotos', true, 15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Caminho: {user_id}/{redacao_id}/{uuid}.ext → foldername[1] = dono.
drop policy if exists redacao_fotos_insert on storage.objects;
create policy redacao_fotos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'redacao-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists redacao_fotos_update on storage.objects;
create policy redacao_fotos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'redacao-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists redacao_fotos_delete on storage.objects;
create policy redacao_fotos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'redacao-fotos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
