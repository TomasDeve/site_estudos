-- 0035 — O plano de blocos de 30 min alimenta o tempo de estudo do site.
-- Marcar um bloco do plano como feito cria uma sessão de estudo de 30 min
-- (soma no "Estudo hoje" e no gráfico "Tempo de estudo"); desmarcar, liberar o
-- bloco ou limpar o dia tira a sessão. Quem mantém isso é o próprio banco (um
-- trigger), não a tela: não há como um clique duplo deixar bloco feito sem tempo
-- contado, nem tempo contado sem bloco feito. Trocar a matéria ou o dia de um
-- bloco feito leva a sessão junto.
-- Idempotente. Rode no Supabase → SQL Editor.

-- Liga a sessão ao bloco do plano (no máximo 1 sessão por bloco). Apagar o bloco
-- apaga a sessão.
alter table public.sessoes_estudo
  add column if not exists plano_id uuid references public.plano_horas(id) on delete cascade;
create unique index if not exists sessoes_estudo_plano_id_key
  on public.sessoes_estudo (plano_id);

create or replace function public.plano_horas_sincroniza_sessao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.feita then
    insert into public.sessoes_estudo (user_id, data, minutos, materia_id, origem, plano_id)
    values (new.user_id, new.data, 30, new.materia_id, 'bloco', new.id)
    on conflict (plano_id) do update
      set data = excluded.data,
          minutos = excluded.minutos,
          materia_id = excluded.materia_id;
  else
    delete from public.sessoes_estudo where plano_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists plano_horas_sessao on public.plano_horas;
create trigger plano_horas_sessao
  after insert or update of feita, data, materia_id on public.plano_horas
  for each row execute function public.plano_horas_sincroniza_sessao();

-- Blocos que já estavam marcados como feitos antes desta migração passam a contar.
insert into public.sessoes_estudo (user_id, data, minutos, materia_id, origem, plano_id)
select user_id, data, 30, materia_id, 'bloco', id
from public.plano_horas
where feita
on conflict (plano_id) do nothing;
