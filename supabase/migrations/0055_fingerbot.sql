-- 0055 — Fingerbot: horários para o cubo "apertar" sozinho.
-- O cubo (Fingerbot Tuya, só Bluetooth) é acionado por um celular dedicado (A50) com
-- MacroDroid: um link de webhook do MacroDroid acorda o celular, abre o Smart Life na
-- tela do Fingerbot e toca no interruptor. Aqui ficam os horários (hora + dias da
-- semana, fuso de Recife) e o pg_cron chama esse link na hora certa via pg_net.
-- Também há o "Apertar agora" (RPC) e o histórico dos disparos. Idempotente.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------- horários
create table if not exists public.fingerbot_horarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- hora local (America/Recife), sempre no minuto cheio
  hora time not null check (extract(second from hora) = 0),
  -- dias da semana: 0 = domingo … 6 = sábado (mesmo do extract(dow))
  dias smallint[] not null default '{0,1,2,3,4,5,6}'
    check (dias <@ '{0,1,2,3,4,5,6}'::smallint[] and cardinality(dias) > 0),
  ativo boolean not null default true,
  rotulo text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists fingerbot_horarios_tick_idx
  on public.fingerbot_horarios (hora) where ativo;

alter table public.fingerbot_horarios enable row level security;
drop policy if exists owner_all on public.fingerbot_horarios;
create policy owner_all on public.fingerbot_horarios
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- config (link do webhook)
create table if not exists public.fingerbot_config (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  webhook_url text not null check (webhook_url ~ '^https://trigger\.macrodroid\.com/'),
  updated_at timestamptz not null default now()
);

alter table public.fingerbot_config enable row level security;
drop policy if exists owner_all on public.fingerbot_config;
create policy owner_all on public.fingerbot_config
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- histórico de disparos
create table if not exists public.fingerbot_disparos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  horario_id uuid references public.fingerbot_horarios(id) on delete set null,
  origem text not null check (origem in ('agenda', 'manual')),
  -- id do pedido no pg_net (net._http_response guarda o resultado por algumas horas)
  request_id bigint,
  criado_em timestamptz not null default now()
);

create index if not exists fingerbot_disparos_user_idx
  on public.fingerbot_disparos (user_id, criado_em desc);

alter table public.fingerbot_disparos enable row level security;
drop policy if exists owner_select on public.fingerbot_disparos;
create policy owner_select on public.fingerbot_disparos
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- chamar o webhook
-- Interna: só o agendador e o "Apertar agora" usam.
create or replace function public.fingerbot_chamar(p_user uuid, p_origem text, p_horario uuid)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_req bigint;
begin
  select webhook_url into v_url from public.fingerbot_config where user_id = p_user;
  if v_url is null then
    raise exception 'Link do webhook do MacroDroid não configurado';
  end if;
  v_req := net.http_get(url := v_url, timeout_milliseconds := 15000);
  insert into public.fingerbot_disparos (user_id, horario_id, origem, request_id)
  values (p_user, p_horario, p_origem, v_req);
  return v_req;
end;
$$;

revoke all on function public.fingerbot_chamar(uuid, text, uuid) from public, anon, authenticated;

-- "Apertar agora" do site. Trava de 40 s para não disparar duas vezes seguidas
-- (cada disparo leva ~30 s no celular, e o MacroDroid bloqueia excesso de pedidos).
create or replace function public.fingerbot_apertar_agora()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  if exists (
    select 1 from public.fingerbot_disparos
    where user_id = v_user and criado_em > now() - interval '40 seconds'
  ) then
    raise exception 'Já disparou há menos de 40 segundos. Espere o cubo terminar.';
  end if;
  return public.fingerbot_chamar(v_user, 'manual', null);
end;
$$;

revoke all on function public.fingerbot_apertar_agora() from public, anon;
grant execute on function public.fingerbot_apertar_agora() to authenticated;

-- Últimos disparos com o resultado HTTP (quando o pg_net ainda guarda a resposta).
create or replace function public.fingerbot_ultimos_disparos(p_limite int default 15)
returns table (
  id bigint,
  origem text,
  horario_id uuid,
  criado_em timestamptz,
  status_code int,
  erro text
)
language sql
security definer
set search_path = public, extensions
as $$
  select d.id, d.origem, d.horario_id, d.criado_em, r.status_code, r.error_msg
  from public.fingerbot_disparos d
  left join net._http_response r on r.id = d.request_id
  where d.user_id = auth.uid()
  order by d.criado_em desc
  limit least(greatest(p_limite, 1), 50);
$$;

revoke all on function public.fingerbot_ultimos_disparos(int) from public, anon;
grant execute on function public.fingerbot_ultimos_disparos(int) to authenticated;

-- ---------------------------------------------------------------- agendador (pg_cron, a cada minuto)
create or replace function public.fingerbot_tick()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_local timestamp := now() at time zone 'America/Recife';
  v_min time := date_trunc('minute', v_local)::time;
  v_dow smallint := extract(dow from v_local)::smallint;
  h record;
begin
  for h in
    select fh.id, fh.user_id
    from public.fingerbot_horarios fh
    where fh.ativo
      and fh.hora = v_min
      and v_dow = any (fh.dias)
      and not exists (
        select 1 from public.fingerbot_disparos d
        where d.horario_id = fh.id and d.criado_em > now() - interval '90 seconds'
      )
  loop
    begin
      perform public.fingerbot_chamar(h.user_id, 'agenda', h.id);
    exception when others then
      raise warning 'fingerbot_tick: horario % falhou: %', h.id, sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.fingerbot_tick() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'fingerbot-tick') then
    perform cron.unschedule('fingerbot-tick');
  end if;
  perform cron.schedule('fingerbot-tick', '* * * * *', 'select public.fingerbot_tick()');
end;
$$;
