import type { Pillar } from "./marketing";

export interface LibraryPost {
  key: string;
  title: string;
  pillar: Pillar;
  slidesText: string;
  caption: string;
  hashtags: string;
}

const TAGS = "#financasparaempresas #gestaofinanceira #bpofinanceiro #empreendedorismo #pequenasempresas #educacaofinanceira";

/** Posts prontos (carrosséis) para importar na Central de conteúdos. Linguagem simples, sem termos técnicos. */
export const LIBRARY_POSTS: LibraryPost[] = [
  {
    key: "sinais-contas-misturadas",
    title: "3 sinais de que o dinheiro da empresa está misturado com o seu",
    pillar: "EDUCATIVO",
    slidesText: `3 sinais de que o dinheiro da empresa está misturado com o seu
Se você se identificou com algum, este post é para você.
---
1. Você paga contas pessoais com o dinheiro da empresa
Mercado, escola, cartão de crédito. Quando tudo sai da mesma conta, fica impossível saber quanto a empresa realmente ganhou.
---
2. Você não sabe quanto recebe por mês
Se você tira dinheiro "quando precisa", não existe salário. Existe retirada sem controle.
---
3. O caixa nunca fecha
Entra dinheiro, sai dinheiro, e no fim do mês você não sabe explicar para onde ele foi.
---
O que fazer?
Abra uma conta só da empresa. Defina um valor fixo para você retirar todo mês. E anote tudo o que entra e sai.
---
Salve este post para não esquecer
E conta nos comentários: você já misturou as contas? Sem julgamento. A gente está aqui para ajudar.`,
    caption:
      "Misturar o dinheiro da empresa com o pessoal é mais comum do que parece, e é um dos principais motivos de o caixa não fechar.\n\nSe você se identificou com algum sinal, comece pelo básico: uma conta só da empresa e um valor fixo de retirada.\n\nSalve este post e compartilhe com quem precisa ouvir isso. 💙",
    hashtags: TAGS,
  },
  {
    key: "faturamento-nao-e-lucro",
    title: "Faturamento não é lucro",
    pillar: "MITOS",
    slidesText: `Faturamento não é lucro
E essa confusão custa caro.
---
Faturamento é tudo o que entra
É o valor total das suas vendas. Ainda não descontou nada.
---
Lucro é o que sobra
É o que resta depois de pagar tudo: fornecedores, equipe, aluguel, impostos e outras despesas.
---
Um exemplo simples
Vendeu R$ 10 mil. Gastou R$ 9 mil para manter a empresa funcionando. O lucro foi de R$ 1 mil, e não de R$ 10 mil.
---
Por que isso importa?
Quem confunde os dois gasta o que não tem, atrasa contas e acha que a empresa vai bem quando não vai.
---
Quer saber quanto a sua empresa realmente lucra?
Chame a gente. A Rosan Finanças organiza os números para você decidir com segurança.`,
    caption:
      "Vender muito não significa lucrar muito. O que importa é o que sobra depois de pagar todas as contas do negócio.\n\nVocê sabe qual é o lucro da sua empresa hoje? Conta aqui nos comentários se essa dúvida já passou pela sua cabeça.",
    hashtags: TAGS,
  },
  {
    key: "fluxo-de-caixa-4-passos",
    title: "Fluxo de caixa em 4 passos simples",
    pillar: "EDUCATIVO",
    slidesText: `Fluxo de caixa em 4 passos simples
Sem planilha complicada.
---
1. Liste o que vai entrar
Todas as vendas e recebimentos previstos, com a data em que o dinheiro cai na conta.
---
2. Liste o que vai sair
Contas fixas, fornecedores, equipe e impostos. Cada uma com a data de vencimento.
---
3. Compare semana a semana
Veja se vai ter dinheiro suficiente em cada semana. O problema quase sempre aparece antes do fim do mês.
---
4. Atualize toda semana
O fluxo de caixa só ajuda se estiver em dia. Reserve 15 minutos por semana para isso.
---
Salve para montar o seu
E se preferir não fazer isso sozinho, a gente cuida disso para você.`,
    caption:
      "Fluxo de caixa é só isto: saber quanto vai entrar, quanto vai sair e quando. Com esse mapa, você se antecipa aos apertos em vez de ser surpreendido por eles.\n\nSalve este passo a passo e comece ainda esta semana.",
    hashtags: `${TAGS} #fluxodecaixa`,
  },
  {
    key: "5-erros-vende-e-nao-sobra",
    title: "5 erros que fazem a empresa vender e não sobrar dinheiro",
    pillar: "MITOS",
    slidesText: `5 erros que fazem a empresa vender e não sobrar dinheiro
Quantos você reconhece?
---
1. Não separar as contas
Dinheiro pessoal e da empresa na mesma conta.
---
2. Vender sem saber o custo
Preço definido no "achismo" ou copiado do concorrente, sem contar todos os custos.
---
3. Esquecer as contas a pagar
Vencimento perdido vira multa e juros. É dinheiro jogado fora.
---
4. Não ter reserva de caixa
Qualquer imprevisto vira dívida.
---
5. Olhar os números só no fim do ano
Quando você descobre o problema, já é tarde. Acompanhe todo mês.
---
Quantos desses você reconhece?
Conta nos comentários. Se quiser ajuda para corrigir, chama a gente.`,
    caption:
      "Muita empresa vende bem e mesmo assim vive apertada. Na maioria das vezes, o motivo está em um desses cinco erros.\n\nQual deles aparece mais por aí? Conta nos comentários. 👇",
    hashtags: TAGS,
  },
  {
    key: "o-que-um-bpo-faz",
    title: "O que um BPO financeiro faz por você",
    pillar: "BASTIDORES",
    slidesText: `O que um BPO financeiro faz por você?
Resumindo: tudo o que toma o seu tempo.
---
O que é BPO financeiro?
É quando uma equipe especializada cuida da rotina financeira da sua empresa. Você foca no negócio.
---
Contas a pagar e a receber
Organizamos os vencimentos, registramos tudo e avisamos o que precisa de atenção.
---
Conciliação bancária
Conferimos se o que está registrado bate com o extrato do banco. Nada fica perdido.
---
Relatórios simples
Todo mês você recebe números claros, sem termos técnicos, para decidir melhor.
---
Quer mais tempo e mais clareza?
Chame a gente para uma conversa. A Rosan Finanças cuida do financeiro; você cuida de crescer.`,
    caption:
      "BPO financeiro é terceirizar a rotina do financeiro com uma equipe que faz isso todos os dias. Menos planilha, menos correria e mais clareza para decidir.\n\nQuer entender como isso funcionaria na sua empresa? Chama a gente no direct.",
    hashtags: `${TAGS} #terceirizacaofinanceira`,
  },
  {
    key: "conciliacao-bancaria",
    title: "Conciliação bancária sem complicação",
    pillar: "EDUCATIVO",
    slidesText: `Conciliação bancária: o que é, sem complicação
Explicado em 5 passos curtos.
---
O que é
É conferir se tudo o que você registrou bate com o extrato do banco.
---
Por que fazer
Para achar cobranças indevidas, pagamentos em duplicidade e valores que ficaram sem registro.
---
Com que frequência
O ideal é toda semana, ou todo dia se a empresa movimenta muito. Quanto mais cedo, mais fácil achar a diferença.
---
Como começar
Pegue o extrato, compare com os seus registros e marque o que já conferiu. O que sobrar sem par, investigue.
---
Prefere não fazer isso sozinho?
É uma das rotinas que a Rosan Finanças faz por você.`,
    caption:
      "Conciliação bancária parece um termo difícil, mas a ideia é simples: conferir se o que você anotou é igual ao que o banco mostra.\n\nSalve para fazer essa checagem com calma e compartilhe com quem cuida do financeiro da empresa.",
    hashtags: `${TAGS} #conciliacaobancaria`,
  },
  {
    key: "pro-labore",
    title: "Pró-labore: quanto retirar da empresa",
    pillar: "EDUCATIVO",
    slidesText: `Pró-labore: quanto você deve retirar da empresa?
Um jeito simples de pensar nisso.
---
O que é pró-labore
É o seu salário como dono. Um valor fixo, combinado, que sai da empresa todo mês.
---
Por que um valor fixo?
Retirar "quando precisa" bagunça o caixa e esconde o resultado real da empresa.
---
Como definir
Veja quanto a empresa consegue pagar sem faltar dinheiro para as contas. Compare com o quanto você precisa para viver.
---
Atenção
Se o valor que você precisa é maior do que a empresa consegue pagar, o ponto a resolver é o resultado do negócio, e não o pró-labore.
---
Salve e compartilhe com quem mistura as contas
Dúvida de como definir o seu? Pergunta nos comentários. E converse também com o seu contador sobre os encargos.`,
    caption:
      "Pagar um salário fixo para você mesmo é um dos hábitos que mais organizam o financeiro de uma empresa pequena.\n\nSalve este post e me conta: você já tem um valor fixo de retirada?",
    hashtags: TAGS,
  },
  {
    key: "como-comeca-a-parceria",
    title: "Como funciona a parceria com a Rosan Finanças",
    pillar: "AUTORIDADE",
    slidesText: `Como funciona a parceria com a Rosan Finanças
Do primeiro contato até os números na sua mão.
---
1. Conversa de diagnóstico
Entendemos como está o financeiro da sua empresa hoje e do que você precisa.
---
2. Organização da casa
Cadastramos contas, categorias e fornecedores, e deixamos tudo no lugar.
---
3. Rotina em andamento
Passamos a cuidar do dia a dia: contas, conciliação e acompanhamento.
---
4. Você enxerga os números
Relatórios claros todo mês, para você decidir com segurança.
---
Vamos conversar?
Chame a gente no direct e conte como está o financeiro da sua empresa.`,
    caption:
      "Sem mistério: é assim que começamos a cuidar do financeiro de um cliente. Primeiro entendemos, depois organizamos, depois acompanhamos.\n\nQuer dar o primeiro passo? Chama a gente no direct.",
    hashtags: `${TAGS} #bpo`,
  },
];

