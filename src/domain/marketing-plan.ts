/** Plano de conteúdo do Instagram da Rosan (30/11 a 24/12/2026): calendário, roteiros, stories e perfil. */
import type { Pillar } from "./marketing";

export const HASHTAGS = "#bpofinanceiro #gestaofinanceira #financasparaempresas #pequenasempresas #fluxodecaixa #empreendedorismo";

export interface CalendarItem {
  date: string; // AAAA-MM-DD
  format: "CARROSSEL" | "REEL";
  title: string;
  pillar: Pillar;
  goal: string;
  key: string;
}

export const CALENDAR: CalendarItem[] = [
  { date: "2026-11-24", format: "REEL", title: "Reel: Voltei! O que você vai ver por aqui", pillar: "AUTORIDADE", goal: "Retomar o perfil e apresentar a rotina de conteúdo", key: "cal-reel-0" },
  { date: "2026-11-25", format: "CARROSSEL", title: "O que um BPO financeiro faz por você", pillar: "AUTORIDADE", goal: "Explicar o serviço", key: "o-que-um-bpo-faz" },
  { date: "2026-11-26", format: "REEL", title: "Reel: 3 perguntas que todo dono de empresa deveria saber responder", pillar: "EDUCATIVO", goal: "Alcance", key: "cal-reel-2" },
  { date: "2026-11-27", format: "CARROSSEL", title: "Checklist de fechamento do mês", pillar: "EDUCATIVO", goal: "Salvamentos (fim de mês)", key: "ideia-5" },
  { date: "2026-11-30", format: "CARROSSEL", title: "Faturamento não é lucro", pillar: "MITOS", goal: "Debate e salvamentos", key: "faturamento-nao-e-lucro" },
  { date: "2026-12-01", format: "REEL", title: "Reel: O que o cliente recebe todo mês", pillar: "AUTORIDADE", goal: "Apresentar o serviço", key: "cal-reel-1" },
  { date: "2026-12-02", format: "CARROSSEL", title: "3 sinais de que o dinheiro da empresa está misturado com o seu", pillar: "EDUCATIVO", goal: "Identificação e compartilhamento", key: "sinais-contas-misturadas" },
  { date: "2026-12-03", format: "REEL", title: "Antes e depois: financeiro desorganizado x organizado", pillar: "BASTIDORES", goal: "Conexão e prova visual", key: "ideia-10" },
  { date: "2026-12-04", format: "CARROSSEL", title: "Fluxo de caixa em 4 passos simples", pillar: "EDUCATIVO", goal: "Salvamentos", key: "fluxo-de-caixa-4-passos" },
  { date: "2026-12-07", format: "CARROSSEL", title: "5 erros que fazem a empresa vender e não sobrar dinheiro", pillar: "MITOS", goal: "Comentários", key: "5-erros-vende-e-nao-sobra" },
  { date: "2026-12-08", format: "REEL", title: "Mito: minha empresa é pequena, não preciso de controle", pillar: "MITOS", goal: "Alcance e debate", key: "ideia-8" },
  { date: "2026-12-09", format: "CARROSSEL", title: "Conciliação bancária sem complicação", pillar: "EDUCATIVO", goal: "Salvamentos", key: "conciliacao-bancaria" },
  { date: "2026-12-10", format: "REEL", title: "Um dia na rotina do financeiro da Rosan", pillar: "BASTIDORES", goal: "Conexão e confiança", key: "ideia-7" },
  { date: "2026-12-11", format: "CARROSSEL", title: "Pró-labore: quanto retirar da empresa", pillar: "EDUCATIVO", goal: "Compartilhamento", key: "pro-labore" },
  { date: "2026-12-14", format: "CARROSSEL", title: "DRE em 1 minuto: o que é e como ler", pillar: "EDUCATIVO", goal: "Salvamentos", key: "ideia-1" },
  { date: "2026-12-15", format: "REEL", title: "Reel: Quanto a sua empresa gasta por dia só para existir", pillar: "EDUCATIVO", goal: "Alcance", key: "cal-reel-5" },
  { date: "2026-12-16", format: "CARROSSEL", title: "Como nunca mais atrasar uma conta", pillar: "EDUCATIVO", goal: "Salvamentos", key: "ideia-2" },
  { date: "2026-12-17", format: "REEL", title: "O erro de copiar o preço do concorrente", pillar: "MITOS", goal: "Alcance", key: "ideia-3" },
  { date: "2026-12-18", format: "CARROSSEL", title: "Como funciona a parceria com a Rosan Finanças", pillar: "AUTORIDADE", goal: "Gerar contatos (direct)", key: "como-comeca-a-parceria" },
  { date: "2026-12-21", format: "CARROSSEL", title: "3 relatórios que todo dono de empresa deveria olhar", pillar: "EDUCATIVO", goal: "Salvamentos", key: "ideia-9" },
  { date: "2026-12-22", format: "REEL", title: "Reel: Feche o ano com o financeiro em dia", pillar: "EDUCATIVO", goal: "Alcance (fim de ano)", key: "cal-reel-7" },
  { date: "2026-12-23", format: "CARROSSEL", title: "Quanto custa não ter um BPO financeiro", pillar: "AUTORIDADE", goal: "Gerar contatos (direct)", key: "cal-custo-sem-bpo" },
  { date: "2026-12-24", format: "REEL", title: "Reel: Planeje 2027 com 3 números", pillar: "EDUCATIVO", goal: "Alcance", key: "cal-reel-8" },
];

