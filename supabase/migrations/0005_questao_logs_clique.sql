-- Botões "+Acerto" / "+Erro": registram UMA questão por clique e somam tudo
-- num único registro por dia + matéria (origem 'clique').

-- 1) Libera a nova origem no check.
alter table public.questao_logs
  drop constraint questao_logs_origem_check;
alter table public.questao_logs
  add constraint questao_logs_origem_check
  check (origem in ('manual', 'import_qc', 'clique'));

-- 2) Garante um único registro "clique" por dia + matéria.
--    NULLS NOT DISTINCT trata a matéria nula (geral) como um valor concreto,
--    para o "on conflict" agrupar corretamente (Postgres 15+).
create unique index questao_logs_clique_unico
  on public.questao_logs (user_id, data, materia_id)
  nulls not distinct
  where origem = 'clique';

-- 3) Incremento atômico: cria o registro do dia ou soma +1 (e +acerto).
--    Evita perder cliques quando o usuário toca rápido nos botões.
create or replace function public.registrar_clique_questao(
  p_data date,
  p_materia uuid,
  p_acerto boolean
) returns public.questao_logs
language sql
as $$
  insert into public.questao_logs (data, total, acertos, materia_id, origem)
  values (p_data, 1, case when p_acerto then 1 else 0 end, p_materia, 'clique')
  on conflict (user_id, data, materia_id) where origem = 'clique'
  do update set
    total   = public.questao_logs.total + 1,
    acertos = public.questao_logs.acertos + case when p_acerto then 1 else 0 end
  returning *;
$$;

grant execute on function public.registrar_clique_questao(date, uuid, boolean) to authenticated;
