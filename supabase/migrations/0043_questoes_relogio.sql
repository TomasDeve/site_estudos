-- 0043 — Relógio da página de questões no banco, pra ser O MESMO no PC e no celular
-- (antes ficava no localStorage de cada aparelho). Uma linha por usuário.
--   base_ms     tempo já contado antes da corrida atual (ms).
--   inicio_ms   quando a corrida atual começou (epoch ms, relógio do SERVIDOR); nulo = parado.
--   pausa_auto  parado porque você saiu do site/da página (não pelo botão) → o
--               primeiro aparelho que voltar retoma sozinho.
-- Toda mudança passa pela função relogio_questoes(acao), que usa o horário do
-- servidor — assim o relógio desajustado de um aparelho não soma nem tira tempo.
-- A tabela entra no Realtime: o outro aparelho atualiza na hora.
-- Idempotente.

create table if not exists public.questoes_relogio (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  base_ms bigint not null default 0 check (base_ms >= 0),
  inicio_ms bigint,
  pausa_auto boolean not null default false,
  atualizado_em timestamptz not null default now()
);

alter table public.questoes_relogio enable row level security;
drop policy if exists owner_all on public.questoes_relogio;
create policy owner_all on public.questoes_relogio
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- acao: 'ler' | 'iniciar' | 'pausar' | 'pausa_auto' | 'retomar_auto' | 'zerar'.
-- Devolve o estado + o horário do servidor (agora_ms), pro app acertar a diferença
-- entre o relógio dele e o do servidor.
create or replace function public.relogio_questoes(acao text default 'ler')
returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  agora bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  r public.questoes_relogio;
  corrido bigint;
begin
  if uid is null then
    raise exception 'relogio_questoes: sem login';
  end if;

  insert into public.questoes_relogio (user_id) values (uid) on conflict (user_id) do nothing;
  select * into r from public.questoes_relogio where user_id = uid for update;
  corrido := r.base_ms + case when r.inicio_ms is null then 0 else greatest(agora - r.inicio_ms, 0) end;

  if acao = 'ler' then
    null;
  elsif acao = 'iniciar' then
    if r.inicio_ms is null then
      update public.questoes_relogio set inicio_ms = agora, pausa_auto = false, atualizado_em = now()
        where user_id = uid returning * into r;
    end if;
  elsif acao = 'pausar' then
    if r.inicio_ms is not null or r.pausa_auto then
      update public.questoes_relogio set base_ms = corrido, inicio_ms = null, pausa_auto = false, atualizado_em = now()
        where user_id = uid returning * into r;
    end if;
  elsif acao = 'pausa_auto' then
    if r.inicio_ms is not null then
      update public.questoes_relogio set base_ms = corrido, inicio_ms = null, pausa_auto = true, atualizado_em = now()
        where user_id = uid returning * into r;
    end if;
  elsif acao = 'retomar_auto' then
    if r.inicio_ms is null and r.pausa_auto then
      update public.questoes_relogio set inicio_ms = agora, pausa_auto = false, atualizado_em = now()
        where user_id = uid returning * into r;
    end if;
  elsif acao = 'zerar' then
    update public.questoes_relogio set base_ms = 0, inicio_ms = null, pausa_auto = false, atualizado_em = now()
      where user_id = uid returning * into r;
  else
    raise exception 'relogio_questoes: acao invalida %', acao;
  end if;

  return json_build_object(
    'base_ms', r.base_ms,
    'inicio_ms', r.inicio_ms,
    'pausa_auto', r.pausa_auto,
    'agora_ms', agora
  );
end;
$$;

revoke all on function public.relogio_questoes(text) from public, anon;
grant execute on function public.relogio_questoes(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'questoes_relogio'
  ) then
    alter publication supabase_realtime add table public.questoes_relogio;
  end if;
end $$;