export interface ReelScript {
  hook: string;
  script: string;
  caption: string;
}

export const REEL_SCRIPTS: Record<string, ReelScript> = {
  "cal-reel-0": {
    hook: "Voltei! E hoje começa uma série para você organizar o financeiro da sua empresa.",
    script: "Olhe para a câmera e diga: oi, eu sou a Rosan, tenho 11 anos de contabilidade e hoje cuido do financeiro de empresas.\nConte que, a partir de hoje, toda semana tem 3 carrosséis e 2 reels com dicas simples.\nPeça para a pessoa seguir o perfil e ativar o sino para não perder.",
    caption: "Voltei com tudo! Toda semana, dicas simples para organizar o financeiro da sua empresa. Siga o perfil e me conte nos comentários: qual é a sua maior dificuldade hoje no financeiro?",
  },
  "ideia-10": {
    hook: "Financeiro bagunçado x financeiro organizado: veja a diferença.",
    script: "Mostre dois lados (sem dados de clientes reais): de um lado, notas soltas, mensagens e planilhas perdidas; do outro, tudo em um só lugar, com contas, banco conferido e relatório.\nTermine dizendo qual lado você prefere para a sua empresa.",
    caption: "Organizar o financeiro não é luxo, é o que dá tranquilidade para decidir. De que lado está a sua empresa hoje? Responda nos comentários.",
  },
  "cal-reel-1": {
    hook: "O que você recebe quando contrata um BPO financeiro?",
    script: "1) Suas contas pagas e recebidas em dia.\n2) O banco conferido com o sistema.\n3) Um relatório simples do mês.\n4) Uma conversa para decidir o próximo passo.",
    caption: "Você cuida do crescimento. A Rosan cuida de tudo isso. Comente QUERO e eu te envio o diagnóstico financeiro gratuito.",
  },
  "cal-reel-2": {
    hook: "Se você não sabe responder essas 3 perguntas, seu financeiro está no escuro.",
    script: "Quanto entrou este mês?\nQuanto saiu?\nQuanto sobrou de verdade, depois de tudo pago?",
    caption: "Sem planilha complicada: só essas 3 respostas já mudam suas decisões. Salve para conferir no fim do mês.",
  },
  "ideia-8": {
    hook: "Empresa pequena não precisa de controle? Esse é o maior mito.",
    script: "Na empresa pequena, um erro pesa mais.\nControle não é burocracia: é saber se dá para pagar as contas do próximo mês.\nComece com o básico.",
    caption: "Quanto menor a empresa, mais cada real importa. Marque um empresário que precisa ouvir isso.",
  },
  "ideia-7": {
    hook: "Quer saber o que eu faço o dia inteiro?",
    script: "Mostre 4 momentos reais do seu dia (conferência do banco, pagamentos, relatório, conversa com cliente), 5 a 8 segundos cada. Adapte ao seu dia de verdade e não mostre dados de clientes.",
    caption: "Por trás de uma empresa organizada tem uma rotina. Esta é a minha. Quer essa rotina cuidando da sua empresa? Chame no direct.",
  },
  "cal-reel-5": {
    hook: "Se você não vender nada hoje, quanto já perdeu?",
    script: "Some o custo fixo do mês (aluguel, folha, sistemas, impostos fixos) e divida por 30.\nEsse é o valor que a empresa precisa cobrir todo dia, antes de ter lucro.",
    caption: "Conhecer esse número muda sua forma de vender e de precificar. Calcule o seu e me conte nos comentários.",
  },
  "ideia-3": {
    hook: "Copiar o preço do concorrente pode quebrar a sua empresa.",
    script: "Ele tem outros custos e outra margem.\nPreço certo é custo mais o lucro que você precisa.\nCalcule o seu antes de olhar o dele.",
    caption: "Preço bom não é o mais baixo, é o que sobra no fim do mês. Salve e envie para quem está precificando.",
  },
  "cal-reel-7": {
    hook: "3 coisas para fazer antes de 31 de dezembro.",
    script: "1) Conferir contas em aberto, a pagar e a receber.\n2) Conciliar o banco de dezembro.\n3) Separar o dinheiro dos impostos e dos compromissos de janeiro.",
    caption: "Comece o ano sem susto. Quer ajuda para fechar o ano? Chame no direct.",
  },
  "cal-reel-8": {
    hook: "Meta sem número não é meta.",
    script: "Quanto a empresa fatura em média.\nQuanto custa manter por mês.\nQuanto de lucro você quer.\nCom os três, dá para definir a meta do ano.",
    caption: "Anote esses 3 números hoje e comece 2027 com direção. Boas festas!",
  },
};

