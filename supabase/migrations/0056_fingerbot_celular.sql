-- 0056 — Fingerbot: o celular aperta sozinho nos horários, mesmo sem internet.
-- O app "Fingerbot Hub" no A50 fala direto com o cubo pelo Bluetooth. Ele usa um token
-- próprio (sem login) para:
--   * baixar os horários (fingerbot_celular_agenda) a cada ~30 min e guardá-los no celular;
--   * registrar cada aperto com o resultado e a bateria do cubo (fingerbot_celular_registrar).
-- Enquanto o celular sincroniza (visto há menos de 2 h), o agendador do banco NÃO chama o
-- webhook nos horários (senão o cubo apertaria duas vezes); se o celular sumir, volta a chamar.
-- O webhook passa a levar ?t=<epoch> para o app ignorar pedidos que chegarem atrasados.
-- Idempotente.

-- ---------------------------------------------------------------- config: dados do celular
alter table public.fingerbot_config
  add column if not exists celular_token text unique,
  add column if not exists celular_visto_em timestamptz,
  add column if not exists celular_bateria int;

update public.fingerbot_config
   set celular_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
 where celular_token is null;

-- ---------------------------------------------------------------- disparos: resultado vindo do celular
alter table public.fingerbot_disparos drop constraint if exists fingerbot_disparos_origem_check;
alter table public.fingerbot_disparos add constraint fingerbot_disparos_origem_check
  check (origem in ('agenda', 'manual', 'celular'));
alter table public.fingerbot_disparos
  add column if not exists resultado text check (resultado in ('apertou', 'falhou')),
  add column if not exists bateria int,
  add column if not exists detalhe text not null default '';

-- ---------------------------------------------------------------- celular: baixar horários
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
       where h.user_id = v_user and h.ativo), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.fingerbot_celular_agenda(text) from public;
grant execute on function public.fingerbot_celular_agenda(text) to anon, authenticated;

-- ---------------------------------------------------------------- celular: registrar um aperto
create or replace function public.fingerbot_celular_registrar(
  p_token text,
  p_ok boolean,
  p_bateria int default null,
  p_horario uuid default null,
  p_detalhe text default '',
  p_quando timestamptz default null
)
returns void
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
     set celular_visto_em = now(),
         celular_bateria = coalesce(p_bateria, celular_bateria)
   where celular_token = p_token
  returning user_id into v_user;
  if v_user is null then
    raise exception 'token inválido';
  end if;
  insert into public.fingerbot_disparos (user_id, horario_id, origem, resultado, bateria, detalhe, criado_em)
  values (
    v_user,
    (select id from public.fingerbot_horarios where id = p_horario and user_id = v_user),
    'celular',
    case when p_ok then 'apertou' else 'falhou' end,
    p_bateria,
    left(coalesce(p_detalhe, ''), 300),
    least(coalesce(p_quando, now()), now())
  );
end;
$$;

revoke all on function public.fingerbot_celular_registrar(text, boolean, int, uuid, text, timestamptz) from public;
grant execute on function public.fingerbot_celular_registrar(text, boolean, int, uuid, text, timestamptz)
  to anon, authenticated;

-- ---------------------------------------------------------------- webhook com ?t=<epoch>
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
  v_url := v_url || case when position('?' in v_url) > 0 then '&' else '?' end
           || 't=' || extract(epoch from now())::bigint;
  v_req := net.http_get(url := v_url, timeout_milliseconds := 15000);
  insert into public.fingerbot_disparos (user_id, horario_id, origem, request_id)
  values (p_user, p_horario, p_origem, v_req);
  return v_req;
end;
$$;

revoke all on function public.fingerbot_chamar(uuid, text, uuid) from public, anon, authenticated;

-- "Apertar agora": a trava de 40 s olha só os pedidos do site (não os registros do celular).
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
    where user_id = v_user and origem in ('agenda', 'manual')
      and criado_em > now() - interval '40 seconds'
  ) then
    raise exception 'Já disparou há menos de 40 segundos. Espere o cubo terminar.';
  end if;
  return public.fingerbot_chamar(v_user, 'manual', null);
end;
$$;

revoke all on function public.fingerbot_apertar_agora() from public, anon;
grant execute on function public.fingerbot_apertar_agora() to authenticated;

-- ---------------------------------------------------------------- histórico com o resultado do celular
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
  detalhe text
)
language sql
security definer
set search_path = public, extensions
as $$
  select d.id, d.origem, d.horario_id, d.criado_em, r.status_code, r.error_msg,
         d.resultado, d.bateria, d.detalhe
  from public.fingerbot_disparos d
  left join net._http_response r on r.id = d.request_id
  where d.user_id = auth.uid()
  order by d.criado_em desc
  limit least(greatest(p_limite, 1), 50);
$$;

revoke all on function public.fingerbot_ultimos_disparos(int) from public, anon;
grant execute on function public.fingerbot_ultimos_disparos(int) to authenticated;

-- ---------------------------------------------------------------- agendador: pula quem tem celular ativo
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
      -- o celular guarda os horários e aperta sozinho; o banco só cobre quando ele some
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
end;
$$;

revoke all on function public.fingerbot_tick() from public, anon, authenticated;
