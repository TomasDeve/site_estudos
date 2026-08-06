-- Observação/recado curto por assunto (ex.: "estudar apenas o básico"), fixado
-- na seção de textos do tópico. Fica no próprio tópico (como o "Estudo" da
-- matéria), então matéria comum a dois concursos compartilha a observação.

alter table public.topicos
  add column observacao text not null default '';
