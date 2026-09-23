import type { ConcursoMateria, Materia, Topico, TopicoQuestao } from "@/types/db";
import { agruparPorChave } from "@/features/conteudos/embaralhar";

export interface AssuntoImpressao {
  topicoId: string;
  titulo: string;
  questoes: TopicoQuestao[];
}

export interface MateriaImpressao {
  materiaId: string;
  nome: string;
  icone: string;
  assuntos: AssuntoImpressao[];
}

/** Compara posições que podem ser `Infinity` (fora do edital) sem gerar NaN. */
function cmp(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}

/**
 * Ordem de prova das questões marcadas: por matéria (na ordem do edital do concurso em
 * estudo), depois por assunto (a ordem do recorte do edital, ou a natural) e, dentro do
 * assunto, na ordem do caderno — com as do mesmo "Texto associado" juntas. Matérias e
 * assuntos fora do edital vão para o fim, em ordem alfabética.
 *
 * `vinculos` são os do concurso em estudo (a ordem das matérias sai deles).
 */
export function ordenarParaImpressao(
  questoes: TopicoQuestao[],
  topicos: Topico[],
  materias: Materia[],
  vinculos: ConcursoMateria[]
): TopicoQuestao[] {
  const topicoPorId = new Map(topicos.map((t) => [t.id, t]));
  const nomeMateria = new Map(materias.map((m) => [m.id, m.nome]));
  const vinculoPorMateria = new Map(vinculos.map((v) => [v.materia_id, v]));

  // matéria → assunto → questões
  const arvore = new Map<string, Map<string, TopicoQuestao[]>>();
  for (const q of questoes) {
    const materiaId = topicoPorId.get(q.topico_id)?.materia_id ?? "";
    let assuntos = arvore.get(materiaId);
    if (!assuntos) arvore.set(materiaId, (assuntos = new Map()));
    const lista = assuntos.get(q.topico_id);
    if (lista) lista.push(q);
    else assuntos.set(q.topico_id, [q]);
  }

  const nome = (id: string) => nomeMateria.get(id) ?? "Outras";
  const materiaIds = [...arvore.keys()].sort(
    (a, b) =>
      cmp(vinculoPorMateria.get(a)?.ordem ?? Infinity, vinculoPorMateria.get(b)?.ordem ?? Infinity) ||
      nome(a).localeCompare(nome(b), "pt")
  );

  const ordem: TopicoQuestao[] = [];
  for (const materiaId of materiaIds) {
    const incluidos = vinculoPorMateria.get(materiaId)?.topicos_incluidos;
    const posicao = new Map((incluidos ?? []).map((id, i) => [id, i]));
    const assuntos = arvore.get(materiaId)!;
    const topicoIds = [...assuntos.keys()].sort((a, b) => {
      const ta = topicoPorId.get(a);
      const tb = topicoPorId.get(b);
      return (
        cmp(posicao.get(a) ?? Infinity, posicao.get(b) ?? Infinity) ||
        cmp(ta?.ordem ?? Infinity, tb?.ordem ?? Infinity) ||
        (ta?.created_at ?? "").localeCompare(tb?.created_at ?? "") ||
        (ta?.titulo ?? "").localeCompare(tb?.titulo ?? "", "pt")
      );
    });
    for (const topicoId of topicoIds) {
      const doCaderno = [...assuntos.get(topicoId)!].sort(
        (a, b) =>
          a.ordem - b.ordem || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
      );
      // Texto associado lido uma vez: as questões dele saem em sequência.
      ordem.push(...agruparPorChave(doCaderno, (q) => q.texto_associado));
    }
  }
  return ordem;
}

/**
 * Numeração da folha. O número de uma questão já impressa fica gravado
 * (`impressao_numero`) e não muda mais — desmarcar ou marcar outras não mexe na folha
 * que está com o aluno, e a correção no site continua batendo com o papel. As ainda não
 * impressas ganham números provisórios depois do maior gravado, na ordem de prova, com
 * as que estão na tela primeiro (assim a próxima impressão sai em sequência); eles viram
 * definitivos quando a folha é impressa. A ordem final segue o número.
 */
