-- Textos de lei guardados dentro de cada assunto (tópico): o usuário organiza o
-- texto aqui e lê no app, com marca-texto, "onde parei" e contador de leituras.

create table public.topico_textos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topico_id uuid not null references public.topicos(id) on delete cascade,
  titulo text not null default 'Texto de lei',
  conteudo text not null default '',      -- HTML do editor
  leituras int not null default 0,
  marcador text,                          -- índice do bloco "onde parei"
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index topico_textos_topico_idx on public.topico_textos (user_id, topico_id, ordem);

create trigger topico_textos_moddatetime
  before update on public.topico_textos
  for each row execute function extensions.moddatetime(atualizado_em);

alter table public.topico_textos enable row level security;
create policy owner_all on public.topico_textos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
