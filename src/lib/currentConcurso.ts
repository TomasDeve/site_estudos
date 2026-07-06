// Lembra qual concurso o usuário estava estudando, para o site abrir "mergulhado" nele.
const CHAVE = "estudos_concurso_atual";

export function setConcursoAtual(id: string) {
  try {
    localStorage.setItem(CHAVE, id);
  } catch {
    /* ignora storage indisponível */
  }
}

export function getConcursoAtual(): string | null {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}
