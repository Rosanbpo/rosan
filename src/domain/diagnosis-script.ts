/**
 * Roteiro da reunião de diagnóstico (SPIN Selling, até 45 minutos).
 * É guardado como o documento padrão "Roteiro da reunião de diagnóstico" da jornada
 * e pode ser editado na Estrutura Rosan. Formato:
 *   ## Título da parte | 3 min
 *   - Rótulo :: texto da fala ou pergunta
 *   > orientação final (linha solta, sem seção, vira o aviso do rodapé)
 */
export const SCRIPT_TITLE = "Roteiro da reunião de diagnóstico";

export const DEFAULT_SCRIPT_BODY = `SPIN Selling • Duração máxima: 45 minutos

## 1. Abertura e conexão | 3 min
- Fala de abertura :: Primeiramente, obrigada por separar esse tempo para nossa conversa. Quero conhecer um pouco melhor a empresa, entender como funciona a gestão financeira atualmente e quais são os principais desafios que vocês enfrentam. Depois, vou apresentar como trabalhamos na Rosan e mostrar, na prática, como vocês poderão acompanhar as informações financeiras por meio do nosso dashboard.

## 2. Situação: conhecendo a empresa | 7 min
- Pergunta 1 :: Como funciona a gestão financeira da empresa hoje? Quem é responsável por essa área?
- Pergunta 2 :: Quais bancos, sistemas e ferramentas vocês utilizam para controlar o financeiro?
- Pergunta 3 :: Como é feito o acompanhamento dos resultados? Vocês possuem algum relatório ou fechamento financeiro mensal?

## 3. Problemas: identificando dificuldades | 7 min
- Pergunta 1 :: Qual é a maior dificuldade que vocês enfrentam atualmente na gestão financeira?
- Pergunta 2 :: Vocês conseguem acompanhar com clareza o fluxo de caixa, as despesas e o lucro da empresa?
- Pergunta 3 :: Existe alguma atividade financeira que acaba ficando acumulada ou tomando mais tempo do que deveria?

## 4. Implicações: consequências | 6 min
- Pergunta 1 :: De que forma essa dificuldade interfere na rotina ou nas decisões da empresa?
- Pergunta 2 :: A falta dessas informações já dificultou algum planejamento ou fez vocês tomarem decisões sem ter clareza dos números?
- Pergunta 3 :: Se a gestão continuar funcionando dessa maneira, o que você acredita que pode acontecer nos próximos meses?

## 5. Necessidade de solução | 5 min
- Pergunta 1 :: Se você tivesse todas as informações financeiras organizadas e atualizadas, o que mudaria na gestão da empresa?
- Pergunta 2 :: Quais informações considera indispensáveis para acompanhar mensalmente e tomar decisões?
- Pergunta 3 :: Ter uma equipe responsável pela rotina financeira, com relatórios e indicadores, seria algo que ajudaria a empresa neste momento?
- Transição :: Perfeito! E é justamente sobre isso que quero falar agora. Vou compartilhar um pouco de como funciona nosso trabalho e mostrar como você poderá visualizar essas informações na prática.

## 6. Apresentação do dashboard | 8 min
- Introdução :: Além de cuidar da rotina financeira, nosso objetivo é proporcionar clareza sobre os números da empresa. Por isso, trabalhamos com um dashboard gerencial, onde vocês conseguem visualizar as principais informações financeiras de maneira simples e organizada.
- Faturamento :: Aqui você consegue visualizar quanto a empresa está gerando de receita no período.
- Despesas :: Aqui conseguimos identificar para onde o dinheiro está indo e quais são os maiores gastos da empresa.
- Lucro e margem :: Nessa parte, conseguimos visualizar o resultado da empresa e entender quanto da receita está efetivamente se transformando em lucro.
- Fluxo de caixa :: Aqui você acompanha as movimentações financeiras e consegue ter uma visão melhor das entradas, saídas e disponibilidade de recursos.
- Ponto de equilíbrio :: Esse indicador mostra quanto a empresa precisa faturar para cobrir seus custos e despesas.
- Gráficos e comparativos :: Também conseguimos comparar os resultados entre os meses, identificar tendências e acompanhar a evolução financeira da empresa.

## 7. Apresentação da solução e fechamento | 9 min
- Apresentação da Rosan :: Como você pôde perceber, nosso trabalho vai além de executar a rotina financeira. A Rosan assume a gestão dessa operação, organiza as informações e transforma os dados financeiros em relatórios e indicadores que ajudam o empresário a entender melhor o negócio.
- Implantação e operação :: Nosso trabalho começa com uma etapa de organização e estruturação financeira. Depois, seguimos com a rotina de acompanhamento, atualização das informações, conciliações e fechamentos mensais.
- Entregas e acompanhamento :: Você terá acesso às informações financeiras organizadas, relatórios e indicadores para acompanhar a situação da empresa e apoiar suas decisões.
- Investimento :: Com base no que conversamos, vou apresentar o formato de trabalho indicado para a empresa, o que está incluído e o investimento mensal.
- Pergunta de fechamento 1 :: Pelo que conversamos e pelo que apresentei, você acredita que esse formato atenderia às necessidades da empresa?
- Pergunta de fechamento 2 :: Existe algum ponto que gostaria de esclarecer antes de avançarmos?
- Pergunta de fechamento 3 :: Caso a proposta esteja alinhada, quando gostaria de iniciar?

> Não precisa ler tudo literalmente se o cliente já tiver respondido alguma pergunta durante a conversa. O roteiro serve para orientar a condução, mantendo a reunião natural e profissional.
`;

export interface ScriptItem { id: string; label: string; text: string }
export interface ScriptSection { id: string; title: string; minutes: number | null; items: ScriptItem[] }
export interface ParsedScript { heading: string; sections: ScriptSection[]; footer: string }

export function parseScript(body: string): ParsedScript {
  const sections: ScriptSection[] = [];
  let heading = "";
  const footer: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      const [title, min] = line.slice(3).split("|").map((x) => x.trim());
      const m = /(\d+)/.exec(min ?? "");
      sections.push({ id: `s${sections.length}`, title: title ?? "", minutes: m ? Number(m[1]) : null, items: [] });
    } else if (line.startsWith("- ") && sections.length) {
      const cur = sections[sections.length - 1];
      const [label, ...rest] = line.slice(2).split("::");
      const text = rest.join("::").trim();
      cur.items.push({ id: `${cur.id}.${cur.items.length}`, label: text ? label.trim() : "Fala", text: text || label.trim() });
    } else if (line.startsWith(">")) footer.push(line.replace(/^>\s*/, ""));
    else if (!sections.length) heading += (heading ? " " : "") + line;
  }
  return { heading, sections, footer: footer.join(" ") };
}
