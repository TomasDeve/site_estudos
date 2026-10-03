-- 0042 — Rotina (seção "Rotina"): os blocos fixos do dia — sono, estudo, intervalos,
-- academia, refeições… Cada bloco vale nos dias da semana marcados. Pessoal (não é
-- por concurso) e no banco, pra ser a mesma no PC e no celular.
--   inicio/fim  minutos desde 00:00 (0–1439). fim <= inicio = passa da meia-noite
--               (ex.: sono 22:30 → 06:00 = inicio 1350, fim 360).
--   dias        dias da semana em que vale, 0 = domingo … 6 = sábado (como o JS).
--               Hoje a rotina é uma só (a mesma todo dia): a tela grava os 7 dias.
-- Idempotente.

create table if not exists public.rotina_blocos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null default '',
  tipo text not null default 'outro'
    check (tipo in ('sono', 'estudo', 'intervalo', 'academia', 'refeicao', 'trabalho', 'lazer', 'outro')),
  inicio smallint not null check (inicio between 0 and 1439),
  fim smallint not null check (fim between 0 and 1439),
  dias smallint[] not null default '{0,1,2,3,4,5,6}',
  created_at timestamptz not null default now(),
  check (inicio <> fim)
);

create index if not exists rotina_blocos_user_idx on public.rotina_blocos (user_id);

alter table public.rotina_blocos enable row level security;
drop policy if exists owner_all on public.rotina_blocos;
create policy owner_all on public.rotina_blocos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
