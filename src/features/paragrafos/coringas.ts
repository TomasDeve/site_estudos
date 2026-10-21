// Os 6 coringas da redação: temas que entram em quase qualquer proposta de segurança
// pública. Cada um tem uma frase pronta por TIPO de aspecto — lido o aspecto, o tipo
// diz qual linha puxar, e 2 coringas diferentes dão os 2 pontos do parágrafo.
// Fatos conferidos com o PDF de Atualidades (Kit curinga) e a lei: segurança é "dever
// do Estado, direito e responsabilidade de todos" (CF, art. 144); segurança é direito
// social (CF, art. 6º); Polícia Civil = polícia judiciária (CF, art. 144, § 4º); o SUSP
// (Lei 13.675/2018) instituiu o Sinesp; Pacto pela Vida −quase 40% (avaliação da UFPE).

export type TipoAspecto = "cenario" | "causa" | "cons" | "sol" | "ex";

export const ROTULO_TIPO: Record<TipoAspecto, string> = {
  cenario: "Cenário / características",
  causa: "Causas / desafios",
  cons: "Consequências / impactos",
  sol: "Medidas / soluções",
  ex: "Exemplos",
};

/** O tipo do aspecto pelas palavras do enunciado (a ordem dos testes importa). */
export function tipoDoAspecto(aspecto: string): TipoAspecto {
  const a = aspecto.toLowerCase();
  if (/exemplo|modelo|experi[eê]ncia|iniciativa|programa|casos/.test(a)) return "ex";
  // "ações" só como palavra ("informações" e "organizações" não contam); "responsabilidades"
  // só no começo ("responsabilidades das plataformas…"), não em "divisão das responsabilidades".
  if (/medida|propost|estrat[eé]gia|caminho|(^|\s)a[cç][õo]es|papel|^responsabilidades|conciliar|cuidado|regras|limites/.test(a))
    return "sol";
  if (/causa|fator|obst[aá]culo|dificuldade|desafio|problema|ra[ií]zes/.test(a)) return "causa";
  if (/consequ[eê]ncia|impacto|risco|efeito/.test(a)) return "cons";
  return "cenario";
}

export interface Coringa {
  nome: string;
  /** Lei, artigo ou fonte para citar. */
  base: string;
  frases: Partial<Record<TipoAspecto, string>>;
}

export const CORINGAS: Coringa[] = [
  {
    nome: "SUSP",
    base: "Lei do SUSP (2018) · Lei 13.675/2018",
    frases: {
      cenario:
        "desde 2018, a Lei do SUSP organiza a segurança pública como um sistema único, com União, estados e municípios atuando juntos",
      causa: "as polícias ainda atuam de forma isolada, com sistemas e cadastros que não conversam entre si",
      cons: "sem integração, o criminoso escapa pelas brechas entre um estado e outro",
      sol: "efetivar o SUSP, com compartilhamento de dados, metas comuns e operações conjuntas entre os entes",
      ex: "o SUSP, criado em 2018, passou a integrar as forças de segurança do país e prevê um banco nacional de informações, o Sinesp",
    },
  },
  {
    nome: "Constituição",
    base: "CF/1988, arts. 5º, 6º e 144",
    frases: {
      cenario:
        "a Constituição de 1988 define a segurança pública como dever do Estado, direito e responsabilidade de todos",
      causa: "o dever do Estado, previsto na Constituição, nem sempre chega às periferias e às regiões mais pobres",
      cons: "a população perde a segurança, que a Constituição garante como direito social",
      sol: "cumprir a Constituição, com o Estado presente e a sociedade participando, já que a segurança é responsabilidade de todos",
    },
  },
  {
    nome: "Investigação e Polícia Civil",
    base: "CF, art. 144, § 4º · Instituto Sou da Paz",
    frases: {
      cenario: "apenas 1 em cada 3 homicídios é esclarecido no país, segundo o Instituto Sou da Paz",
      causa: "faltam policiais, peritos e estrutura, e por isso poucos crimes chegam a ser esclarecidos",
      cons: "a impunidade estimula novos crimes e enfraquece a confiança da população na polícia",
      sol: "fortalecer a Polícia Civil com perícia, inteligência e delegacias especializadas",
      ex: "o banco nacional de perfis genéticos tem ajudado a esclarecer crimes antigos ao cruzar o DNA dos vestígios",
    },
  },
  {
    nome: "Prevenção social",
    base: "Anuário Brasileiro de Segurança Pública",
    frases: {
      cenario: "a violência atinge sobretudo jovens, homens e negros das periferias, segundo o Anuário Brasileiro de Segurança Pública",
      causa: "a falta de escola, emprego e lazer nos bairros pobres deixa os jovens expostos ao aliciamento pelas facções",
      cons: "o país perde parte da sua juventude, e a violência se repete de geração em geração",
      sol: "investir em escola, esporte e emprego para os jovens, agindo antes que o crime aconteça",
      ex: "o programa Fica Vivo!, em Minas Gerais, atua na prevenção com jovens dos bairros mais violentos",
    },
  },
  {
    nome: "Tecnologia com regras",
    base: "Câmeras corporais · Córtex (Ministério da Justiça)",
    frases: {
      cenario: "a tecnologia mudou o crime, que migrou para o celular, e também a polícia, que passou a usar câmeras e bancos de dados",
      causa: "o crime se modernizou mais rápido do que a polícia, que ainda tem pouca estrutura de tecnologia",
      cons: "sem regras claras, a tecnologia pode errar, como no reconhecimento facial, e atingir inocentes",
      sol: "usar a tecnologia com regras claras, controle de acesso e respeito aos dados pessoais",
      ex: "as câmeras corporais da Polícia Militar de São Paulo reduziram mortes em ações policiais e geraram mais provas em vídeo",
    },
  },
  {
    nome: "Gestão e valorização",
    base: "Pacto pela Vida (PE, 2007) · avaliação da UFPE",
    frases: {
      cenario: "a segurança pública depende de gestão: recursos, efetivo e metas bem definidas",
      causa: "faltam policiais e estrutura, e o dinheiro, quando existe, é mal planejado",
      cons: "policiais sobrecarregados adoecem, e o atendimento à população piora",
      sol: "planejar com metas e dados, garantir recursos estáveis e valorizar o profissional de segurança",
      ex: "o Pacto pela Vida, em Pernambuco, reduziu os homicídios em quase 40% com metas, dados e reuniões semanais",
    },
  },
];