/** Texto pronto de carrosséis que não vêm da biblioteca padrão. */
export const CAROUSEL_EXTRAS: Record<string, { slidesText: string; caption: string; hashtags: string }> = {
  "ideia-5": {
    slidesText: `Checklist de fechamento do mês
Salve para conferir no último dia útil.
---
1. Contas pagas e recebidas
Confira se tudo o que venceu no mês foi baixado.
---
2. Banco conferido
O saldo do sistema bate com o extrato do banco?
---
3. Contas em aberto
Liste o que ficou para o próximo mês e combine data.
---
4. Impostos e folha
Separe o dinheiro de quem vence no início do mês seguinte.
---
5. Resultado do mês
Quanto entrou, quanto saiu e quanto sobrou de verdade.
---
6. Próximo mês
Anote o que vence nos primeiros dias para não se atrasar.
---
Fechou o mês sem susto?
Salve este post e mande para quem cuida do financeiro com você.`,
    caption: "Todo fim de mês, a mesma pergunta: está tudo em ordem? Use este checklist no último dia útil e comece o mês seguinte com tranquilidade. Salve para não esquecer e me conte nos comentários: qual desses itens você mais esquece?",
    hashtags: HASHTAGS,
  },
};

export const STORIES_WEEK = [
  { day: "Segunda", topic: "A meta da semana: uma coisa que você vai organizar no financeiro dos clientes", format: "Você falando + enquete “Você já fez isso?”" },
  { day: "Terça", topic: "Bastidores: um momento do seu dia de trabalho (tela, café, reunião)", format: "Fotos e vídeos curtos" },
  { day: "Quarta", topic: "Pergunte ao BPO: caixinha de perguntas e resposta de uma dúvida", format: "Caixinha de perguntas" },
  { day: "Quinta", topic: "Mito ou verdade sobre dinheiro de empresa", format: "Enquete de 2 opções + resposta no story seguinte" },
  { day: "Sexta", topic: "Dica rápida de 1 minuto e aviso do post ou reel da semana", format: "Vídeo curto + compartilhar o post" },
  { day: "Sábado", topic: "Leve: frase, livro, café, vida de empreendedora", format: "1 ou 2 stories" },
  { day: "Domingo", topic: "Pausa, ou reposte um comentário ou depoimento de cliente (com permissão)", format: "1 story" },
];
export const STORIES_RULES = [
  "Meta: 5 a 7 stories por dia, com seu rosto em pelo menos 2, e responder todas as mensagens.",
  "Todo dia, um story com a figurinha de link do diagnóstico gratuito ou o convite “me chama no direct”.",
  "Nos dias de post, compartilhe o post nos stories em até 1 hora.",
  "Salve os melhores stories nos destaques.",
];

