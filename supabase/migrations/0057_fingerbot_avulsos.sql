-- 0057 — Fingerbot: apertos AVULSOS (uma vez só) e aviso imediato ao celular.
-- Uso: "Testar em 1 minuto" (para testar com a internet do celular desligada) e
-- "Agendar daqui X h Y min" (ex.: desligar o disjuntor da caixa).
-- Ao criar/cancelar, o banco chama o webhook do MacroDroid com ?acao=sincronizar e o app
-- do celular baixa a agenda na hora (sem esperar os 30 min). O app agenda um despertador
-- exato e aperta mesmo sem internet; ao apertar, marca o avulso como feito.
-- Se o celular estiver sumido (> 2 h sem sincronizar), o agendador do banco aperta pelo webhook.
-- Idempotente.

create table if not exists public.fingerbot_avulsos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  quando timestamptz not null,
  rotulo text not null default '',
  cancelado boolean not null default false,
  feito_em timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists fingerbot_avulsos_user_idx on public.fingerbot_avulsos (user_id, quando);

alter table public.fingerbot_avulsos enable row level security;
drop policy if exists owner_select on public.fingerbot_avulsos;
create policy owner_select on public.fingerbot_avulsos
  for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.fingerbot_disparos
  add column if not exists avulso_id uuid references public.fingerbot_avulsos(id) on delete set null;

-- ---------------------------------------------------------------- avisar o celular (sincronizar agora)
create or replace function public.fingerbot_avisar_celular(p_user uuid)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
begin
  select webhook_url into v_url from public.fingerbot_config where user_id = p_user;
  if v_url is null then
    return null;
  end if;
  v_url := v_url || case when position('?' in v_url) > 0 then '&' else '?' end
           || 'acao=sincronizar&t=' || extract(epoch from now())::bigint;
  return net.http_get(url := v_url, timeout_milliseconds := 15000);
end;
$$;

revoke all on function public.fingerbot_avisar_celular(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- criar / cancelar avulso (site)
create or replace function public.fingerbot_agendar_avulso(p_minutos int, p_rotulo text default '')
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;
  if p_minutos is null or p_minutos < 1 or p_minutos > 7 * 24 * 60 then
    raise exception 'Escolha entre 1 minuto e 7 dias';
  end if;
  if (select count(*) from public.fingerbot_avulsos
       where user_id = v_user and not cancelado and feito_em is null and quando > now()) >= 20 then
    raise exception 'Já tem 20 apertos avulsos esperando';
  end if;
  insert into public.fingerbot_avulsos (user_id, quando, rotulo)
  values (v_user, now() + make_interval(mins => p_minutos), left(coalesce(p_rotulo, ''), 80))
  returning id into v_id;
  perform public.fingerbot_avisar_celular(v_user);
  return v_id;
end;
$$;

revoke all on function public.fingerbot_agendar_avulso(int, text) from public, anon;
grant execute on function public.fingerbot_agendar_avulso(int, text) to authenticated;

create or replace function public.fingerbot_cancelar_avulso(p_id uuid)
returns void
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
  update public.fingerbot_avulsos set cancelado = true
   where id = p_id and user_id = v_user and feito_em is null;
  perform public.fingerbot_avisar_celular(v_user);
end;
$$;

revoke all on function public.fingerbot_cancelar_avulso(uuid) from public, anon;
grant execute on function public.fingerbot_cancelar_avulso(uuid) to authenticated;

-- ---------------------------------------------------------------- celular: agenda com avulsos
create or replace function public.fingerbot_celular_agenda(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'token inválido';
  end if;
  update public.fingerbot_config
     set celular_visto_em = now()
   where celular_token = p_token
  returning user_id into v_user;
  if v_user is null then
    raise exception 'token inválido';
  end if;
  return jsonb_build_object(
    'agora', extract(epoch from now())::bigint,
    'horarios', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', h.id,
               'hora', to_char(h.hora, 'HH24:MI'),
               'dias', to_jsonb(h.dias),
               'rotulo', h.rotulo)
             order by h.hora)
        from public.fingerbot_horarios h
       where h.user_id = v_user and h.ativo), '[]'::jsonb),
    'avulsos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', a.id,
               'quando', (extract(epoch from a.quando) * 1000)::bigint,
               'rotulo', a.rotulo)
             order by a.quando)
        from public.fingerbot_avulsos a
       where a.user_id = v_user and not a.cancelado and a.feito_em is null
         and a.quando > now() - interval '2 minutes'), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.fingerbot_celular_agenda(text) from public;
