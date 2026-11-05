// Tema da semana: as 15 propostas que mais podem cair na PC PE, da mais provável à menos
// provável. Cada semana ele escolhe uma, estuda 30 min por dia (segunda: o tema e o Anki;
// terça a sexta: um parágrafo por dia no site) e escreve a redação inteira no domingo.
//
// Critério da ordem (pesquisa de 05/11/2026):
// - a PC PE cobra "tema relevante e atual na área de segurança pública" e, em 2024, foi de
//   gestão: investimento (Agente) e integração de sistemas (Escrivão);
// - as provas policiais recentes da Cebraspe: investigação na era dos dados (PF 2025),
//   violência contra a mulher (PCDF 2021, PC AL 2021), racismo (PCDF 2021), polícia e
//   direitos (PF 2019 e 2021), regulação das redes (PCDF 2025), armas (PCDF 2013),
//   sistema prisional (SERES PE 2017);
// - o que está em alta em 2026: Lei Antifacção (15.358), PEC da Segurança (Senado 3/11),
//   golpes digitais, falta de efetivo nas polícias civis (FBSP, ago. 2026).

import { TEMAS, type TemaParagrafo, type TipoParagrafo } from "./paragrafos";

export type Chance = "muito alta" | "alta" | "média" | "possível";

export interface PropostaSemana {
  temaId: string;
  chance: Chance;
  /** Por que pode cair (1 ou 2 frases). */
  porque: string;
  /** Temas parecidos que o mesmo repertório resolve. */
  serveTambem: string[];
}

export const PROPOSTAS_SEMANA: PropostaSemana[] = [
  {
    temaId: "b05a",
    chance: "muito alta",
    porque:
      "É o tema mais quente de 2026: a Lei Antifacção (Lei 15.358/2026) vale desde março, e a PEC da Segurança endurece as regras contra as facções.",
    serveTambem: ["crime organizado", "milícias", "tráfico de drogas", "domínio de territórios", "presídios"],
  },
  {
    temaId: "e5",
    chance: "muito alta",
    porque:
      "A PEC da Segurança, aprovada pelo Senado em 3/11/2026, leva o SUSP para a Constituição. É tema de gestão, como os dois da PC PE 2024 (investimento e integração).",
    serveTambem: ["SUSP", "integração entre as polícias", "financiamento da segurança", "guardas e polícias municipais", "segurança, dever de todos"],
  },
  {
    temaId: "b07a",
    chance: "muito alta",
    porque: "O estelionato é o crime que mais cresce no país, e a PF 2025 cobrou investigação na era dos dados.",
    serveTambem: ["crimes cibernéticos", "roubo de celulares", "golpes contra idosos", "fraudes bancárias e Pix", "investigação digital"],
  },
  {
    temaId: "b02a",
    chance: "alta",
    porque:
      "É o trabalho do Agente de Polícia Civil: investigar. Só 1 em cada 3 homicídios é esclarecido, e a banca gosta de ligar o tema ao cargo.",
    serveTambem: ["impunidade", "perícia e provas", "homicídios", "desaparecimento de pessoas", "proteção a testemunhas"],
  },
  {
    temaId: "e8",
    chance: "alta",
    porque:
      "A PF 2025 cobrou dados e tecnologia na investigação, e o padrão de resposta da PC PE 2024 aceitou o reconhecimento facial como exemplo.",
    serveTambem: ["reconhecimento facial", "big data", "câmeras corporais", "proteção de dados (LGPD)", "integração de sistemas"],
  },
  {
    temaId: "b06a",
    chance: "alta",
    porque:
      "A Cebraspe repete o tema em provas policiais (PCDF 2021 e PC AL 2021), e o pacote antifeminicídio de 2024 aumentou as penas.",
    serveTambem: ["violência doméstica", "Lei Maria da Penha", "violência sexual", "atendimento à vítima", "delegacias da mulher"],
  },
  {
    temaId: "b12b",
    chance: "alta",
    porque:
      "O FBSP mostrou em agosto de 2026 que as polícias civis têm só 55% do efetivo previsto em lei. É tema de gestão ligado à própria carreira.",
    serveTambem: ["falta de efetivo", "concursos e formação", "condições de trabalho", "saúde mental do policial", "investimento"],
  },
  {
    temaId: "b09a",
    chance: "média",
    porque:
      "A Cebraspe gosta de \"polícia e direitos fundamentais\" (PF 2019 e PF 2021), e as câmeras corporais e a letalidade policial seguem em debate.",
    serveTambem: ["câmeras corporais", "direitos humanos", "racismo e abordagem policial", "confiança na polícia", "polícia comunitária"],
  },
  {
    temaId: "b10a",
    chance: "média",
    porque:
      "As facções nasceram nos presídios, e a PEC da Segurança cria o Sistema de Políticas Penais. A Cebraspe já cobrou o sistema prisional em PE (SERES 2017).",
    serveTambem: ["reincidência", "ressocialização", "egressos", "facções nos presídios", "Polícia Penal"],
  },
  {
    temaId: "e6",
    chance: "média",
    porque:
      "A Operação Carbono Oculto (2025) e a Lei Antifacção puseram o dinheiro do crime no centro: tomar os bens e usá-los na segurança.",
    serveTambem: ["asfixia financeira", "confisco de bens", "fintechs", "financiamento da segurança", "crime organizado"],
  },
  {
    temaId: "b07b",
    chance: "média",
    porque:
      "O ECA Digital (Lei 15.211/2025) vale desde março de 2026 e obriga as plataformas a proteger crianças e adolescentes.",
    serveTambem: ["violência sexual contra crianças", "ECA", "aliciamento on-line", "escolas", "plataformas digitais"],
  },
  {
    temaId: "b11a",
    chance: "média",
    porque:
      "A banca valoriza a prevenção, os jovens são as maiores vítimas da violência, e o 2º edital da PC PE incluiu o Estatuto da Juventude.",
    serveTambem: ["prevenção", "violência nas escolas", "drogas", "desigualdade social", "Estatuto da Juventude"],
  },
  {
    temaId: "b12a",
    chance: "média",
    porque:
      "O adoecimento e o suicídio de policiais aparecem sempre nas listas de temas, e uma lei de 2023 criou um programa nacional para cuidar disso.",
    serveTambem: ["valorização profissional", "condições de trabalho", "letalidade policial", "suicídio"],
  },
  {
    temaId: "e10",
    chance: "possível",
    porque:
      "A Cebraspe cobrou desinformação e regulação das redes na PCDF 2025. Na PC PE entraria pelo lado da segurança: golpes, ameaças e ataques a escolas.",
    serveTambem: ["fake news e deepfakes", "redes sociais", "discurso de ódio", "ataques a escolas", "golpes digitais"],
  },
  {
    temaId: "b05b",
    chance: "possível",
    porque: "O controle de armas já caiu na Cebraspe (PCDF 2013), e os decretos de 2023 mudaram as regras para os CACs.",
    serveTambem: ["Estatuto do Desarmamento", "homicídios", "CACs", "facções", "rastreamento de armas"],
  },
];