export const LIBRARY_IDEAS: Array<{ title: string; pillar: Pillar; notes: string }> = [
  { title: "DRE em 1 minuto: o que é e como ler", pillar: "EDUCATIVO", notes: "Explicar com um exemplo de uma loja pequena. Evitar sigla sem explicar." },
  { title: "Como nunca mais atrasar uma conta", pillar: "EDUCATIVO", notes: "Calendário de vencimentos, dia fixo de pagamento, avisos." },
  { title: "O erro de copiar o preço do concorrente", pillar: "MITOS", notes: "Cada empresa tem custos diferentes. Mostrar o que entra no preço." },
  { title: "Reserva de caixa da empresa: quanto guardar?", pillar: "EDUCATIVO", notes: "Ideia de reserva em meses de despesas fixas." },
  { title: "Checklist de fechamento do mês", pillar: "EDUCATIVO", notes: "Carrossel de checklist para salvar." },
  { title: "Quando é a hora de contratar um BPO financeiro?", pillar: "AUTORIDADE", notes: "Sinais: sem tempo, caixa bagunçado, decisões no escuro." },
  { title: "Um dia na rotina do financeiro da Rosan", pillar: "BASTIDORES", notes: "Mostrar a rotina sem expor nenhum cliente." },
  { title: "Mito: minha empresa é pequena, não preciso de controle", pillar: "MITOS", notes: "Quanto menor, mais cada real faz diferença." },
  { title: "3 relatórios que todo dono de empresa deveria olhar", pillar: "EDUCATIVO", notes: "Fluxo de caixa, contas a pagar/receber e resultado do mês." },
  { title: "Antes e depois: financeiro desorganizado x organizado", pillar: "BASTIDORES", notes: "Comparação visual simples, sem dados de clientes reais." },
];
