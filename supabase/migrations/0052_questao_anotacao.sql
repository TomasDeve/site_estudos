-- Anotações da prova impressa (simulados): o que o aluno marcou no papel,
-- o recorte da foto da questão e a questão real que serviu de base.
-- Aparecem no cartão da questão só depois de respondida, abaixo do comentário.
alter table public.topico_questoes
  add column if not exists anotacao text,
  add column if not exists anotacao_imagem text,
  add column if not exists questao_base text;
