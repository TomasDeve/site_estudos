-- Espaço "Estudo" de cada matéria: um bloco de texto livre, no topo da página,
-- onde o aluno descreve como está estudando aquela matéria e o que fazer agora.
-- Fica na própria matéria (não no vínculo com o concurso) porque o catálogo é
-- único por usuário — matéria comum a dois concursos compartilha a anotação,
-- do mesmo jeito que já compartilha o progresso dos tópicos.

alter table public.materias
  add column estudo text not null default '',      -- HTML do editor
  add column estudo_em timestamptz;                -- última atualização da anotação
