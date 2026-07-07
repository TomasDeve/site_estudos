-- Estende o clique (+Acerto / +Erro) para registrar por ASSUNTO (tópico), além
-- de por matéria. O agrupamento diário passa a considerar também o topico_id:
--   - por assunto  -> (data, materia_id, topico_id)
--   - por matéria  -> (data, materia_id, topico_id = null)

-- 1) Índice único agora inclui o topico_id (matéria/assunto nulos = "geral").
drop index if exists public.questao_logs_clique_unico;
create unique index questao_logs_clique_unico
  on public.questao_logs (user_id, data, materia_id, topico_id)
  nulls not distinct
  where origem = 'clique';

-- 2) A função troca de assinatura (ganha p_topico); recria com 4 argumentos.
drop function if exists public.registrar_clique_questao(date, uuid, boolean);
create or replace function public.registrar_clique_questao(
  p_data date,
  p_materia uuid,
  p_topico uuid,
  p_acerto boolean
) returns public.questao_logs
language sql
as $$
  insert into public.questao_logs (data, total, acertos, materia_id, topico_id, origem)
  values (p_data, 1, case when p_acerto then 1 else 0 end, p_materia, p_topico, 'clique')
  on conflict (user_id, data, materia_id, topico_id) where origem = 'clique'
  do update set
    total   = public.questao_logs.total + 1,
    acertos = public.questao_logs.acertos + case when p_acerto then 1 else 0 end
  returning *;
$$;

grant execute on function public.registrar_clique_questao(date, uuid, uuid, boolean) to authenticated;
