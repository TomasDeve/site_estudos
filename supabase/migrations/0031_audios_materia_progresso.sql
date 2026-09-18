-- Áudios agora podem ser divididos por matéria e guardam onde a reprodução parou
-- (para a barra de progresso e o "retomar de onde parei").

alter table public.audios
  add column materia_id uuid references public.materias(id) on delete set null,
  add column posicao_seg int not null default 0,   -- onde parei (segundos)
  add column duracao_seg int not null default 0;    -- duração total (segundos)

create index audios_materia_idx on public.audios (user_id, materia_id, ordem);

-- Ordem e estado (aberto/fechado) das seções por matéria na tela de áudios.
-- materia_id nulo = seção "Sem matéria".
create table public.audio_grupos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  materia_id uuid references public.materias(id) on delete cascade,
  ordem int not null default 0,
  aberto boolean not null default true,
  created_at timestamptz not null default now()
);

-- Um único grupo por matéria (e um único "Sem matéria") por usuário.
create unique index audio_grupos_user_materia_idx
  on public.audio_grupos (user_id, coalesce(materia_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.audio_grupos enable row level security;
create policy owner_all on public.audio_grupos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
