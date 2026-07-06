// Gerado automaticamente a partir do data.js do site v1 (script convert-seed.mjs).
// Não editar na mão — os slugs casam com o progresso legado do localStorage.

export interface SeedMateria {
  slug: string;
  nome: string;
  icone: string;
  topicos: string[];
}

export interface SeedConcursoMateria {
  materiaSlug: string;
  area: "P1" | "P2" | "outros";
  peso: number | null;
  ordem: number;
}

export interface SeedConcurso {
  slug: string;
  nome: string;
  nomeCurto: string | null;
  orgao: string | null;
  banca: string | null;
  status: "ativo" | "futuro";
  icone: string;
  cor: string;
  dataProva: string | null;
  notaData: string | null;
  duracaoProva: string | null;
  ordem: number;
  estrutura: unknown[];
  materias: SeedConcursoMateria[];
}

export const SEED_MATERIAS: SeedMateria[] = [
  {
    "slug": "portugues",
    "nome": "Língua Portuguesa",
    "icone": "📖",
    "topicos": [
      "Compreensão e interpretação de textos de gêneros variados",
      "Reconhecimento de tipos e gêneros textuais",
      "Domínio da ortografia oficial",
      "Coesão: referenciação, substituição, repetição, conectores e sequenciação",
      "Emprego de tempos e modos verbais",
      "Estrutura morfossintática do período",
      "Emprego das classes de palavras",
      "Coordenação entre orações e termos",
      "Subordinação entre orações e termos",
      "Emprego dos sinais de pontuação",
      "Concordância verbal e nominal",
      "Regência verbal e nominal",
      "Emprego do sinal indicativo de crase",
      "Colocação dos pronomes átonos",
      "Reescrita de frases/parágrafos; significação; substituição; reorganização"
    ]
  },
  {
    "slug": "informatica",
    "nome": "Noções de Informática",
    "icone": "💻",
    "topicos": [
      "Sistema operacional (ambiente Windows)",
      "Edição de textos, planilhas e apresentações (MS Office)",
      "Redes de computadores; Internet e intranet",
      "Navegadores (Edge, Firefox, Chrome)",
      "Correio eletrônico (Outlook)",
      "Busca/pesquisa na Internet; grupos de discussão; redes sociais",
      "Computação na nuvem (cloud computing)",
      "Organização e gerenciamento de arquivos, pastas e programas",
      "Segurança da informação: malware, vírus, worms, pragas",
      "Antivírus, firewall, anti-spyware; backup; cloud storage"
    ]
  },
  {
    "slug": "dconst",
    "nome": "Direito Constitucional",
    "icone": "📜",
    "topicos": [
      "Direitos e garantias fundamentais (art. 5º)",
      "Remédios constitucionais (HC, MS, MI, habeas data)",
      "Direitos sociais, nacionalidade e direitos políticos",
      "Organização do Estado (federação e competências)",
      "Organização dos Poderes",
      "Defesa do Estado e das instituições democráticas; segurança pública (art. 144)"
    ]
  },
  {
    "slug": "dadm",
    "nome": "Direito Administrativo",
    "icone": "🏛️",
    "topicos": [
      "Princípios da administração pública (LIMPE)",
      "Regime jurídico administrativo",
      "Organização administrativa: centralização, descentralização, desconcentração",
      "Administração direta e indireta (autarquias, fundações, EP, SEM)",
      "Poderes da administração (poder de polícia)",
      "Agente público (cargo, emprego e função)",
      "Atos administrativos",
      "Contratos administrativos e licitação",
      "Serviço público",
      "Bens públicos",
      "Controle da administração pública",
      "Responsabilidade civil do Estado"
    ]
  },
  {
    "slug": "dpp",
    "nome": "Direito Processual Penal",
    "icone": "🔎",
    "topicos": [
      "Disposições preliminares do Código de Processo Penal",
      "Inquérito policial (natureza, características, titularidade, indiciamento)",
      "Ação penal",
      "Prisão em flagrante, temporária e preventiva; liberdade provisória",
      "Provas",
      "Lei 9.099/1995 (Juizados Especiais Criminais)",
      "Disposições constitucionais aplicáveis ao processo penal"
    ]
  },
  {
    "slug": "leis",
    "nome": "Legislação Penal Especial",
    "icone": "⚖️",
    "topicos": [
      "CP — Parte Geral (DL 2.848/1940), Títulos I a III",
      "Lei 7.716/1989 — Crimes de racismo",
      "Leis 8.072/1990 e 8.930/1994 — Crimes hediondos",
      "Lei 12.850/2013 — Organização criminosa",
      "Lei 9.455/1997 — Tortura",
      "Lei 9.605/1998 — Crimes ambientais",
      "Lei 10.826/2003 — Estatuto do Desarmamento",
      "Lei 11.343/2006 — Drogas",
      "Lei 11.340/2006 — Maria da Penha",
      "Lei 9.503/1997 — Código de Trânsito Brasileiro",
      "Lei 8.069/1990 — ECA",
      "Lei 13.869/2019 — Abuso de autoridade",
      "Lei 7.960/1989 — Prisão temporária",
      "Leis 9.099/1995 e 10.259/2001 — Juizados Especiais"
    ]
  },
  {
    "slug": "dh",
    "nome": "Direitos Humanos",
    "icone": "🕊️",
    "topicos": [
      "Teoria geral: conceito, terminologia, estrutura normativa e fundamentação",
      "Afirmação histórica e evolução dos direitos humanos",
      "Direitos humanos e responsabilidade do Estado",
      "Direitos humanos na Constituição Federal",
      "Sistema de proteção e Política Nacional de Direitos Humanos",
      "Convenção Americana (Pacto de São José / Decreto 678/1992)"
    ]
  },
  {
    "slug": "mat_fin",
    "nome": "Matemática",
    "icone": "🔢",
    "topicos": [
      "Conjunto numérico: operações com inteiros, fracionários e decimais",
      "Proporções e divisão proporcional",
      "Regra de três simples e composta",
      "Porcentagem",
      "Juros simples",
      "Juros compostos; capitalização e descontos",
      "Taxas de juros: nominal, efetiva, equivalentes, proporcionais, real e aparente"
    ]
  },
  {
    "slug": "alagoas",
    "nome": "Conhecimentos do Estado de Alagoas",
    "icone": "🌴",
    "topicos": [
      "Formação histórica: colonização portuguesa e economia açucareira",
      "Emancipação de Pernambuco (1817) e elevação à Província (1821)",
      "Quilombo dos Palmares: formação, resistência e Zumbi",
      "Aspectos geográficos: Litoral, Zona da Mata, Agreste e Sertão",
      "Rio São Francisco",
      "Organização político-administrativa: Maceió, municípios, Poderes",
      "Economia estadual: agroindústria canavieira, turismo e serviços",
      "Cultura e patrimônio histórico-cultural alagoano"
    ]
  },
  {
    "slug": "atualidades",
    "nome": "Atualidades (discursiva)",
    "icone": "🗞️",
    "topicos": [
      "Segurança pública e violência",
      "Política e economia",
      "Sociedade, educação e saúde",
      "Tecnologia e energia",
      "Meio ambiente e desenvolvimento sustentável"
    ]
  },
  {
    "slug": "legpm",
    "nome": "Legislação PM de Alagoas",
    "icone": "🎖️",
    "topicos": [
      "Lei 5.346/1992 — Estatuto dos Policiais Militares de AL",
      "Decreto 37.042/1996 — Regulamento Disciplinar da PMAL",
      "Lei 14.751/2023 — Lei Orgânica das Polícias Militares"
    ]
  },
  {
    "slug": "dpm",
    "nome": "Direito Penal Militar",
    "icone": "🪖",
    "topicos": [
      "Aplicação da lei penal militar",
      "Crime e imputabilidade penal",
      "Concurso de agentes",
      "Penas: principais, acessórias e aplicação da pena",
      "Efeitos da condenação e medidas de segurança",
      "Ação penal e extinção da punibilidade",
      "Crimes militares em tempo de paz",
      "Crimes propriamente militares, impropriamente militares e por extensão"
    ]
  },
  {
    "slug": "dppm",
    "nome": "Direito Processual Penal Militar",
    "icone": "🛡️",
    "topicos": [
      "Processo Penal Militar e sua aplicação",
      "Polícia judiciária militar",
      "Inquérito policial militar (IPM)",
      "Ação penal militar e seu exercício",
      "Prisão em flagrante e prisão preventiva",
      "Menagem e liberdade provisória",
      "Processos especiais: deserção e insubmissão",
      "Conselho Permanente e Conselho Especial de Justiça"
    ]
  },
  {
    "slug": "dpenal",
    "nome": "Direito Penal",
    "icone": "🔗",
    "topicos": [
      "Aplicação da lei penal: princípios; lei penal no tempo e no espaço",
      "Tempo e lugar do crime; lei excepcional, especial e temporária",
      "Contagem de prazo; irretroatividade da lei penal",
      "Crimes contra a pessoa",
      "Crimes contra o patrimônio",
      "Crimes contra a administração pública",
      "Disposições constitucionais aplicáveis ao direito penal"
    ]
  },
  {
    "slug": "ti_seg",
    "nome": "TI e Segurança Cibernética",
    "icone": "🖥️",
    "topicos": [
      "Sistemas operacionais (Linux e Windows)",
      "Pacote Microsoft Office; navegadores; Outlook; nuvem",
      "Redes de computadores; Internet e intranet",
      "Segurança da informação: vírus, worms, backup, antivírus, firewall",
      "Banco de dados; SQL; SGBD; integridade e segurança",
      "Lei 13.709/2018 (LGPD); serviços públicos digitais; IA",
      "Linguagens de programação (Java, Python, Apex, C#)",
      "Fundamentos de segurança (confidencialidade, integridade, disponibilidade)",
      "Gestão de riscos, conformidade e políticas de segurança",
      "Segurança de rede: firewall, IDS/IPS, VPN, segmentação",
      "Criptografia; assinatura e certificação digital",
      "Gestão de identidade e acesso: SSO, SAML, OAuth2, OpenID",
      "Ataques, vulnerabilidades e tratamento de incidentes",
      "Frameworks: MITRE, CIS Controls, NIST CSF; SIEM, IAM, PAM"
    ]
  },
  {
    "slug": "rlm",
    "nome": "Raciocínio Lógico-Matemático",
    "icone": "🧮",
    "topicos": [
      "Princípios de contagem e probabilidade",
      "Razões, proporções e regra de três simples",
      "Porcentagens",
      "Equações de 1º e 2º graus; sequências numéricas",
      "Progressões aritméticas e geométricas",
      "Funções e gráficos",
      "Estruturas lógicas e lógica de argumentação",
      "Lógica proposicional: proposições, tabelas-verdade, equivalências",
      "Leis de De Morgan e diagramas lógicos",
      "Lógica de primeira ordem",
      "Operações com conjuntos",
      "Problemas aritméticos, geométricos e matriciais"
    ]
  },
  {
    "slug": "etica",
    "nome": "Ética no Serviço Público",
    "icone": "⚖️",
    "topicos": [
      "Ética e moral; princípios e valores",
      "Ética e democracia: exercício da cidadania",
      "Ética e função pública; ética no setor público",
      "Lei estadual 6.754/2006 (Código de Ética Funcional do Servidor de AL)"
    ]
  },
  {
    "slug": "leg_al_pc",
    "nome": "Legislação Institucional de Alagoas",
    "icone": "📗",
    "topicos": [
      "Constituição do Estado de Alagoas",
      "Lei estadual 3.437/1975 (Estatuto da Polícia Civil de AL)",
      "Lei estadual 5.247/1991 (Regime Jurídico Único dos Servidores de AL)",
      "Lei 14.735/2026 (Lei Orgânica Nacional das Polícias Civis)",
      "Leis estaduais 6.441/2003, 6.276/2001, 6.479/2004 e 4.590/1984",
      "Lei 10.826/2003 (Estatuto do Desarmamento)"
    ]
  },
  {
    "slug": "leis_pc",
    "nome": "Legislação Penal Especial",
    "icone": "⚖️",
    "topicos": [
      "Crimes contra as finanças públicas",
      "Lei 11.343/2006 (Drogas)",
      "Lei 12.850/2013 (Organização criminosa)",
      "Lei 7.492/1986 (Crimes contra o Sistema Financeiro Nacional)",
      "Lei 8.137/1990 (Crimes contra a ordem econômica e tributária)",
      "Lei 9.613/1998 (Lavagem de dinheiro)",
      "Lei 8.072/1990 (Crimes hediondos)",
      "Lei 7.716/1989 (Racismo) e Lei 9.455/1997 (Tortura)",
      "Lei 9.605/1998 (Crimes ambientais)",
      "Crimes de responsabilidade (DL 201/1967; Lei 1.079/1950)",
      "Lei 11.101/2005 (Crimes falimentares)",
      "Lei 14.133/2021 (Crimes em licitações e contratos)",
      "Lei 13.869/2019 (Abuso de autoridade)",
      "Convenção de Budapeste (Dec. 11.491/2023)",
      "Lei 13.146/2015 (Estatuto da Pessoa com Deficiência) e Lei 10.741/2003 (Idoso)"
    ]
  },
  {
    "slug": "conta",
    "nome": "Contabilidade, Análise Financeira e Ordem Tributária",
    "icone": "📊",
    "topicos": [
      "Conceitos, objetivos e finalidades da contabilidade",
      "Patrimônio: componentes, equação fundamental e situação líquida",
      "Atos e fatos administrativos (permutativos, modificativos e mistos)",
      "Contas, plano de contas e contabilização de operações",
      "Análise e conciliações contábeis; balancete de verificação",
      "Balanço patrimonial e Demonstração do Resultado do Exercício (DRE)",
      "Noções de finanças, orçamento e tributos",
      "Análise financeira: métodos, ferramentas e gestão de risco",
      "Lei 9.613/1998 (lavagem) e Lei 8.137/1990 (ordem tributária)",
      "Indícios de fraude: smurfing, laranjas, movimentações incompatíveis"
    ]
  },
  {
    "slug": "estat",
    "nome": "Estatística e Análise de Dados",
    "icone": "📈",
    "topicos": [
      "Estatística descritiva: gráficos, tabelas e medidas descritivas",
      "Medidas de tendência central e de dispersão",
      "Probabilidade: condicional, Bayes e teorema da probabilidade total",
      "Variáveis aleatórias e distribuições (Bernoulli, binomial, normal)",
      "Teorema central do limite e técnicas de amostragem",
      "Inferência: estimação e testes de hipóteses (t de Student, qui-quadrado)",
      "Correlação de Pearson e regressão linear",
      "Dados estruturados/não estruturados; ETL; XML, JSON, CSV",
      "Mineração de dados, clusterização e modelagem preditiva",
      "Machine Learning e Python (Pandas, Numpy, Sklearn, TensorFlow)"
    ]
  },
  {
    "slug": "ciber",
    "nome": "Crimes Cibernéticos e Segurança Digital",
    "icone": "🛰️",
    "topicos": [
      "Lei 12.737/2012 (crimes cibernéticos)",
      "Conceito e classificação de crimes cibernéticos",
      "Busca e apreensão de itens digitais (art. 240 e ss. do CPP)",
      "Privacidade e cuidados com redes sociais",
      "Autenticação multifator (MFA) e senhas seguras",
      "Golpes virtuais: phishing, links suspeitos e malwares",
      "Lei 13.709/2018 (LGPD)"
    ]
  }
];

