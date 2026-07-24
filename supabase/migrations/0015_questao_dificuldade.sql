-- Substitui o balde "reforço com IA" das questões pelo sistema de dificuldade
-- percebida. A dificuldade é uma propriedade independente do status
-- (ativa/arquivada): ao responder, o aluno marca fácil/médio/difícil. As
-- questões que estavam marcadas para reforço viram "difícil" — é onde ele
-- quer focar os estudos.

-- Coluna nova, independente de status. null = ainda não avaliada.
alter table public.topico_questoes
  add column dificuldade text check (dificuldade in ('facil','medio','dificil'));

-- Backfill: o que estava em reforço passa a ser difícil...
update public.topico_questoes set dificuldade = 'dificil' where status = 'reforco';

-- ...e volta ao status ativo, já que "reforço" deixa de existir como destino.
update public.topico_questoes set status = 'ativa' where status = 'reforco';

-- Remove o valor 'reforco' do domínio de status.
alter table public.topico_questoes drop constraint topico_questoes_status_check;
alter table public.topico_questoes
  add constraint topico_questoes_status_check check (status in ('ativa','arquivada'));
