// Ficha de cada concurso (seção "Informações"), tirada do edital publicado.
// Fica no código, e não no banco, porque só muda quando sai edital novo ou retificação:
// atualize este arquivo junto com a linha de `concursos` (data_prova, estrutura).
// A chave é o `concursos.slug`.

export interface Destaque {
  icone: string;
  rotulo: string;
  valor: string;
  sub?: string;
}

export interface DataEdital {
  titulo: string;
  /** "YYYY-MM-DD" */
  inicio: string;
  /** Último dia, quando é um período. */
  fim?: string;
  /** Datas que mexem com o aluno (inscrição, taxa, prova) ganham destaque. */
  destaque?: boolean;
  obs?: string;
}

export interface ProvaObjetiva {
  prova: string;
  area: string;
  questoes: number;
  materias: string[];
}

export interface TesteFisico {
  teste: string;
  homem: string;
  mulher: string;
  obs?: string;
}

export interface Etapa {
  nome: string;
  quando: string;
  detalhe: string;
}

/** Como a redação do concurso é corrigida — usado pelo painel de redações. */
export interface RegraRedacao {
  notaMax: number;
  /** Nota mínima para não ser eliminado. */
  minimo: number;
  /** Máximo de linhas da folha. */
  linhas: number;
  /** Nota = NC − 6 × NE ÷ TL (Cebraspe). */
  formulaCebraspe: boolean;
}

export interface InfoConcurso {
  edital: string;
  site: string;
  destaques: Destaque[];
  datas: DataEdital[];
  provas: ProvaObjetiva[];
  discursiva: string;
  regrasProva: string[];
  taf: { testes: TesteFisico[]; regras: string[] };
  diaDaProva: string[];
  etapas: Etapa[];
  vagas: { rotulo: string; n: number }[];
  requisitos: string[];
  redacao?: RegraRedacao;
  /** Blocos extras (exames médicos, isenção, desempate…). */
  extras: { titulo: string; icone: string; itens: string[] }[];
}

