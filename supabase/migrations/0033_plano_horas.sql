-- 0033 — Plano dos próximos 6 dias, hora a hora (seção Metas).
-- Cada dia do calendário tem até 5 "linhas" (uma por hora de estudo, como uma
-- linha do Excel); em cada uma o usuário escolhe a matéria e a atividade
-- (teoria, questões, revisão/Anki, lei seca, simulado) e pode marcar como feita.
-- Uma linha só existe quando a hora está preenchida: hora livre = sem linha.
-- No banco (e não no localStorage) pra o plano ser o mesmo no PC e no celular.
-- Idempotente. Rode no Supabase → SQL Editor.

create table if not exists public.plano_horas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  hora smallint not null check (hora between 1 and 5),        -- 1ª a 5ª hora do dia
  materia_id uuid references public.materias(id) on delete set null,
  atividade text not null default 'teoria'
    check (atividade in ('teoria', 'questoes', 'revisao', 'lei_seca', 'simulado')),
  nota text not null default '',                              -- detalhe opcional (ex.: o assunto)
  feita boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, data, hora)
);

create index if not exists plano_horas_user_data_idx on public.plano_horas (user_id, data);

alter table public.plano_horas enable row level security;
drop policy if exists owner_all on public.plano_horas;
create policy owner_all on public.plano_horas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