export function numerarImpressao(
  ordemProva: TopicoQuestao[],
  naTela: (q: TopicoQuestao) => boolean
): { ordem: TopicoQuestao[]; numeroDe: Map<string, number> } {
  const impressas = ordemProva
    .filter((q) => q.impressao_numero != null)
    .sort((a, b) => a.impressao_numero! - b.impressao_numero!);
  const novas = ordemProva.filter((q) => q.impressao_numero == null);
  const novasEmOrdem = [...novas.filter(naTela), ...novas.filter((q) => !naTela(q))];

  const numeroDe = new Map<string, number>();
  let ultimo = 0;
  for (const q of impressas) {
    numeroDe.set(q.id, q.impressao_numero!);
    ultimo = Math.max(ultimo, q.impressao_numero!);
  }
  for (const q of novasEmOrdem) numeroDe.set(q.id, ++ultimo);
  return { ordem: [...impressas, ...novasEmOrdem], numeroDe };
}

/**
 * Agrupa uma sequência de questões em matérias e assuntos para os títulos da tela e da
 * folha, juntando só os vizinhos: numa lista com impressões de dias diferentes, a mesma
 * matéria pode aparecer de novo mais adiante (a folha segue a numeração).
 */
export function agruparEmSequencia(
  questoes: TopicoQuestao[],
  topicos: Topico[],
  materias: Materia[]
): MateriaImpressao[] {
  const topicoPorId = new Map(topicos.map((t) => [t.id, t]));
  const materiaPorId = new Map(materias.map((m) => [m.id, m]));
  const out: MateriaImpressao[] = [];
  for (const q of questoes) {
    const topico = topicoPorId.get(q.topico_id);
    const materiaId = topico?.materia_id ?? "";
    let materia = out[out.length - 1];
    if (!materia || materia.materiaId !== materiaId) {
      const m = materiaPorId.get(materiaId);
      materia = { materiaId, nome: m?.nome ?? "Outras", icone: m?.icone ?? "📄", assuntos: [] };
      out.push(materia);
    }
    let assunto = materia.assuntos[materia.assuntos.length - 1];
    if (!assunto || assunto.topicoId !== q.topico_id) {
      assunto = { topicoId: q.topico_id, titulo: topico?.titulo ?? "Assunto", questoes: [] };
      materia.assuntos.push(assunto);
    }
    assunto.questoes.push(q);
  }
  return out;
}

export interface BlocoTexto {
  /** O "Texto associado" comum ao bloco (null = questões sem texto). */
  texto: string | null;
  questoes: TopicoQuestao[];
}

/** Quebra uma sequência de questões em blocos seguidos que compartilham o mesmo texto associado. */
export function blocosPorTexto(questoes: TopicoQuestao[]): BlocoTexto[] {
  const out: BlocoTexto[] = [];
  for (const q of questoes) {
    const texto = q.texto_associado?.trim() ? q.texto_associado : null;
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.texto === texto) ultimo.questoes.push(q);
    else out.push({ texto, questoes: [q] });
  }
  return out;
}

/**
 * Números em texto corrido, juntando as sequências de 3 ou mais:
 * [5] → "5"; [5,6] → "5 e 6"; [5,6,7,8] → "5 a 8"; [5,6,9,10] → "5, 6, 9 e 10".
 */
export function listaNumeros(nums: number[]): string {
  const ord = [...new Set(nums)].sort((a, b) => a - b);
  const partes: string[] = [];
  for (let i = 0; i < ord.length; ) {
    let j = i;
    while (j + 1 < ord.length && ord[j + 1] === ord[j] + 1) j++;
    if (j - i >= 2) partes.push(`${ord[i]} a ${ord[j]}`);
    else for (let k = i; k <= j; k++) partes.push(String(ord[k]));
    i = j + 1;
  }
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}