const PC_PE: InfoConcurso = {
  edital: "Edital nº 1 – PCPE, de 2 de outubro de 2026 · Cebraspe",
  site: "https://www.cebraspe.org.br/concursos/pc_pe_26",
  destaques: [
    { icone: "👮", rotulo: "Vagas (Agente)", valor: "1.200", sub: "780 de ampla concorrência" },
    { icone: "📅", rotulo: "Prova", valor: "07/03/2027", sub: "domingo, turno da tarde" },
    { icone: "⏱️", rotulo: "Tempo de prova", valor: "4 horas", sub: "objetivas + redação juntas" },
    { icone: "📝", rotulo: "Questões", valor: "60", sub: "múltipla escolha A–E + redação" },
    { icone: "💰", rotulo: "Remuneração", valor: "R$ 5.667,92", sub: "40h semanais ou plantão" },
    { icone: "🧾", rotulo: "Taxa", valor: "R$ 250,00", sub: "boleto até 18/12/2026" },
  ],
  datas: [
    { titulo: "Pedido de isenção da taxa", inicio: "2026-10-15", fim: "2026-11-12", obs: "das 10h do 1º dia às 18h do último" },
    { titulo: "Inscrições", inicio: "2026-10-15", fim: "2026-12-16", destaque: true, obs: "das 10h do 1º dia às 18h do último — só pelo site do Cebraspe" },
    { titulo: "Resultado final da isenção", inicio: "2026-12-15" },
    { titulo: "Conferir/reenviar a foto da inscrição", inicio: "2026-12-17", fim: "2026-12-18" },
    { titulo: "Último dia para pagar a taxa", inicio: "2026-12-18", destaque: true, obs: "boleto (banco, lotérica ou Correios) — PIX não vale" },
    { titulo: "Inscrições deferidas (provisório)", inicio: "2027-01-18" },
    { titulo: "Inscrições deferidas (final)", inicio: "2027-02-12" },
    { titulo: "Consulta ao local de prova", inicio: "2027-02-22", destaque: true },
    { titulo: "PROVA — objetivas + discursiva", inicio: "2027-03-07", destaque: true, obs: "turno da tarde (Escrivão faz de manhã)" },
    { titulo: "Gabarito preliminar e padrão da redação", inicio: "2027-03-09" },
    { titulo: "Recursos contra o gabarito", inicio: "2027-03-10", fim: "2027-03-11" },
    { titulo: "Resultado das objetivas e provisório da discursiva", inicio: "2027-04-13" },
    { titulo: "Envio dos documentos da investigação social", inicio: "2027-05-19", fim: "2027-05-20" },
    { titulo: "Envio dos exames médicos + exame clínico presencial", inicio: "2027-05-19", fim: "2027-05-30" },
    { titulo: "TAF — prova de capacidade física", inicio: "2027-07-30", fim: "2027-08-11", destaque: true },
    { titulo: "Avaliação psicológica", inicio: "2028-01-09" },
  ],
  provas: [
    {
      prova: "P1",
      area: "Noções de Direito",
      questoes: 20,
      materias: [
        "Legislação Estadual de PE",
        "Direito Constitucional",
        "Direito Administrativo",
        "Direito Penal + Legislação Penal Especial",
        "Direito Processual Penal",
      ],
    },
    {
      prova: "P2",
      area: "Conhecimentos Específicos",
      questoes: 40,
      materias: [
        "Língua Portuguesa",
        "Informática",
        "Raciocínio Lógico",
        "Contabilidade Geral",
        "Estatística",
      ],
    },
  ],
  redacao: {
    notaMax: 30,
    minimo: 15,
    linhas: 30,
    formulaCebraspe: true,
  },
  discursiva:
    "P3 — Redação de até 30 linhas sobre tema relevante e atual na área de segurança pública. Vale 30 pontos; precisa de 15 para passar.",
  regrasProva: [
    "Questões de múltipla escolha com 5 opções (A a E) e uma só correta — NÃO é Certo/Errado.",
    "Cada questão vale 1 ponto e o erro não desconta: nunca deixe em branco.",
    "Mínimo de 30 dos 60 pontos nas objetivas (não há mínimo por prova ou por matéria).",
    "A redação só é corrigida para os mais bem classificados nas objetivas (4.680 da ampla concorrência; 7.200 no total).",
    "Nota da redação = conteúdo (até 30) − 6 × erros ÷ linhas escritas. Escrever pouco faz cada erro pesar mais.",
    "Nota da 1ª etapa = objetivas + redação (máx. 90). Ela define quem vai para os exames médicos (2.340 da ampla; 3.600 no total).",
    "Atualidades cai só na redação, nunca nas objetivas.",
  ],
  taf: {
    testes: [
      { teste: "Barra fixa", homem: "3 repetições (dinâmica)", mulher: "15 s suspensa (estática)", obs: "sem luva, sem kipping, queixo acima da barra" },
      { teste: "Impulsão horizontal", homem: "1,65 m", mulher: "1,35 m" },
      { teste: "Natação 50 m", homem: "até 70 s", mulher: "até 80 s", obs: "piscina de 25 m, salto da borda, nado livre" },
      { teste: "Corrida de 12 minutos", homem: "2.200 m", mulher: "1.800 m", obs: "tentativa única" },
    ],
    regras: [
      "Os 4 testes são feitos em sequência, com no mínimo 5 minutos de intervalo, e todos são obrigatórios.",
      "Barra, impulsão e natação dão direito a uma 2ª tentativa; a corrida, não.",
      "Leve atestado médico no modelo do Anexo IV do edital, emitido até 15 dias antes do teste.",
      "É feito em Recife, de 30/07 a 11/08/2027. Só vai ao TAF quem foi considerado apto nos exames médicos.",
    ],
  },
  diaDaProva: [
    "Locais: Arcoverde, Caruaru, Petrolina ou Recife (a cidade é escolhida na inscrição).",
    "Chegue com 1 hora de antecedência: depois do horário de início, ninguém entra.",
    "Fique pelo menos 1 hora na sala; sair antes elimina.",
    "Leve documento de identidade original e caneta esferográfica PRETA de corpo transparente.",
    "Proibido na sala: celular, relógio de qualquer tipo, óculos escuros, lápis, borracha, marca-texto, boné e garrafa não transparente. Óculos de grau pode.",
    "A redação é escrita à mão, a caneta, no mesmo tempo das 4 horas — reserve tempo para ela.",
  ],
  etapas: [
    { nome: "Objetivas + discursiva", quando: "07/03/2027", detalhe: "Eliminatórias e classificatórias." },
    { nome: "Exames médicos", quando: "19 a 30/05/2027", detalhe: "Envio dos exames por upload + exame clínico presencial em Recife. Os exames são pagos por você." },
    { nome: "Investigação social", quando: "19 e 20/05/2027", detalhe: "Envio de certidões (Justiça, polícia) dos lugares onde morou nos últimos 5 anos." },
    { nome: "TAF", quando: "30/07 a 11/08/2027", detalhe: "Barra, impulsão, natação e corrida, em Recife." },
    { nome: "Avaliação psicológica", quando: "09/01/2028", detalhe: "Para os recomendados na investigação social." },
    { nome: "Curso de formação (2ª etapa)", quando: "a definir", detalhe: "Eliminatório, em Recife, com bolsa de 50% do salário (≈ R$ 2.833,96). Pode ter aulas à noite e nos fins de semana; a lotação é escolhida pela nota do curso." },
  ],
  vagas: [
    { rotulo: "Ampla concorrência", n: 780 },
    { rotulo: "Pretos e pardos", n: 300 },
    { rotulo: "Pessoas com deficiência", n: 60 },
    { rotulo: "Indígenas", n: 36 },
    { rotulo: "Quilombolas", n: 24 },
  ],
  requisitos: [
    "Curso superior completo em qualquer área, reconhecido pelo MEC — tecnólogo vale. Só é cobrado na posse.",
    "CNH categoria B ou superior, cobrada na matrícula do curso de formação e na posse.",
    "18 anos completos na posse. Não há idade máxima.",
    "Nacionalidade brasileira (ou portuguesa amparada pelo Estatuto da Igualdade).",
    "Estar quite com as obrigações eleitorais e, se homem, com as militares.",
  ],
  extras: [
    {
      titulo: "Exames médicos — pontos de atenção",
      icone: "🩺",
      itens: [
        "Visão medida COM óculos/lente: 20/20 num olho e 20/30 no outro, ou 20/40 nos dois. Usar óculos não reprova; cirurgia refrativa é aceita.",
        "Daltonismo total elimina; deficiência parcial de cores é aceita com laudo.",
        "Escoliose: só elimina com ângulo de Cobb acima de 20° (estruturada) ou 10° (descompensada), com margem de 3° e repercussão funcional. Escoliose congênita elimina.",
        "Toxicológico de cabelo, pelo ou unha, com janela de detecção de no mínimo 90 dias (maconha, cocaína, anfetaminas, opiáceos, PCP). O edital se contradiz no prazo (90 dias antes do envio × 60 dias antes da avaliação): colete dentro dos 60 dias. Os demais exames valem por 180 dias.",
        "Tatuagem só elimina se expressar violência, crime, preconceito ou ideias contrárias à democracia.",
      ],
    },
    {
      titulo: "Isenção da taxa (15/10 a 12/11/2026)",
      icone: "🆓",
      itens: [
        "Inscrito no CadÚnico (baixa renda).",
        "Doador de sangue: 3 doações (homem) ou 2 (mulher) nos 12 meses antes do edital.",
        "Doador de medula óssea, ou de 50 livros ao Banco do Livro de PE.",
        "Concluiu o ensino médio/técnico em escola pública há menos de 3 anos.",
        "Pessoa com deficiência, doadora de leite materno, ou jurado do Tribunal do Júri.",
      ],
    },
    {
      titulo: "Desempate",
      icone: "⚖️",
      itens: [
        "1º maior idade (conta dia, mês e ano).",
        "2º maior nota nas objetivas.",
        "3º maior nota na redação.",
        "4º ter sido jurado.",
      ],
    },
  ],
};

export const INFO_CONCURSOS: Record<string, InfoConcurso> = {
  pc_pe: PC_PE,
};
