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
  /** Nota = NC − pesoErro × NE ÷ TL (Cebraspe). */
  formulaCebraspe: boolean;
  /** Peso do erro na fórmula: 6 na PC PE (30 pts), 2 na Polícia Penal (10 pts). Padrão 6. */
  pesoErro?: number;
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
  edital: "Edital nº 1 – PCPE, de 2 de outubro de 2026 (retificado pelo Edital nº 2, de 15/10/2026) · Cebraspe",
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
        "Língua Portuguesa + Manual de Redação da Presidência",
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

// Escrivão: mesmo edital do Agente. Muda a matéria da P2 (Arquivologia no lugar de
// Contabilidade), as vagas, o turno (manhã) e entra a prova prática de digitação.
const PC_PE_ESCRIVAO: InfoConcurso = {
  ...PC_PE,
  destaques: PC_PE.destaques.map((d) =>
    d.rotulo === "Vagas (Agente)"
      ? { icone: "🖋️", rotulo: "Vagas (Escrivão)", valor: "70", sub: "45 de ampla concorrência" }
      : d.rotulo === "Prova"
        ? { ...d, sub: "domingo, turno da manhã" }
        : d
  ),
  datas: PC_PE.datas.flatMap((d) =>
    d.titulo.startsWith("PROVA")
      ? [{ ...d, obs: "turno da manhã (Agente faz à tarde)" }]
      : d.titulo === "Avaliação psicológica"
        ? [{ titulo: "Prova prática de digitação", inicio: "2027-11-06", destaque: true }, d]
        : [d]
  ),
  provas: PC_PE.provas.map((p) =>
    p.prova === "P2"
      ? { ...p, materias: p.materias.map((m) => (m === "Contabilidade Geral" ? "Noções de Arquivologia" : m)) }
      : p
  ),
  regrasProva: [
    "Questões de múltipla escolha com 5 opções (A a E) e uma só correta — NÃO é Certo/Errado.",
    "Cada questão vale 1 ponto e o erro não desconta: nunca deixe em branco.",
    "Mínimo de 30 dos 60 pontos nas objetivas (não há mínimo por prova ou por matéria).",
    "A redação só é corrigida para os mais bem classificados nas objetivas (270 da ampla concorrência; 420 no total).",
    "Nota da redação = conteúdo (até 30) − 6 × erros ÷ linhas escritas. Escrever pouco faz cada erro pesar mais.",
    "Nota da 1ª etapa = objetivas + redação (máx. 90). Ela define quem vai para os exames médicos (180 da ampla; 280 no total).",
    "Atualidades cai só na redação, nunca nas objetivas.",
  ],
  etapas: PC_PE.etapas.flatMap((e) =>
    e.nome === "Avaliação psicológica"
      ? [
          {
            nome: "Prova prática de digitação",
            quando: "06/11/2027",
            detalhe:
              "10 minutos para digitar um texto de ~2.000 caracteres, em Recife. Precisa de 100 toques líquidos por minuto (cada erro desconta 3 toques). Eliminatória; a nota não soma. Só vai quem foi recomendado na investigação social.",
          },
          { ...e, detalhe: "Para os aprovados na digitação." },
        ]
      : [e]
  ),
  vagas: [
    { rotulo: "Ampla concorrência", n: 45 },
    { rotulo: "Pretos e pardos", n: 18 },
    { rotulo: "Pessoas com deficiência", n: 4 },
    { rotulo: "Indígenas", n: 2 },
    { rotulo: "Quilombolas", n: 1 },
  ],
  extras: [
    {
      titulo: "Dá para fazer Escrivão e Agente",
      icone: "🔁",
      itens: [
        "Pode se inscrever nos dois cargos: Escrivão é de manhã e Agente à tarde, no mesmo dia (07/03/2027). Paga as duas taxas.",
        "Exames médicos e TAF são feitos uma vez só e valem para os dois.",
        "O conteúdo é o mesmo, menos uma matéria da P2: Arquivologia (Escrivão) × Contabilidade (Agente).",
      ],
    },
    ...PC_PE.extras,
  ],
};