export const INSIGHTS = {
  asOf: "23/11/2026, últimos 30 dias",
  numbers: [
    ["Visualizações", "1.231 (56,9% de seguidores, 43,1% de quem não segue)"],
    ["Por formato", "Stories 69,1%, reels 27,7%, posts de feed 3,1%"],
    ["Interações", "65 (92,3% de seguidores), vindas de 25 contas"],
    ["Visitas ao perfil", "36, com 1 toque no link da bio"],
    ["Seguidores", "179"],
    ["Horários em que seguidores estão mais ativos", "Entre 6h e 15h, com picos às 6h e às 12h"],
    ["Último post", "4 de novembro (19 dias sem publicar em 23/11)"],
  ] as const,
  tiles: [
    ["1.231", "visualizações em 30 dias"],
    ["179", "seguidores"],
    ["36", "visitas ao perfil"],
    ["1", "toque no link da bio"],
  ] as const,
  worked: [
    "Reel “Por trás de toda empresa que cresce de verdade”: 251 visualizações, o mais visto do mês.",
    "Post “11 anos na contabilidade”: 35 curtidas e 18 comentários, o que mais gerou conversa.",
    "Post da nova identidade: 32 curtidas e 14 comentários.",
    "Reel de humor “Preciso de 10 fofoqueiros”: 31 curtidas e 5 comentários.",
  ],
  reading: [
    "O público atual é quase só gente que já te conhece. Falta alcançar quem ainda não te segue.",
    "Os posts que contam a sua história geram mais conversa que os de frase curta.",
    "Faltava chamada para ação: 36 visitas ao perfil viraram 1 clique no link.",
    "Os stories são a maior parte das visualizações, então precisam de rotina diária.",
    "O feed tem poucos carrosséis, que são os que mais geram salvamentos.",
  ],
  alreadyPosted: [
    "11 anos na contabilidade; por trás de toda empresa que cresce; 10 fofoqueiros; 1 conselho financeiro para todo empresário",
    "Dinheiro não traz felicidade; não sobrar no fim do mês; consultoria pessoal; o maior erro de quem quer criar reserva; por que o dinheiro acaba antes do fim do mês; parar de esperar o momento perfeito",
    "O erro que quebra empresas; você sabe quanto ganha; o empresário perde tempo por causa disso; empresário não deveria fazer isso; 3 sinais de que precisa de BPO; como o BPO ajuda pequenas empresas",
    "Carrosséis: se a empresa parasse de vender; 3 sinais de decisões no achismo; ponto de equilíbrio",
  ],
};

export const PROFILE = {
  name: "Rosan | BPO Financeiro",
  bio: "Organizo o financeiro da sua empresa. BPO financeiro e consultoria para pequenos negócios. 11 anos de contabilidade. Diagnóstico gratuito abaixo.",
  links: ["Diagnóstico financeiro gratuito", "Falar no WhatsApp", "Como funciona a parceria com a Rosan"],
  highlights: [
    ["Comece aqui", "Quem é você, o que faz, para quem, como falar com você"],
    ["Serviços", "BPO financeiro, consultoria, o que o cliente recebe todo mês"],
    ["Dúvidas (já existe)", "Respostas das caixinhas de perguntas"],
    ["Bastidores", "Seu dia de trabalho"],
    ["Eventos (já existe)", "Eventos como o Trilhar"],
    ["Depoimentos", "Mensagens de clientes (com permissão)"],
  ] as const,
  pinned: ["“11 anos na contabilidade” (sua história)", "O que é BPO financeiro", "Diagnóstico gratuito"],
  reelCovers: "Use uma capa padrão (foto sua, título em fonte serifada e fundo azul-marinho) para a grade ficar organizada.",
  site: [
    "Site de uma página, simples e rápido, para quem chega do Instagram.",
    "Seções: apresentação com sua foto, para quem é, serviços, como funciona, sobre você, diagnóstico gratuito (formulário), perguntas frequentes e WhatsApp.",
    "Mesma identidade do Instagram. O botão do link da bio passa a levar para o site.",
    "Preciso de você: o domínio (por exemplo rosanfinancas.com.br), seu WhatsApp, 5 a 8 fotos e seu ok nos textos.",
    "Sugestão: começar em dezembro, depois que o Instagram estiver rodando.",
  ],
};
