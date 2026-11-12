-- 0049 — Redação completa no mesmo histórico dos parágrafos (/redacao). Opcional no tema
-- da semana: ele escreve a redação inteira (ou só os parágrafos que marcar) e a IA corrige
-- como a banca. A linha leva tipo 'redacao', aspecto null, conceito null, e a nota e a
-- nota de conteúdo na escala 30 (proporcional quando escreveu só alguns parágrafos); os
-- parágrafos escritos ficam em correcao->'partes'.
-- Idempotente.

alter table public.redacao_paragrafos drop constraint if exists redacao_paragrafos_tipo_check;
alter table public.redacao_paragrafos
  add constraint redacao_paragrafos_tipo_check
  check (tipo in ('introducao', 'desenvolvimento', 'conclusao', 'redacao'));