export function temaDaProposta(p: PropostaSemana): TemaParagrafo {
  return TEMAS.find((t) => t.id === p.temaId)!;
}

/** Posição (1 a 15) do tema na ordem de chance; null se não está entre as 15. */
export function posicaoDoTema(temaId: string): number | null {
  const i = PROPOSTAS_SEMANA.findIndex((p) => p.temaId === temaId);
  return i < 0 ? null : i + 1;
}

export type DiaPlano = "seg" | "ter" | "qua" | "qui" | "sex" | "dom";

export interface PassoSemana {
  dia: DiaPlano;
  nome: string;
  titulo: string;
  descricao: string;
  /** Dias de parágrafo: o que escrever no site (o check sai do histórico). */
  parte?: { tipo: TipoParagrafo; aspecto: number | null };
}

/** A semana do tema: 30 min de segunda a sexta e a redação inteira no domingo. */
export const PLANO_SEMANA: PassoSemana[] = [
  {
    dia: "seg",
    nome: "Segunda",
    titulo: "Estudar o tema",
    descricao: "Leia a proposta, o esqueleto e a redação modelo. Passe o \"Para decorar\" para o Anki.",
  },
  {
    dia: "ter",
    nome: "Terça",
    titulo: "Introdução",
    descricao: "Um fato com fonte e o anúncio dos 3 aspectos.",
    parte: { tipo: "introducao", aspecto: null },
  },
  {
    dia: "qua",
    nome: "Quarta",
    titulo: "1º desenvolvimento",
    descricao: "Responde ao aspecto 1, com 2 pontos e informação concreta.",
    parte: { tipo: "desenvolvimento", aspecto: 0 },
  },
  {
    dia: "qui",
    nome: "Quinta",
    titulo: "2º desenvolvimento",
    descricao: "Responde ao aspecto 2. Se ele pede exemplo, cite pelo menos 2.",
    parte: { tipo: "desenvolvimento", aspecto: 1 },
  },
  {
    dia: "sex",
    nome: "Sexta",
    titulo: "Conclusão",
    descricao: "Responde ao aspecto 3. Depois, releia a redação modelo inteira.",
    parte: { tipo: "conclusao", aspecto: 2 },
  },
  {
    dia: "dom",
    nome: "Domingo",
    titulo: "Redação completa",
    descricao: "Na folha de 30 linhas, sem consulta, em até 1 hora. Mande a foto ao Claude para corrigir.",
  },
];

// Ele estuda de madrugada (22h–4h): antes das 6h ainda vale o dia anterior, como no ciclo.
const VIRADA_DO_DIA = 6;
const DIAS: (DiaPlano | "sab")[] = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function diaDeEstudo(agora: Date): Date {
  const d = new Date(agora.getTime() - VIRADA_DO_DIA * 3_600_000);
  d.setHours(0, 0, 0, 0);
  return d;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A segunda-feira da semana de estudo (AAAA-MM-DD). */
export function semanaDe(agora: Date = new Date()): string {
  const d = diaDeEstudo(agora);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

/** Que dia do plano é hoje (sábado fica fora do plano de redação). */
export function diaDoPlano(agora: Date = new Date()): DiaPlano | "sab" {
  return DIAS[diaDeEstudo(agora).getDay()];
}

/** "02/11" a partir de "2026-11-02". */
export function rotuloSemana(semana: string): string {
  const [, m, d] = semana.split("-");
  return `${d}/${m}`;
}
