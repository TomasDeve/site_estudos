/* ============================================================
   PMAL 2026 — Soldado do Quadro de Praças (CFP) | Banca: Cebraspe
   Base: Edital nº 1 – PMAL, de 19/03/2026
   Todos os dados do site vivem aqui (window.DATA).
   ============================================================ */
window.DATA = {

  concurso: {
    nome: "PMAL 2026 — Soldado do Quadro de Praças (CFP)",
    banca: "Cebraspe",
    edital: "Edital nº 1 – PMAL, de 19/03/2026",
    // Data oficial no cronograma do edital. Editável pelo usuário no site.
    dataProvaOficial: "2026-07-19",
    remuneracao: "R$ 4.116,34 (Soldado) — vide edital",
    // Estilo da banca
    estilo: "Itens de Certo/Errado — cada item errado ANULA um item certo (penalidade)."
  },

  // Estrutura oficial das fases (quadro do item 7 do edital)
  estrutura: [
    { prova: "P1 — Objetiva", area: "Conhecimentos Básicos", itens: 50, carater: "Eliminatório e classificatório" },
    { prova: "P2 — Objetiva", area: "Conhecimentos Específicos", itens: 70, carater: "Eliminatório e classificatório" },
    { prova: "P3 — Discursiva", area: "Redação (dissertativo, até 30 linhas — 30 pts)", itens: null, carater: "Eliminatório e classificatório" },
    { prova: "TAF", area: "Teste de Aptidão Física", itens: null, carater: "Eliminatório" },
    { prova: "Demais fases", area: "Médica, Psicológica, Investigação Social, Toxicológico", itens: null, carater: "Eliminatório" }
  ],

  duracaoProva: "4h30 (turno da tarde para Soldado)",

  /* Peso ESTIMADO por matéria (o edital só informa 50 básicos / 70 específicos).
     Estimativa baseada em provas anteriores da Cebraspe para carreiras policiais.
     Use como bússola de prioridade, não como número oficial. */
  pesos: [
    { materia: "Língua Portuguesa",              area: "P1", qEst: 18, cor: "#4f9dde" },
    { materia: "Matemática (financeira)",         area: "P1", qEst: 12, cor: "#4f9dde" },
    { materia: "Noções de Informática",           area: "P1", qEst: 10, cor: "#4f9dde" },
    { materia: "Conhecimentos de Alagoas",        area: "P1", qEst: 10, cor: "#4f9dde" },
    { materia: "Legislação especial (leis)",      area: "P2", qEst: 16, cor: "#e0a83e" },
    { materia: "Legislação PM (Estatuto/RDPM)",   area: "P2", qEst: 12, cor: "#e0a83e" },
    { materia: "Direito Penal Militar",           area: "P2", qEst: 12, cor: "#e0a83e" },
    { materia: "Direito Processual Penal Militar",area: "P2", qEst: 10, cor: "#e0a83e" },
    { materia: "Direito Constitucional",          area: "P2", qEst:  8, cor: "#e0a83e" },
    { materia: "Direito Administrativo",          area: "P2", qEst:  8, cor: "#e0a83e" },
    { materia: "Direito Processual Penal + DH",   area: "P2", qEst:  4, cor: "#e0a83e" }
  ],

  /* ===========================================================
     EDITAL VERTICALIZADO — cada folha vira um checkbox de progresso
     status por tópico: 0 não estudado, 1 estudando, 2 revisar, 3 dominado
     =========================================================== */
  edital: [
    /* ---------------- P1 — CONHECIMENTOS BÁSICOS ---------------- */
    {
      id: "port", area: "P1", nome: "Língua Portuguesa", icone: "📖",
      topicos: [
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
      id: "mat", area: "P1", nome: "Matemática", icone: "🔢",
      topicos: [
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
      id: "info", area: "P1", nome: "Noções de Informática", icone: "💻",
      topicos: [
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
      id: "al", area: "P1", nome: "Conhecimentos do Estado de Alagoas", icone: "🌴",
      topicos: [
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
      id: "atu", area: "P1", nome: "Atualidades (só na discursiva)", icone: "🗞️",
      topicos: [
        "Segurança pública e violência",
        "Política e economia",
        "Sociedade, educação e saúde",
        "Tecnologia e energia",
        "Meio ambiente e desenvolvimento sustentável"
      ]
    },

    /* ---------------- P2 — CONHECIMENTOS ESPECÍFICOS ---------------- */
    {
      id: "legpm", area: "P2", nome: "Legislação PM de Alagoas", icone: "🎖️",
      topicos: [
        "Lei 5.346/1992 — Estatuto dos Policiais Militares de AL",
        "Decreto 37.042/1996 — Regulamento Disciplinar da PMAL",
        "Lei 14.751/2023 — Lei Orgânica das Polícias Militares"
      ]
    },
    {
      id: "leis", area: "P2", nome: "Legislação Penal Especial", icone: "⚖️",
      topicos: [
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
      id: "dadm", area: "P2", nome: "Direito Administrativo", icone: "🏛️",
      topicos: [
        "Princípios da administração pública",
        "Regime jurídico administrativo",
        "Poderes da administração (poder de polícia)",
        "Serviço público",
        "Atos administrativos",
        "Contratos administrativos e licitação",
        "Bens públicos",
        "Administração direta e indireta",
        "Controle da administração pública",
        "Responsabilidade do Estado"
      ]
    },
    {
      id: "dconst", area: "P2", nome: "Direito Constitucional", icone: "📜",
      topicos: [
        "Direitos e garantias fundamentais (art. 5º)",
        "Remédios constitucionais (HC, MS, MI, habeas data)",
        "Estrutura e organização do Estado brasileiro",
        "Defesa do Estado e das instituições democráticas; segurança pública (art. 144)"
      ]
    },
    {
      id: "dpp", area: "P2", nome: "Direito Processual Penal", icone: "🔎",
      topicos: [
        "Inquérito policial",
        "Ação penal"
      ]
    },
    {
      id: "dpm", area: "P2", nome: "Direito Penal Militar", icone: "🪖",
      topicos: [
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
      id: "dppm", area: "P2", nome: "Direito Processual Penal Militar", icone: "🛡️",
      topicos: [
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
      id: "dh", area: "P2", nome: "Direitos Humanos", icone: "🕊️",
      topicos: [
        "Conceito, evolução e abrangência",
        "Sistema de proteção dos direitos humanos",
        "Convenção Americana (Pacto de São José / Decreto 678/1992)"
      ]
    }
  ],

  /* ===========================================================
     PLANO DE 55 DIAS — sessões de estudo (backlog) já ordenadas
     e interleaveadas (pesado x leve). O gerador em app.js
     distribui nos dias, inserindo simulados e a reta final.
     tipo: 'sessao' (matéria) | app injeta 'diagnostico'/'simulado'/'vespera'
     =========================================================== */
  sessoes: [
    { editalId:"dconst", area:"P2", titulo:"Constitucional — Direitos e garantias fundamentais (art. 5º) — parte I",
      tarefas:["Ler art. 5º, incisos I–XL (grifar)","Fazer 15 questões C/E","Anotar 5 pontos que mais caem"] },
    { editalId:"port", area:"P1", titulo:"Português — Interpretação de texto + tipos e gêneros textuais",
      tarefas:["Revisar estratégia de leitura Cebraspe","15 questões de interpretação","Ler 1 texto e resumir a tese"] },
    { editalId:"legpm", area:"P2", titulo:"Estatuto dos PM de AL (Lei 5.346/1992) — hierarquia, disciplina e deveres",
      tarefas:["Ler Títulos iniciais + hierarquia/postos","Mapa mental de hierarquia PM","15 questões C/E"] },
    { editalId:"mat", area:"P1", titulo:"Matemática — Conjuntos numéricos, operações, razão e proporção",
      tarefas:["Revisar frações e decimais","10 exercícios de proporção","Divisão proporcional (direta/inversa)"] },
    { editalId:"dconst", area:"P2", titulo:"Constitucional — Direitos e garantias (art. 5º) parte II + remédios constitucionais",
      tarefas:["HC, MS, MI e habeas data (cabimento)","Tabela comparativa dos remédios","15 questões C/E"] },
    { editalId:"dadm", area:"P2", titulo:"Administrativo — Princípios (LIMPE) e regime jurídico",
      tarefas:["Princípios expressos e implícitos","Supremacia e indisponibilidade do interesse público","15 questões C/E"] },

    { editalId:"dadm", area:"P2", titulo:"Administrativo — Poderes da administração e poder de polícia",
      tarefas:["Poderes: hierárquico, disciplinar, regulamentar, de polícia","Atributos do poder de polícia","15 questões C/E"] },
    { editalId:"port", area:"P1", titulo:"Português — Ortografia, acentuação e crase",
      tarefas:["Regras de crase (casos obrigatórios/proibidos)","20 itens de crase","Lista de acentuação gráfica"] },
    { editalId:"legpm", area:"P2", titulo:"Regulamento Disciplinar da PMAL (Decreto 37.042/1996)",
      tarefas:["Transgressões disciplinares e classificação","Punições e circunstâncias","15 questões C/E"] },
    { editalId:"info", area:"P1", titulo:"Informática — Windows e gerenciamento de arquivos",
      tarefas:["Atalhos e Explorer de Arquivos","Organização de pastas/arquivos","15 questões C/E"] },
    { editalId:"dpm", area:"P2", titulo:"Penal Militar — Aplicação da lei penal militar e crime",
      tarefas:["Lei penal militar no tempo/espaço","Conceito de crime militar","15 questões C/E"] },
    { editalId:"mat", area:"P1", titulo:"Matemática — Regra de três simples e composta + porcentagem",
      tarefas:["Grandezas direta/inversamente proporcionais","15 exercícios mistos","Porcentagem: aumento/desconto sucessivos"] },

    { editalId:"dpm", area:"P2", titulo:"Penal Militar — Imputabilidade, concurso de agentes e penas",
      tarefas:["Imputabilidade e concurso de pessoas","Penas principais e acessórias","15 questões C/E"] },
    { editalId:"dconst", area:"P2", titulo:"Constitucional — Organização do Estado + Segurança Pública (art. 144)",
      tarefas:["Competências e federação","Art. 144: órgãos e atribuições da PM","15 questões C/E"] },
    { editalId:"leis", area:"P2", titulo:"Lei de Drogas (11.343/2006)",
      tarefas:["Art. 28 x art. 33 (usuário x traficante)","Causas de aumento e figuras equiparadas","20 questões C/E"] },
    { editalId:"port", area:"P1", titulo:"Português — Classes de palavras e morfossintaxe",
      tarefas:["Funções sintáticas dos termos","Verbo, pronome, conjunção (uso)","15 questões C/E"] },
    { editalId:"dppm", area:"P2", titulo:"Processo Penal Militar — PPM, polícia judiciária militar e IPM",
      tarefas:["Atribuições da polícia judiciária militar","Fases do IPM","15 questões C/E"] },
    { editalId:"info", area:"P1", titulo:"Informática — MS Office (Word, Excel e PowerPoint)",
      tarefas:["Fórmulas e funções básicas do Excel","Recursos do Word","15 questões C/E"] },

    { editalId:"leis", area:"P2", titulo:"Estatuto do Desarmamento (10.826/2003)",
      tarefas:["Posse x porte ilegal","Crimes e penas; SINARM","20 questões C/E"] },
    { editalId:"dadm", area:"P2", titulo:"Administrativo — Atos administrativos",
      tarefas:["Requisitos, atributos e classificação","Anulação, revogação, convalidação","15 questões C/E"] },
    { editalId:"mat", area:"P1", titulo:"Matemática — Juros simples",
      tarefas:["Fórmula J = C·i·t","15 problemas variando a incógnita","Converter taxas e tempos"] },
    { editalId:"dpm", area:"P2", titulo:"Penal Militar — Crimes militares em tempo de paz e classificação",
      tarefas:["Próprios, impróprios e por extensão","Efeitos da condenação e medidas de segurança","15 questões C/E"] },
    { editalId:"legpm", area:"P2", titulo:"Lei Orgânica das PM (Lei 14.751/2023)",
      tarefas:["Princípios e competências da PM","Pontos que dialogam com o art. 144 CF","15 questões C/E"] },
    { editalId:"al", area:"P1", titulo:"Alagoas — Formação histórica e Quilombo dos Palmares",
      tarefas:["Colonização, açúcar e emancipação","Palmares, resistência e Zumbi","15 questões C/E"] },

    { editalId:"leis", area:"P2", titulo:"Lei Maria da Penha (11.340/2006) + ECA (8.069/1990)",
      tarefas:["Medidas protetivas de urgência","Formas de violência doméstica","ECA: ato infracional e medidas","20 questões C/E"] },
    { editalId:"dppm", area:"P2", titulo:"Processo Penal Militar — Prisões, menagem e liberdade provisória",
      tarefas:["Prisão em flagrante x preventiva","Menagem (conceito e cabimento)","15 questões C/E"] },
    { editalId:"port", area:"P1", titulo:"Português — Concordância verbal e nominal",
      tarefas:["Casos especiais de concordância verbal","Concordância nominal (regras)","20 questões C/E"] },
    { editalId:"leis", area:"P2", titulo:"Abuso de autoridade (13.869/2019) + Tortura (9.455/1997)",
      tarefas:["Sujeitos e dolo específico no abuso","Condutas típicas de tortura","20 questões C/E"] },
    { editalId:"info", area:"P1", titulo:"Informática — Redes, Internet, navegadores e Outlook",
      tarefas:["Internet x intranet; protocolos básicos","Navegadores e correio eletrônico","15 questões C/E"] },
    { editalId:"dppm", area:"P2", titulo:"Processo Penal Militar — Deserção, insubmissão e Conselhos de Justiça",
      tarefas:["Deserção de praça x insubmissão","Conselho Permanente x Especial de Justiça","15 questões C/E"] },

    { editalId:"dpp", area:"P2", titulo:"Processo Penal — Inquérito policial e ação penal",
      tarefas:["Características do IP","Ação penal pública x privada","15 questões C/E"] },
    { editalId:"mat", area:"P1", titulo:"Matemática — Juros compostos, capitalização e descontos",
      tarefas:["Fórmula M = C·(1+i)ⁿ","Simples x composto (comparar)","Descontos comercial/racional"] },
    { editalId:"leis", area:"P2", titulo:"Hediondos (8.072/90) + Organização criminosa (12.850/13) + Prisão temporária (7.960/89)",
      tarefas:["Rol de crimes hediondos e efeitos","Colaboração premiada e infiltração","Prazos da prisão temporária","20 questões C/E"] },
    { editalId:"dh", area:"P2", titulo:"Direitos Humanos — Conceito, evolução e sistema de proteção",
      tarefas:["Gerações/dimensões de direitos","Características dos DH","15 questões C/E"] },
    { editalId:"al", area:"P1", titulo:"Alagoas — Geografia e organização político-administrativa",
      tarefas:["Regiões: Litoral, Mata, Agreste, Sertão","Rio São Francisco; Maceió capital","15 questões C/E"] },
    { editalId:"dadm", area:"P2", titulo:"Administrativo — Serviço público, bens públicos e administração indireta",
      tarefas:["Autarquias, fundações, EP e SEM","Bens públicos (classificação)","15 questões C/E"] },

    { editalId:"leis", area:"P2", titulo:"CTB (9.503/1997) + Racismo (7.716/89) + Crimes ambientais (9.605/98)",
      tarefas:["Crimes de trânsito e penas","Injúria racial x racismo","Crimes ambientais relevantes","20 questões C/E"] },
    { editalId:"dh", area:"P2", titulo:"Direitos Humanos — Pacto de São José da Costa Rica (Dec. 678/1992)",
      tarefas:["Direitos protegidos na Convenção","Prisão civil e devido processo","15 questões C/E"] },
    { editalId:"port", area:"P1", titulo:"Português — Regência, colocação pronominal e pontuação",
      tarefas:["Regência verbal (verbos que mais caem)","Próclise/mesóclise/ênclise","Pontuação: vírgula","20 questões C/E"] },
    { editalId:"leis", area:"P2", titulo:"Juizados Especiais (9.099/1995 e 10.259/2001)",
      tarefas:["Infrações de menor potencial ofensivo","Transação penal e composição civil","15 questões C/E"] },
    { editalId:"mat", area:"P1", titulo:"Matemática — Taxas de juros (nominal, efetiva, equivalentes, real)",
      tarefas:["Taxa nominal x efetiva","Taxas equivalentes/proporcionais","Taxa real x aparente"] },
    { editalId:"dadm", area:"P2", titulo:"Administrativo — Contratos, licitação, controle e responsabilidade do Estado",
      tarefas:["Licitação (visão geral) e contratos","Responsabilidade objetiva do Estado","15 questões C/E"] },

    { editalId:"info", area:"P1", titulo:"Informática — Segurança da informação e backup",
      tarefas:["Malware, vírus, worms, phishing","Antivírus, firewall; princípios (CID)","Backup e cloud storage","15 questões C/E"] },
    { editalId:"al", area:"P1", titulo:"Alagoas — Economia, cultura e patrimônio",
      tarefas:["Cana-de-açúcar, turismo e serviços","Manifestações culturais e patrimônio","15 questões C/E"] },
    { editalId:"legpm", area:"P2", titulo:"Revisão dirigida — Estatuto + RDPM (lei seca de alto rendimento)",
      tarefas:["Reler grifos do Estatuto e do RDPM","30 questões C/E encadeadas","Refazer os erros anteriores"] },
    { editalId:"port", area:"P1", titulo:"Português — Coesão, reescrita e emprego verbal",
      tarefas:["Conectores e referenciação","Reescrita mantendo o sentido","Tempos e modos verbais","20 questões C/E"] }
  ],

  /* ===========================================================
     BANCO DE QUESTÕES — estilo Cebraspe (Certo/Errado)
     gab: true = CERTO, false = ERRADO
     =========================================================== */
  questoes: [
    { editalId:"dconst", enunciado:"Conforme a CF/1988, a segurança pública é dever do Estado, direito e responsabilidade de todos, sendo exercida, entre outros, pelas polícias militares.", gab:true,
      just:"Art. 144, caput, CF. As polícias militares integram os órgãos de segurança pública." },
    { editalId:"dconst", enunciado:"Às polícias militares cabe a apuração de infrações penais comuns, função típica da polícia judiciária.", gab:false,
      just:"A apuração de infrações penais (polícia judiciária) cabe à polícia civil; à PM cabe o policiamento ostensivo e a preservação da ordem pública (art. 144, §5º)." },
    { editalId:"dconst", enunciado:"O habeas corpus é o remédio constitucional cabível para proteger o direito de locomoção diante de ilegalidade ou abuso de poder.", gab:true,
      just:"Art. 5º, LXVIII, CF — HC protege a liberdade de locomoção." },
    { editalId:"dconst", enunciado:"O mandado de segurança é cabível para amparar direito líquido e certo não protegido por habeas corpus ou habeas data.", gab:true,
      just:"Art. 5º, LXIX, CF — caráter residual do MS em relação ao HC e ao habeas data." },

    { editalId:"dadm", enunciado:"São princípios expressos da administração pública, no art. 37 da CF, a legalidade, a impessoalidade, a moralidade, a publicidade e a eficiência.", gab:true,
      just:"O famoso LIMPE — art. 37, caput, CF." },
    { editalId:"dadm", enunciado:"O poder de polícia caracteriza-se, entre outros atributos, pela autoexecutoriedade, o que permite à administração, em regra, executar seus atos sem prévia autorização judicial.", gab:true,
      just:"Atributos do poder de polícia: discricionariedade, autoexecutoriedade e coercibilidade." },
    { editalId:"dadm", enunciado:"A revogação do ato administrativo, por razões de conveniência e oportunidade, produz efeitos retroativos (ex tunc).", gab:false,
      just:"A revogação opera efeitos ex nunc (prospectivos). Quem opera ex tunc é a anulação (ato ilegal)." },
    { editalId:"dadm", enunciado:"A responsabilidade civil do Estado por atos comissivos de seus agentes é, em regra, objetiva, dispensando a prova de dolo ou culpa.", gab:true,
      just:"Art. 37, §6º, CF — teoria do risco administrativo (responsabilidade objetiva)." },

    { editalId:"legpm", enunciado:"A hierarquia e a disciplina são as bases institucionais das polícias militares, organizadas com fundamento nesses pilares.", gab:true,
      just:"Art. 42 c/c art. 142, §3º, CF, e Estatuto dos Militares — hierarquia e disciplina como bases." },
    { editalId:"legpm", enunciado:"No âmbito do Regulamento Disciplinar, a transgressão disciplinar e o crime militar possuem a mesma natureza e são apurados pelo mesmo procedimento.", gab:false,
      just:"Transgressão disciplinar (administrativa) não se confunde com crime militar (penal); os procedimentos e as consequências são distintos." },

    { editalId:"dpm", enunciado:"Consideram-se crimes propriamente militares aqueles que só podem ser praticados por militar, por violarem deveres específicos da função.", gab:true,
      just:"Crime propriamente militar exige a qualidade de militar do agente (ex.: deserção)." },
    { editalId:"dpm", enunciado:"A deserção é exemplo clássico de crime impropriamente militar, pois pode ser praticado por qualquer pessoa.", gab:false,
      just:"Deserção é crime PROPRIAMENTE militar — só o militar pode cometê-la." },

    { editalId:"dppm", enunciado:"O inquérito policial militar é peça de natureza inquisitorial, destinada a apurar a autoria e a materialidade de infração penal militar.", gab:true,
      just:"O IPM é procedimento administrativo, inquisitivo e preparatório da ação penal militar." },
    { editalId:"dppm", enunciado:"A menagem, no processo penal militar, é uma espécie de pena acessória imposta na sentença condenatória.", gab:false,
      just:"A menagem é medida assemelhada à liberdade provisória (espécie de prisão atenuada/liberdade vigiada), não é pena." },

    { editalId:"leis", enunciado:"Na Lei de Drogas, o usuário que adquire droga para consumo pessoal (art. 28) não está sujeito a pena privativa de liberdade.", gab:true,
      just:"O art. 28 prevê advertência, prestação de serviços à comunidade e medida educativa — não há pena de prisão." },
    { editalId:"leis", enunciado:"Segundo o Estatuto do Desarmamento, portar arma de fogo de uso permitido, sem autorização, fora de casa ou do trabalho, configura crime de porte ilegal.", gab:true,
      just:"Art. 14 da Lei 10.826/2003 — porte ilegal de arma de uso permitido." },
    { editalId:"leis", enunciado:"A Lei Maria da Penha admite a aplicação de penas de cesta básica ou outras de prestação pecuniária como resposta à violência doméstica.", gab:false,
      just:"Art. 17 da Lei 11.340/2006 veda expressamente penas de cesta básica ou pagamento isolado de multa." },
    { editalId:"leis", enunciado:"As medidas protetivas de urgência da Lei Maria da Penha podem ser concedidas de imediato pelo juiz, independentemente de audiência das partes.", gab:true,
      just:"Art. 19, §1º — podem ser concedidas de imediato, sem audiência e sem manifestação do MP." },

    { editalId:"dh", enunciado:"São características dos direitos humanos a universalidade, a indivisibilidade e a inalienabilidade.", gab:true,
      just:"Traços clássicos dos DH: universais, indivisíveis, interdependentes, imprescritíveis e inalienáveis." },
    { editalId:"dh", enunciado:"A Convenção Americana de Direitos Humanos (Pacto de São José) admite, como regra ampla, a prisão civil por dívida.", gab:false,
      just:"O Pacto de São José só admite prisão civil do devedor de alimentos; por isso o STF afastou a do depositário infiel (Súmula Vinculante 25)." },

    { editalId:"port", enunciado:"Na frase “Refiro-me àquele documento”, o uso do acento grave indicativo de crase está correto.", gab:true,
      just:"O verbo referir-se exige a preposição “a”, que se funde com o pronome “aquele”: a + aquele = àquele." },
    { editalId:"port", enunciado:"Em “Fazem dois anos que ele saiu”, a concordância verbal está correta.", gab:false,
      just:"O verbo “fazer” indicando tempo é impessoal: “Faz dois anos”. Correta a forma no singular." },
    { editalId:"port", enunciado:"Os pronomes átonos, em início de oração, na norma culta escrita, não devem iniciar a frase (evita-se a próclise sem palavra atrativa).", gab:true,
      just:"Não se inicia período com pronome oblíquo átono na norma padrão (ex.: “Me empresta” é evitado formalmente)." },

    { editalId:"mat", enunciado:"Um capital de R$ 1.000,00 aplicado a juros simples de 2% ao mês durante 5 meses rende R$ 100,00 de juros.", gab:true,
      just:"J = C·i·t = 1000 × 0,02 × 5 = 100." },
    { editalId:"mat", enunciado:"Um produto que custa R$ 200,00 e sofre dois descontos sucessivos de 10% passa a custar R$ 160,00.", gab:false,
      just:"Descontos sucessivos não somam: 200 × 0,9 × 0,9 = 162. O correto é R$ 162,00, não R$ 160,00." },
    { editalId:"mat", enunciado:"No regime de juros compostos, para uma mesma taxa e prazo maior que 1 período, o montante é maior do que no regime de juros simples.", gab:true,
      just:"Para t > 1, a capitalização composta supera a simples (crescimento exponencial x linear)." },

    { editalId:"info", enunciado:"Um firewall tem como função filtrar o tráfego de rede, permitindo ou bloqueando conexões conforme regras definidas.", gab:true,
      just:"Firewall controla tráfego de entrada/saída com base em regras de segurança." },
    { editalId:"info", enunciado:"Backup incremental copia todos os arquivos do sistema a cada execução, independentemente de terem sido alterados.", gab:false,
      just:"O incremental copia apenas o que mudou desde o último backup. Quem copia tudo é o backup completo (full)." },
    { editalId:"info", enunciado:"A computação em nuvem (cloud computing) permite o acesso a recursos de TI sob demanda por meio da Internet.", gab:true,
      just:"Definição básica de cloud computing — recursos sob demanda via rede." },

    { editalId:"al", enunciado:"O Quilombo dos Palmares, símbolo de resistência à escravidão, teve em Zumbi uma de suas principais lideranças.", gab:true,
      just:"Palmares localizava-se na região da Serra da Barriga (atual AL); Zumbi foi sua principal liderança." },
    { editalId:"al", enunciado:"Alagoas tornou-se independente da capitania de Pernambuco somente no século XX.", gab:false,
      just:"A emancipação de Pernambuco ocorreu em 1817, com elevação à condição de Província em 1821 — século XIX." },
    { editalId:"al", enunciado:"O rio São Francisco banha o estado de Alagoas e marca parte de sua divisa ao sul.", gab:true,
      just:"O São Francisco faz a divisa de AL com Sergipe (porção sul do estado)." },

    { editalId:"dpp", enunciado:"O inquérito policial é procedimento dispensável, podendo a ação penal ser proposta com base em outros elementos de convicção.", gab:true,
      just:"O IP é dispensável: se o titular da ação já dispõe de elementos, pode oferecer denúncia sem inquérito." },
    { editalId:"dpp", enunciado:"Na ação penal pública incondicionada, a atuação do Ministério Público depende de representação do ofendido.", gab:false,
      just:"Na incondicionada, o MP atua independentemente de representação; a representação é exigida na pública condicionada." }
  ],

  /* ===========================================================
     FLASHCARDS DE LEI SECA (alto rendimento)
     =========================================================== */
  flashcards: [
    { f:"Quais são os órgãos de segurança pública (art. 144, CF)?", v:"Polícia Federal; PRF; PFF (ferroviária); Polícias Civis; Polícias Militares e Corpos de Bombeiros Militares; Polícias Penais." },
    { f:"Qual a função das Polícias Militares (art. 144, §5º)?", v:"Polícia ostensiva e preservação da ordem pública. Bombeiros: defesa civil." },
    { f:"Bases institucionais das Forças Militares", v:"Hierarquia e Disciplina." },
    { f:"Princípios expressos da Administração (art. 37) — sigla", v:"LIMPE: Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência." },
    { f:"Atributos do poder de polícia", v:"Discricionariedade, Autoexecutoriedade e Coercibilidade." },
    { f:"Anulação x Revogação (efeitos)", v:"Anulação: ato ilegal, efeitos ex tunc (retroativos). Revogação: conveniência/oportunidade, efeitos ex nunc." },
    { f:"Responsabilidade civil do Estado (regra)", v:"Objetiva (risco administrativo) para atos comissivos — art. 37, §6º, CF." },
    { f:"HC x MS x MI x Habeas Data", v:"HC: locomoção; MS: direito líquido e certo (residual); MI: falta de norma regulamentadora; HD: acesso/retificação de informações pessoais." },
    { f:"Crime propriamente militar", v:"Só pode ser cometido por militar (ex.: deserção, insubmissão)." },
    { f:"Usuário de drogas (art. 28) — consequências", v:"Advertência, prestação de serviços à comunidade e medida educativa. NÃO há prisão." },
    { f:"Vedação da Lei Maria da Penha (art. 17)", v:"Proibidas penas de cesta básica, prestação pecuniária e multa isolada." },
    { f:"Prisão civil admitida pelo Pacto de São José", v:"Apenas do devedor de alimentos (afastada a do depositário infiel — SV 25)." },
    { f:"Porte x Posse (Estatuto do Desarmamento)", v:"Posse: dentro de casa/trabalho. Porte: fora desses locais. Ambos ilegais se sem autorização." },
    { f:"Menagem (PPM)", v:"Medida assemelhada à liberdade provisória / prisão atenuada — NÃO é pena." },
    { f:"Prazo da prisão temporária (regra x hediondos)", v:"5 dias + 5 (regra); 30 + 30 (crimes hediondos e equiparados)." },
    { f:"Infração de menor potencial ofensivo (JECrim)", v:"Contravenções e crimes com pena máxima não superior a 2 anos." },
    { f:"Emancipação e Província de Alagoas", v:"Separação de Pernambuco em 1817; elevação a Província em 1821." },
    { f:"Regiões geográficas de Alagoas", v:"Litoral, Zona da Mata, Agreste e Sertão. Rio São Francisco ao sul." }
  ],

  /* ===========================================================
     ESTRATÉGIA / DICAS
     =========================================================== */
  dicas: [
    { t:"Como a Cebraspe cobra (Certo/Errado)", c:"Cada item é uma afirmação para julgar CERTO ou ERRADO. Item errado ANULA um item certo. Só marque o que tiver segurança; em dúvida real, deixar em branco costuma ser mais seguro do que chutar." },
    { t:"Palavras que mudam tudo", c:"Fique atento a “sempre”, “nunca”, “somente”, “exclusivamente”, “é vedado”, “é obrigatório”. Generalizações absolutas costumam tornar o item ERRADO. Exceções à regra são o alvo predileto da banca." },
    { t:"Gestão de tempo (4h30)", c:"São 120 itens + redação. Reserve ~1h30 para a discursiva. Faça primeiro as matérias que você domina, marque as difíceis e volte depois. Não trave em um único item." },
    { t:"Peso está nos específicos", c:"São 70 itens de P2 contra 50 de P1. Direito e Legislação decidem a prova — priorize Estatuto/RDPM, Penal Militar, Proc. Penal Militar e as leis especiais (Drogas, Desarmamento, Maria da Penha)." },
    { t:"Lei seca + questões", c:"Para legislação, leia a lei seca grifando e resolva muitas questões da própria Cebraspe. A banca reescreve o texto legal trocando uma palavra — treine o olho para isso." },
    { t:"Revisão espaçada", c:"Revise cada assunto em 24h, 7 dias e 30 dias. Use os flashcards de lei seca deste site nas filas e nos intervalos. Repetição vence a curva do esquecimento." },
    { t:"Discursiva (30 pts)", c:"Redação dissertativo-argumentativa de até 30 linhas. Estruture: introdução (tese) + 2 parágrafos de desenvolvimento (argumento + repertório) + conclusão (proposta). Cuidado com fuga ao tema e com erros de norma culta (descontam)." },
    { t:"Não esqueça o TAF", c:"O Teste de Aptidão Física é eliminatório. Mantenha um mínimo de preparo físico (corrida, flexões, abdominais, barra) em paralelo aos estudos — deixar para depois da objetiva é arriscado." }
  ]
};