// Polícia Penal PE: Edital nº 1 – SAD-SEAP/PE, de 3/11/2026 (DOE-PE de 4/11/2026).
const PP_PE: InfoConcurso = {
  edital: "Edital nº 1 – SAD-SEAP/PE, de 3 de novembro de 2026 (DOE-PE de 04/11/2026) · Cebraspe",
  site: "https://www.cebraspe.org.br/concursos/seap_pe_26",
  destaques: [
    { icone: "🔒", rotulo: "Vagas (Policial Penal)", valor: "700", sub: "537 masculinas · 163 femininas" },
    { icone: "📅", rotulo: "Prova", valor: "21/03/2027", sub: "domingo, turno da tarde (14 dias depois da PC PE)" },
    { icone: "⏱️", rotulo: "Tempo de prova", valor: "4h30", sub: "objetivas + redação juntas" },
    { icone: "📝", rotulo: "Questões", valor: "60", sub: "múltipla escolha A–E + redação" },
    { icone: "💰", rotulo: "Remuneração", valor: "R$ 5.667,92", sub: "R$ 2.833,96 + 100% de gratificação de risco" },
    { icone: "🧾", rotulo: "Taxa", valor: "R$ 250,00", sub: "boleto até 06/01/2027" },
  ],
  datas: [
    { titulo: "Pedido de isenção da taxa", inicio: "2026-11-12", fim: "2026-11-22", obs: "das 10h do 1º dia às 18h do último" },
    { titulo: "Inscrições", inicio: "2026-11-12", fim: "2027-01-04", destaque: true, obs: "das 10h do 1º dia às 18h do último — só pelo site do Cebraspe" },
    { titulo: "Isenção: resultado provisório", inicio: "2026-12-08", fim: "2026-12-11" },
    { titulo: "Isenção: resultado final", inicio: "2026-12-29" },
    { titulo: "Conferir/reenviar a foto da inscrição", inicio: "2027-01-05", fim: "2027-01-06" },
    { titulo: "Último dia para pagar a taxa", inicio: "2027-01-06", destaque: true, obs: "boleto (banco, lotérica ou Correios) — PIX não vale" },
    { titulo: "Inscrições deferidas (provisório)", inicio: "2027-01-26" },
    { titulo: "Inscrições deferidas (final)", inicio: "2027-02-19" },
    { titulo: "Consulta ao local de prova", inicio: "2027-03-05", destaque: true },
    { titulo: "PROVA — objetivas + discursiva", inicio: "2027-03-21", destaque: true, obs: "turno da tarde, 4h30" },
    { titulo: "Gabarito preliminar e padrão da redação", inicio: "2027-03-23" },
    { titulo: "Recursos contra o gabarito", inicio: "2027-03-24", fim: "2027-03-25" },
    { titulo: "Resultado das objetivas e provisório da discursiva", inicio: "2027-04-23" },
    { titulo: "FIC + documentos da investigação social", inicio: "2027-05-17", fim: "2027-05-31" },
    { titulo: "Envio dos exames médicos", inicio: "2027-05-17", fim: "2027-06-09" },
    { titulo: "Exame clínico presencial", inicio: "2027-06-05", fim: "2027-06-09" },
    { titulo: "TAF — exames de aptidão física", inicio: "2027-08-12", fim: "2027-08-18", destaque: true },
    { titulo: "Avaliação psicológica", inicio: "2027-10-10" },
  ],
  provas: [
    {
      prova: "P1",
      area: "Conhecimentos Gerais",
      questoes: 20,
      materias: [
        "Língua Portuguesa",
        "Ética no Serviço Público (+ PAD da Lei 8.112 e Decreto PE 46.852/2018)",
        "Legislação Estadual (Código Penitenciário, LC 106, CE-PE, LC 422, LC 150, Lei 6.123, LC 487, EC 53)",
        "Noções de Informática (Windows, Office 365, internet, segurança, LGPD)",
      ],
    },
    {
      prova: "P2",
      area: "Conhecimentos Específicos",
      questoes: 40,
      materias: [
        "Direito Administrativo",
        "Direito Constitucional",
        "Direito Penal",
        "Direito Processual Penal",
        "Legislação Especial (19 leis)",
        "Execução Penal",
        "Noções de Direitos Humanos e Participação Social",
      ],
    },
  ],
  redacao: {
    notaMax: 10,
    minimo: 5,
    linhas: 30,
    formulaCebraspe: true,
    pesoErro: 2,
  },
  discursiva:
    "P3 — Redação (texto dissertativo) de até 30 linhas sobre tema atual de segurança prisional nacional e direitos humanos. Vale 10 pontos; precisa de 5 para passar.",
  regrasProva: [
    "Questões de múltipla escolha com 5 opções (A a E) e uma só correta — NÃO é Certo/Errado.",
    "Cada questão vale 1 ponto e o erro não desconta: nunca deixe em branco.",
    "Mínimo de 30 dos 60 pontos nas objetivas (não há mínimo por prova ou por matéria).",
    "Raciocínio Lógico SAIU: em 2021 caía na P1; agora a P1 é Português, Ética, Legislação Estadual e Informática.",
    "A redação só é corrigida para os mais bem classificados nas objetivas (2.724 da ampla concorrência; 4.200 no total).",
    "Nota da redação = conteúdo (até 10) − 2 × erros ÷ linhas escritas. Escrever pouco faz cada erro pesar mais.",
    "Nota da 1ª etapa = objetivas + redação (máx. 70). Ela define quem vai para os exames médicos (1.362 da ampla; 2.101 no total).",
    "A classificação é separada por sexo (vagas masculinas e femininas).",
    "Atualidades cai só na redação, nunca nas objetivas.",
    "Vale a legislação vigente em 04/11/2026 (publicação do edital); jurisprudência publicada até 30 dias antes da prova.",
  ],
  taf: {
    testes: [
      { teste: "Barra fixa", homem: "3 repetições (dinâmica)", mulher: "10 s suspensa (estática)", obs: "sem luva, sem kipping, queixo acima da barra" },
      { teste: "Impulsão horizontal", homem: "1,70 m", mulher: "1,35 m", obs: "2 saltos queimados eliminam" },
      { teste: "Abdominal em 1 minuto", homem: "30 repetições", mulher: "24 repetições", obs: "braços cruzados no peito, cotovelos tocam os joelhos, sem pausa" },
      { teste: "Corrida de 12 minutos", homem: "2.200 m", mulher: "1.800 m", obs: "tentativa única; pode caminhar" },
    ],
    regras: [
      "Os 4 testes são feitos em sequência, com no mínimo 5 minutos de intervalo, e todos são obrigatórios.",
      "Barra, impulsão e abdominal dão direito a uma 2ª tentativa; a corrida, não.",
      "Não tem natação (a PC PE tem).",
      "Leve atestado médico no modelo do Anexo IV do edital, emitido até 15 dias antes do teste, sem nenhuma restrição.",
      "É feito em Recife, de 12 a 18/08/2027. Só vai ao TAF quem foi considerado apto nos exames médicos.",
    ],
  },
  diaDaProva: [
    "Locais: Arcoverde, Caruaru, Petrolina ou Recife (a cidade é escolhida na inscrição).",
    "Chegue com 1 hora de antecedência: depois do horário de início, ninguém entra.",
    "Fique pelo menos 1 hora na sala; sair antes elimina.",
    "Leve documento de identidade original, comprovante de inscrição e caneta esferográfica PRETA de corpo transparente.",
    "Proibido na sala: celular, relógio de qualquer tipo, óculos escuros, lápis, borracha, marca-texto, boné e garrafa não transparente.",
    "A redação é escrita à mão, a caneta, dentro das 4h30 — reserve tempo para ela.",
  ],
  etapas: [
    { nome: "Objetivas + discursiva", quando: "21/03/2027", detalhe: "Eliminatórias e classificatórias." },
    { nome: "Exames médicos", quando: "17/05 a 09/06/2027", detalhe: "Envio dos exames por upload + exame clínico presencial em Recife (05 a 09/06). Os exames são pagos por você." },
    { nome: "TAF", quando: "12 a 18/08/2027", detalhe: "Barra, impulsão, abdominal e corrida, em Recife." },
    { nome: "Avaliação psicológica", quando: "10/10/2027", detalhe: "Para os aptos no TAF." },
    { nome: "Investigação social", quando: "FIC de 17 a 31/05/2027", detalhe: "Feita pela SEAP para os aptos na avaliação psicológica; pode seguir até 120 dias depois da matrícula no curso." },
    { nome: "Curso de formação (2ª etapa)", quando: "a definir", detalhe: "Eliminatório e classificatório, em tempo integral, em Itaquitinga e/ou Recife, com bolsa de 60% do vencimento (≈ R$ 1.700). A nota do curso é a nota final e define a escolha da lotação. Não há cadastro de reserva." },
  ],
  vagas: [
    { rotulo: "Ampla concorrência (349 H + 105 M)", n: 454 },
    { rotulo: "Pretos e pardos (134 H + 41 M)", n: 175 },
    { rotulo: "Pessoas com deficiência (27 H + 9 M)", n: 36 },
    { rotulo: "Indígenas (16 H + 5 M)", n: 21 },
    { rotulo: "Quilombolas (11 H + 3 M)", n: 14 },
  ],
  requisitos: [
    "Curso superior completo em qualquer área, reconhecido pelo MEC.",
    "CNH categoria B ou superior.",
    "18 anos completos na posse. Não há idade máxima.",
    "Nacionalidade brasileira (ou portuguesa amparada pelo Estatuto da Igualdade).",
    "Estar quite com as obrigações eleitorais e, se homem, com as militares.",
  ],
  extras: [
    {
      titulo: "O que mudou em relação ao edital de 2021",
      icone: "🔄",
      itens: [
        "Saiu Raciocínio Lógico. Em Informática entrou LGPD e saíram Linux e LibreOffice.",
        "Legislação Estadual ganhou a LC 487/2022 e a Emenda Constitucional estadual nº 53/2020.",
        "Constitucional e Administrativo ficaram bem mais largos (controle de constitucionalidade, tributário, finanças; licitações, contratos, bens públicos, PPP).",
        "Penal ganhou crimes contra a dignidade sexual, a incolumidade pública e a paz pública; Processo Penal ganhou provas, prisões, JECrim e TCO.",
        "Legislação Especial foi de 8 para 19 leis (entram ECA, Maria da Penha, ambientais, idoso, trânsito, eleitorais, racismo, 9.099, 12.830, 9.296, Estatuto da Juventude e o Marco Legal do Combate ao Crime Organizado — Lei 15.358/2026); saíram Anticorrupção e Pacote Anticrime.",
        "Execução Penal perdeu as Resoluções CNPCP 4/2014, 5/2014 e 8/2011.",
        "Direitos Humanos ganhou teoria geral, afirmação histórica, CF e tratados, Pacto de São José e Política Nacional de DH.",
        "A prova caiu de 5h para 4h30.",
      ],
    },
    {
      titulo: "Exames médicos — pontos de atenção",
      icone: "🩺",
      itens: [
        "Visão medida COM óculos/lente: 20/20 num olho e 20/30 no outro, ou 20/40 nos dois.",
        "Daltonismo total elimina; deficiência parcial de cores é aceita.",
        "Escoliose: só elimina com ângulo de Cobb acima de 20° (estruturada) ou 10° (descompensada), com margem de 3° e repercussão funcional. Escoliose congênita elimina.",
        "Toxicológico de cabelo, pelo ou unha, coletado até 90 dias antes do envio, com janela de detecção de no mínimo 90 dias. Os demais exames valem por 180 dias (Beta-HCG, 30 dias).",
        "Tatuagem só elimina se expressar violência, crime, facção, preconceito ou ideias contrárias à democracia.",
      ],
    },
    {
      titulo: "Isenção da taxa (12 a 22/11/2026)",
      icone: "🆓",
      itens: [
        "Inscrito no CadÚnico (baixa renda).",
        "Doador de sangue: 3 doações (homem) ou 2 (mulher) nos 12 meses antes do edital.",
        "Doador de medula óssea há 12 meses, ou de 50 livros ao Banco do Livro de PE.",
        "Concluiu o ensino médio/técnico em escola pública há menos de 3 anos (e é de baixa renda).",
        "Pessoa com deficiência, doadora de leite materno, ou jurado do Tribunal do Júri nos últimos 2 anos.",
      ],
    },
    {
      titulo: "Desempate (1ª etapa)",
      icone: "⚖️",
      itens: [
        "1º maior idade (conta dia, mês e ano).",
        "2º maior nota na P2 (Conhecimentos Específicos).",
        "3º maior nota na P1 (Conhecimentos Gerais).",
        "4º ter sido jurado.",
      ],
    },
  ],
};

export const INFO_CONCURSOS: Record<string, InfoConcurso> = {
  pc_pe: PC_PE,
  pc_pe_escrivao: PC_PE_ESCRIVAO,
  pp_pe: PP_PE,
};
