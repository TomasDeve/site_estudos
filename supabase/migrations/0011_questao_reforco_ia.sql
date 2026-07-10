-- O bucket "revisar" das questões passa a significar "reforço com IA": um conjunto
-- que o aluno separa para, mais tarde, pedir novas questões de reforço a partir dele.
-- Renomeia o valor do status para refletir esse novo sentido.

alter table public.topico_questoes drop constraint topico_questoes_status_check;

update public.topico_questoes set status = 'reforco' where status = 'revisar';

alter table public.topico_questoes
  add constraint topico_questoes_status_check check (status in ('ativa','reforco','arquivada'));