export const SEED_CONCURSOS: SeedConcurso[] = [
  {
    "slug": "pmal_soldado",
    "nome": "PMAL 2026 — Soldado (CFP)",
    "nomeCurto": "PMAL · Soldado",
    "orgao": "Polícia Militar de Alagoas",
    "banca": "Cebraspe",
    "status": "ativo",
    "icone": "🎖️",
    "cor": "#e0a83e",
    "dataProva": "2026-07-19",
    "notaData": "Cronograma do Edital nº 1 – PMAL (19/03/2026).",
    "duracaoProva": "4h30",
    "ordem": 0,
    "estrutura": [
      {
        "prova": "P1 — Objetiva",
        "area": "Conhecimentos Básicos",
        "itens": 50,
        "carater": "Eliminatório e classificatório"
      },
      {
        "prova": "P2 — Objetiva",
        "area": "Conhecimentos Específicos",
        "itens": 70,
        "carater": "Eliminatório e classificatório"
      },
      {
        "prova": "P3 — Discursiva",
        "area": "Redação (dissertativo, até 30 linhas — 30 pts)",
        "itens": null,
        "carater": "Eliminatório e classificatório"
      },
      {
        "prova": "TAF",
        "area": "Teste de Aptidão Física",
        "itens": null,
        "carater": "Eliminatório"
      },
      {
        "prova": "Demais fases",
        "area": "Médica, Psicológica, Investigação Social, Toxicológico",
        "itens": null,
        "carater": "Eliminatório"
      }
    ],
    "materias": [
      {
        "materiaSlug": "portugues",
        "area": "P1",
        "peso": 18,
        "ordem": 0
      },
      {
        "materiaSlug": "mat_fin",
        "area": "P1",
        "peso": 12,
        "ordem": 1
      },
      {
        "materiaSlug": "informatica",
        "area": "P1",
        "peso": 10,
        "ordem": 2
      },
      {
        "materiaSlug": "alagoas",
        "area": "P1",
        "peso": null,
        "ordem": 3
      },
      {
        "materiaSlug": "atualidades",
        "area": "P1",
        "peso": null,
        "ordem": 4
      },
      {
        "materiaSlug": "legpm",
        "area": "P2",
        "peso": null,
        "ordem": 5
      },
      {
        "materiaSlug": "leis",
        "area": "P2",
        "peso": 16,
        "ordem": 6
      },
      {
        "materiaSlug": "dadm",
        "area": "P2",
        "peso": 8,
        "ordem": 7
      },
      {
        "materiaSlug": "dconst",
        "area": "P2",
        "peso": 8,
        "ordem": 8
      },
      {
        "materiaSlug": "dpp",
        "area": "P2",
        "peso": null,
        "ordem": 9
      },
      {
        "materiaSlug": "dpm",
        "area": "P2",
        "peso": 12,
        "ordem": 10
      },
      {
        "materiaSlug": "dppm",
        "area": "P2",
        "peso": null,
        "ordem": 11
      },
      {
        "materiaSlug": "dh",
        "area": "P2",
        "peso": null,
        "ordem": 12
      }
    ]
  },
  {
    "slug": "pc_al",
    "nome": "PC AL 2026 — Escrivão de Polícia Civil",
    "nomeCurto": "PC AL · Escrivão",
    "orgao": "Polícia Civil de Alagoas",
    "banca": "Cebraspe",
    "status": "ativo",
    "icone": "🚔",
    "cor": "#4f9dde",
    "dataProva": "2026-12-06",
    "notaData": "Cronograma do edital PC AL 2026 (prova em 06/12/2026). O conteúdo específico é o mesmo para Agente e Escrivão.",
    "duracaoProva": "4h30",
    "ordem": 1,
    "estrutura": [
      {
        "prova": "P1 — Objetiva",
        "area": "Conhecimentos Básicos",
        "itens": 50,
        "carater": "Eliminatório e classificatório"
      },
      {
        "prova": "P2 — Objetiva",
        "area": "Conhecimentos Específicos",
        "itens": 70,
        "carater": "Eliminatório e classificatório"
      },
      {
        "prova": "P3 — Discursiva",
        "area": "Redação sobre Atualidades (até 30 linhas — 5 pts)",
        "itens": 1,
        "carater": "Eliminatório e classificatório"
      },
      {
        "prova": "Prova prática de digitação",
        "area": "Específica do Escrivão",
        "itens": null,
        "carater": "Eliminatório"
      },
      {
        "prova": "Capacidade física + exames + psicológico + investigação",
        "area": "Demais fases da 1ª etapa",
        "itens": null,
        "carater": "Eliminatório"
      },
      {
        "prova": "Curso de formação policial (2ª etapa)",
        "area": "—",
        "itens": null,
        "carater": "Eliminatório e classificatório"
      }
    ],
    "materias": [
      {
        "materiaSlug": "portugues",
        "area": "P1",
        "peso": 15,
        "ordem": 0
      },
      {
        "materiaSlug": "ti_seg",
        "area": "P1",
        "peso": 12,
        "ordem": 1
      },
      {
        "materiaSlug": "rlm",
        "area": "P1",
        "peso": 12,
        "ordem": 2
      },
      {
        "materiaSlug": "dh",
        "area": "P1",
        "peso": null,
        "ordem": 3
      },
      {
        "materiaSlug": "atualidades",
        "area": "P1",
        "peso": null,
        "ordem": 4
      },
      {
        "materiaSlug": "etica",
        "area": "P1",
        "peso": null,
        "ordem": 5
      },
      {
        "materiaSlug": "dpenal",
        "area": "P2",
        "peso": 10,
        "ordem": 6
      },
      {
        "materiaSlug": "dpp",
        "area": "P2",
        "peso": 8,
        "ordem": 7
      },
      {
        "materiaSlug": "dconst",
        "area": "P2",
        "peso": 6,
        "ordem": 8
      },
      {
        "materiaSlug": "dadm",
        "area": "P2",
        "peso": 8,
        "ordem": 9
      },
      {
        "materiaSlug": "leg_al_pc",
        "area": "P2",
        "peso": 8,
        "ordem": 10
      },
      {
        "materiaSlug": "leis_pc",
        "area": "P2",
        "peso": 10,
        "ordem": 11
      },
      {
        "materiaSlug": "conta",
        "area": "P2",
        "peso": null,
        "ordem": 12
      },
      {
        "materiaSlug": "estat",
        "area": "P2",
        "peso": 8,
        "ordem": 13
      },
      {
        "materiaSlug": "ciber",
        "area": "P2",
        "peso": 4,
        "ordem": 14
      }
    ]
  }
];

export const SEED_FERRAMENTAS = [
  { titulo: "Qconcursos", url: "https://www.qconcursos.com", icone: "❓", ordem: 0 },
  { titulo: "Google AI Studio", url: "https://aistudio.google.com", icone: "✨", ordem: 1 },
  { titulo: "PDF do Edital PMAL", url: "https://www.cebraspe.org.br/concursos/pm_al_25_soldado", icone: "📄", ordem: 2 },
];
