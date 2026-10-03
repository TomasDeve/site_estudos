-- 0041 — Filtro padrão da página de questões (todas as matérias misturadas).
-- Ao abrir a página, ela já vem com este filtro: matérias/assuntos, formato,
-- bancas e origens — ex.: tirar RLM e Estatística pra treinar questões rápidas.
-- Por concurso (as matérias variam com o edital) e no banco, pra valer igual no
-- PC e no celular. Nulo = abre sem filtro.
-- Formato: { "filtro": [{ "materiaId", "assuntos": [] }], "formato": "todos"|"ce"|"multipla",
--            "bancas": [], "cats": [] }
alter table public.concursos
  add column if not exists questoes_filtro_padrao jsonb;
