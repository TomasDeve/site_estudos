-- "Textos em áudio": fila de vídeos do YouTube (leis narradas, aulas em áudio)
-- que o usuário vai rotacionando — ouve um, marca como ouvido e passa pro próximo.
-- Tabela global (como ferramentas/notas), não presa a concurso nem a assunto.

create table public.audios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null default '',
  url text not null,
  ordem int not null default 0,
  ouvido boolean not null default false,     -- já ouvido nesta rotação?
  ouvido_em timestamptz,                      -- quando foi marcado como ouvido
  vezes int not null default 0,               -- quantas vezes já ouviu este áudio
  created_at timestamptz not null default now()
);

create index audios_user_idx on public.audios (user_id, ordem);

alter table public.audios enable row level security;
create policy owner_all on public.audios
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