grant execute on function public.fingerbot_celular_agenda(text) to anon, authenticated;

-- ---------------------------------------------------------------- celular: registrar (com avulso)
drop function if exists public.fingerbot_celular_registrar(text, boolean, int, uuid, text, timestamptz);
create or replace function public.fingerbot_celular_registrar(
  p_token text,
  p_ok boolean,
  p_bateria int default null,
  p_horario uuid default null,
  p_detalhe text default '',
  p_quando timestamptz default null,
  p_avulso uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_avulso uuid;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception 'token inválido';
  end if;
  update public.fingerbot_config
     set celular_visto_em = now(),
         celular_bateria = coalesce(p_bateria, celular_bateria)
   where celular_token = p_token
  returning user_id into v_user;
  if v_user is null then
    raise exception 'token inválido';
  end if;
  select id into v_avulso from public.fingerbot_avulsos where id = p_avulso and user_id = v_user;
  if v_avulso is not null and p_ok then
    update public.fingerbot_avulsos set feito_em = coalesce(feito_em, least(coalesce(p_quando, now()), now()))
     where id = v_avulso;
  end if;
  insert into public.fingerbot_disparos (user_id, horario_id, avulso_id, origem, resultado, bateria, detalhe, criado_em)
  values (
    v_user,
    (select id from public.fingerbot_horarios where id = p_horario and user_id = v_user),
    v_avulso,
    'celular',
    case when p_ok then 'apertou' else 'falhou' end,
    p_bateria,
    left(coalesce(p_detalhe, ''), 300),
    least(coalesce(p_quando, now()), now())
  );
end;
$$;

revoke all on function public.fingerbot_celular_registrar(text, boolean, int, uuid, text, timestamptz, uuid) from public;
grant execute on function public.fingerbot_celular_registrar(text, boolean, int, uuid, text, timestamptz, uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------- histórico com o rótulo do avulso
drop function if exists public.fingerbot_ultimos_disparos(int);
create function public.fingerbot_ultimos_disparos(p_limite int default 15)
returns table (
  id bigint,
  origem text,
  horario_id uuid,
  criado_em timestamptz,
  status_code int,
  erro text,
  resultado text,
  bateria int,
  detalhe text,
  avulso_rotulo text
)
language sql
security definer
set search_path = public, extensions
as $$
  select d.id, d.origem, d.horario_id, d.criado_em, r.status_code, r.error_msg,
         d.resultado, d.bateria, d.detalhe,
         case when d.avulso_id is null then null else coalesce(nullif(a.rotulo, ''), 'Avulso') end
  from public.fingerbot_disparos d
  left join net._http_response r on r.id = d.request_id
  left join public.fingerbot_avulsos a on a.id = d.avulso_id
  where d.user_id = auth.uid()
  order by d.criado_em desc
  limit least(greatest(p_limite, 1), 50);
$$;

revoke all on function public.fingerbot_ultimos_disparos(int) from public, anon;
grant execute on function public.fingerbot_ultimos_disparos(int) to authenticated;

-- ---------------------------------------------------------------- agendador: avulsos quando o celular sumiu
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
  a record;
begin
  for h in
    select fh.id, fh.user_id
    from public.fingerbot_horarios fh
    where fh.ativo
      and fh.hora = v_min
      and v_dow = any (fh.dias)
      and not exists (
        select 1 from public.fingerbot_config c
        where c.user_id = fh.user_id and c.celular_visto_em > now() - interval '2 hours'
      )
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

  -- avulsos vencidos agora, só para quem está com o celular sumido (senão o celular aperta)
  for a in
    select fa.id, fa.user_id
    from public.fingerbot_avulsos fa
    where not fa.cancelado and fa.feito_em is null
      and fa.quando <= now() and fa.quando > now() - interval '2 minutes'
      and not exists (
        select 1 from public.fingerbot_config c
        where c.user_id = fa.user_id and c.celular_visto_em > now() - interval '2 hours'
      )
  loop
    begin
      update public.fingerbot_avulsos set feito_em = now() where id = a.id;
      perform public.fingerbot_chamar(a.user_id, 'agenda', null);
      update public.fingerbot_disparos set avulso_id = a.id
       where id = (select max(id) from public.fingerbot_disparos where user_id = a.user_id);
    exception when others then
      raise warning 'fingerbot_tick: avulso % falhou: %', a.id, sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.fingerbot_tick() from public, anon, authenticated;
