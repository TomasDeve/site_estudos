-- Impressão digital do "Texto associado": a página de questões misturadas baixa só um
-- índice leve das questões (sem enunciado/comentário/texto) e usa este hash para manter
-- juntas as questões do mesmo texto — sem trazer os ~750 KB de textos de uma vez.
alter table public.topico_questoes
  add column if not exists texto_associado_hash text
  generated always as (md5(nullif(texto_associado, ''))) stored;
