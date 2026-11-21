/** Áreas da Biblioteca Rosan. A administradora escolhe quais cada pessoa vê. */
export const LIBRARY_SECTIONS = [
  { key: "jornada", label: "Jornada do cliente", emoji: "🧭", desc: "Esteiras e modelos de rotina por etapa, com prazos." },
  { key: "mensagens", label: "Mensagens e e-mails", emoji: "💬", desc: "Textos prontos para WhatsApp e e-mail." },
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
