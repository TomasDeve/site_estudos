-- Índices para os padrões de acesso do app
create index topicos_user_materia_idx on public.topicos (user_id, materia_id, ordem);
create index concurso_materias_concurso_idx on public.concurso_materias (concurso_id, ordem);
create index concurso_materias_materia_idx on public.concurso_materias (materia_id);
create index topico_links_topico_idx on public.topico_links (user_id, topico_id);
create index metas_periodo_user_idx on public.metas_periodo (user_id, data_inicio);
create index blocos_dia_user_data_idx on public.blocos_dia (user_id, data, ordem);
create index dias_concluidos_user_data_idx on public.dias_concluidos (user_id, data desc);
create index sessoes_estudo_user_data_idx on public.sessoes_estudo (user_id, data);
create index sessoes_estudo_bloco_idx on public.sessoes_estudo (bloco_id);
create index questao_logs_user_data_idx on public.questao_logs (user_id, data desc);
create index questao_logs_user_materia_idx on public.questao_logs (user_id, materia_id);
create index materia_aliases_materia_idx on public.materia_aliases (materia_id);
create index eventos_user_data_idx on public.eventos (user_id, data);
create index eventos_concurso_idx on public.eventos (concurso_id);
create index notas_user_idx on public.notas (user_id, atualizado_em desc);
create index ferramentas_user_idx on public.ferramentas (user_id, ordem);

-- FKs restantes usados em deletes em cascata
create index topicos_materia_idx on public.topicos (materia_id);
create index topico_links_topico_fk_idx on public.topico_links (topico_id);
create index blocos_dia_materia_idx on public.blocos_dia (materia_id);
create index blocos_dia_concurso_idx on public.blocos_dia (concurso_id);
create index sessoes_estudo_materia_idx on public.sessoes_estudo (materia_id);
create index sessoes_estudo_concurso_idx on public.sessoes_estudo (concurso_id);
create index questao_logs_materia_idx on public.questao_logs (materia_id);

-- RLS: dono acessa tudo, mais ninguém.
-- (select auth.uid()) em vez de auth.uid() evita reavaliação por linha (lint rls_initplan).
do $$
declare
  t text;
begin
  foreach t in array array[
    'concursos','materias','topicos','concurso_materias','topico_links',
    'metas_periodo','blocos_dia','dias_concluidos','sessoes_estudo',
    'questao_logs','materia_aliases','eventos','notas','ferramentas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;
