/** Áreas da Biblioteca Rosan. A administradora escolhe quais cada pessoa vê. */
export const LIBRARY_SECTIONS = [
  { key: "jornada", label: "Jornada e padrões", emoji: "🧭", desc: "Cada etapa da jornada com as tarefas, os prazos e, embaixo de cada tarefa, a mensagem, o e-mail e o documento padrão." },
  { key: "padroes", label: "Padrões da jornada", emoji: "🗂️", desc: "Mensagens, e-mails e documentos padrão, ligados às tarefas de cada etapa. Quem gera a tarefa já vê o texto certo." },
  { key: "mensagens", label: "Mensagens do CRM", emoji: "💬", desc: "Textos prontos do botão Mensagem de cada lead." },
  { key: "materiais", label: "Materiais e documentos", emoji: "📚", desc: "Contratos, roteiros, planilhas, políticas e links." },
  { key: "pops", label: "Processos (POPs)", emoji: "📖", desc: "Passo a passo de como a Rosan trabalha." },
  { key: "trilha", label: "Trilha de conhecimento", emoji: "🎓", desc: "O que cada pessoa nova precisa aprender." },
  { key: "cultura", label: "Missão, visão e valores", emoji: "💙", desc: "A identidade da Rosan." },
] as const;

export type LibrarySection = (typeof LIBRARY_SECTIONS)[number]["key"];
export const LIBRARY_SECTION_KEYS = LIBRARY_SECTIONS.map((s) => s.key) as LibrarySection[];

/** Quem ainda não foi configurado vê só o essencial: trilha, missão e valores e processos. */
export const DEFAULT_SECTIONS: LibrarySection[] = ["trilha", "cultura", "pops"];

export const TRAINING_PHASES = ["Dia 1", "Semana 1", "Semana 2", "Mês 1", "Mês 2", "Mês 3"] as const;
