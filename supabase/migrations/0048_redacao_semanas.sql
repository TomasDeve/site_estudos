-- 0048 — Tema da semana da Redação (/redacao). Uma linha por semana: o tema escolhido
-- entre as 15 propostas (src/features/paragrafos/semanas.ts), estudado de segunda a sexta
-- (30 min por dia, um parágrafo por dia no site) e escrito inteiro no domingo.
--   semana    a segunda-feira da semana (antes das 6h ainda conta o dia anterior);
--   tema_id   id do tema no temas.json (ex.: 'b05a', 'e5');
--   feitos    dias marcados à mão ('seg' = estudou o tema, 'dom' = escreveu a redação);
--             os dias de parágrafo (ter–sex) saem de redacao_paragrafos.
-- Idempotente.

create table if not exists public.redacao_semanas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  semana date not null,
  tema_id text not null,
  feitos text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, semana)
);

alter table public.redacao_semanas enable row level security;
drop policy if exists owner_all on public.redacao_semanas;
create policy owner_all on public.redacao_semanas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
