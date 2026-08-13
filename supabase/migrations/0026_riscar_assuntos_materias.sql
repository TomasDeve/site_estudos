-- 0026 — "Riscar" assuntos e matérias por concurso (estratégia de edital).
--
-- Concurso é estratégia: nem tudo do edital precisa ser estudado. "Riscar" um
-- assunto (ou a matéria inteira) o mantém VISÍVEL — aparece com um risco —, mas
-- passa a contar como se não estivesse no edital daquele concurso:
--   • sai do Status do edital / progresso (total e concluídos);
--   • o "Distribuir" das horas pula as matérias riscadas;
--   • no Ciclo, a matéria riscada continua na lista, mas é pulada automaticamente
--     (nunca vira a "Estude agora").
--
-- É POR CONCURSO, como o recorte de assuntos (topicos_incluidos): a mesma matéria
-- pode estar riscada num concurso e valendo em outro. Por isso mora no vínculo
-- concurso↔matéria, não no tópico (que é global/compartilhado).
--
--   topicos_riscados uuid[]  — assuntos riscados neste concurso ('{}' = nenhum).
--   riscada          boolean — a matéria inteira riscada neste concurso.
--
-- Sem FK por elemento do array (o Postgres não faz); o app ignora ids que não
-- existam mais. Idempotente. Rode no Supabase → SQL Editor.

ALTER TABLE public.concurso_materias
  ADD COLUMN IF NOT EXISTS topicos_riscados uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS riscada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.concurso_materias.topicos_riscados IS
  'Assuntos (tópicos da matéria) riscados neste concurso: visíveis, mas fora do edital para efeito de progresso/horas/ciclo. {} = nenhum.';
COMMENT ON COLUMN public.concurso_materias.riscada IS
  'Matéria inteira riscada neste concurso: fica na lista riscada, mas fora do progresso, da distribuição de horas e é pulada no ciclo.';
