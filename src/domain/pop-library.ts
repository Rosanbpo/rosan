import type { TaskCategory } from "./enums";

export interface PopTemplate {
  title: string;
  category: TaskCategory;
  objective: string;
  tools?: string;
  responsible?: string;
  content: string;
}

/** Processos prontos do escritório, no formato de documento (ver pop-markup.ts). */
export const POP_LIBRARY: PopTemplate[] = [
  {
    title: "Processo de Contas a Pagar",
    category: "CONTAS_A_PAGAR",
    objective: "Organizar, lançar, conferir e preparar todos os pagamentos — quem aprova e executa no banco é sempre o cliente.",
    tools: "Sistema de gestão, internet banking (acesso secundário), Drive",
    responsible: "Assistente (tesouraria)",
    content: `## Objetivo
O BPO organiza, lança, confere e prepara todos os pagamentos — mas quem aprova e executa dentro do banco é sempre o cliente. Essa separação é deliberada: protege o cliente de pagamentos indevidos e protege o BPO de qualquer responsabilidade sobre movimentações financeiras.

> [regra] Princípio inviolável: O BPO nunca executa pagamentos. Nossa função é organizar, conferir e apresentar. A aprovação e execução final é sempre do cliente, dentro do próprio internet banking.

## Por que os acessos são limitados
Os acessos do BPO aos sistemas bancários dos clientes são sempre acessos secundários com permissões restritas — visão de extrato e inclusão de pagamentos para aprovação, nunca execução direta. Isso não é limitação operacional, é um controle de segurança deliberado:
- O cliente mantém controle total sobre o que sai da conta dele
- O BPO não pode ser responsabilizado por pagamentos não autorizados
- Reduz drasticamente o risco de fraudes internas e externas
- Gera confiança e transparência no relacionamento com o cliente

## Fluxo semanal — toda segunda-feira
1. Levantamento (BPO)
   Identificar todos os vencimentos da semana: boletos, NFs, contratos recorrentes e obrigações avulsas. Conferir favorecido, valor, vencimento e se há documento de suporte para cada um.
2. Lançamento no sistema de gestão (BPO)
   Registrar todos os pagamentos no sistema com categorização correta e centro de custo (se houver). Esse lançamento alimenta o fluxo de caixa projetado e garante rastreabilidade.
3. Inclusão no banco (BPO — acesso secundário)
   Incluir os pagamentos no internet banking do cliente usando o acesso limitado. Os pagamentos ficam no status "aguardando aprovação" — nenhum é processado ainda.
4. Envio do relatório de aprovação (BPO → Cliente)
   Enviar ao cliente um relatório com todos os pagamentos incluídos, contendo favorecido, valor, vencimento e categoria. O envio deve ser feito pela manhã, para dar tempo de revisão.
5. Salvar os comprovantes agendados na pasta (BPO → Cliente)
   Salvar os comprovantes na pasta "Agendados", que o cliente usa para consultar no momento da aprovação. Depois que o pagamento for processado, mover os comprovantes para a pasta "Aprovados".
6. Aprovação pelo cliente (dentro do banco)
   O cliente acessa o próprio internet banking e aprova os pagamentos que conferiu no relatório. Qualquer pagamento não reconhecido deve ser pausado e discutido antes da aprovação — nunca pressionar para aprovar sem conferir.
7. Acompanhamento e conciliação (BPO)
   Após a aprovação, monitorar diariamente se os pagamentos foram processados e conciliar cada um com o extrato. Registrar comprovantes e dar baixa no sistema.

> [dica] Boa prática: O relatório deve ser claro e simples — o cliente não é analista financeiro. Liste os pagamentos de forma legível, destaque os valores maiores e indique se há algo fora do padrão.

## O que fazer se o cliente identificar divergência
| Situação | Ação |
|---|---|
| Não reconhece um pagamento | Remover da fila imediatamente, investigar a origem |
| Valor incorreto | Corrigir no banco e no sistema antes da aprovação |
| Pagamento duplicado | Remover o duplicado antes que seja aprovado |
| Quer incluir pagamento avulso | Incluir, atualizar o relatório e reenviar para aprovação |

> [aviso] Nunca: Pressionar o cliente a aprovar sem que tenha conferido o relatório. A aprovação consciente do cliente é a principal proteção de todos os envolvidos.`,
  },
  {
    title: "Rotina Semanal da Operação",
    category: "OUTRAS",
    objective: "Organizar a cadência semanal: inclusão de pagamentos na segunda, conciliação todos os dias.",
    responsible: "Assistente e analista",
    content: `## Objetivo
A operação de BPO segue uma cadência semanal estruturada — não tudo acontece todos os dias. Entender essa divisão é fundamental para organizar o tempo, priorizar corretamente e garantir que nada fique para trás.

> [regra] Princípio central: A conciliação bancária acontece todos os dias. A inclusão de pagamentos acontece uma vez por semana, na segunda-feira. O restante da semana é dedicado a acompanhar, conciliar e tratar pendências.

## Segunda-feira — inclusão e programação de pagamentos
- [ ] Levantar todos os vencimentos da semana para cada cliente
- [ ] Incluir os pagamentos no sistema de gestão com as respectivas datas
- [ ] Verificar saldos bancários disponíveis para cobrir as obrigações
- [ ] Enviar para aprovação do cliente os pagamentos acima do limite de alçada
- [ ] Programar os pagamentos aprovados no internet banking

> [aviso] Atenção: Pagamentos acima do limite de alçada nunca devem ser programados sem aprovação formal do cliente — mesmo que seja um pagamento recorrente.

## Terça a sexta — conciliação e acompanhamento
- [ ] Executar a conciliação bancária diariamente (ver POP de Conciliação)
- [ ] Confirmar que os pagamentos programados foram processados pelo banco
- [ ] Registrar recebimentos e dar baixa em contas a receber
- [ ] Tratar pendências e urgências que surgirem ao longo do dia
- [ ] Responder dúvidas e solicitações dos clientes dentro do SLA

## Abertura do dia (todos os dias)
- [ ] Verificar e-mails e WhatsApp — identificar urgências antes de começar a operação
- [ ] Conferir se há pagamentos do dia que precisam de atenção
- [ ] Revisar pendências do dia anterior

## Fechamento do dia (todos os dias)
- [ ] Confirmar que a conciliação do dia foi finalizada
- [ ] Registrar pendências e observações para o dia seguinte
- [ ] Confirmar que não há pagamentos críticos sem processamento

> [dica] Bom indicador: Se o fechamento leva menos de 20 minutos, o dia foi bem executado. Se leva mais de 1 hora, há acúmulo de pendências — investigar a causa.`,
  },
  {
    title: "Conciliação Bancária Diária",
    category: "CONCILIACAO_BANCARIA",
    objective: "Comparar os lançamentos do sistema com o extrato real todos os dias, sem acumular.",
    tools: "Internet banking (OFX), sistema de gestão, planilha de despesas e receitas a identificar",
    responsible: "Assistente (tesouraria)",
    content: `## O que é e por que acontece todos os dias
Conciliação bancária é o processo de comparar os lançamentos do sistema de gestão com os extratos bancários reais, garantindo que o que está registrado reflete exatamente o que aconteceu nas contas do cliente.

Diferente da inclusão de pagamentos — que acontece uma vez por semana — a conciliação é feita diariamente. É ela que garante que os pagamentos programados foram de fato processados pelo banco, que recebimentos entraram corretamente e que nenhum lançamento ficou sem classificação.

> [regra] Regra inegociável: A conciliação não pode acumular. Um dia sem conciliar significa um dia de lançamentos não verificados. Em uma semana, isso pode gerar um relatório completamente incorreto.

## Como executar a conciliação diária
1. Exportar o extrato
   Acessar o internet banking e exportar o extrato do dia anterior (OFX).
2. Importar no sistema de gestão
   Importar o arquivo no sistema de gestão do cliente.
3. Tratar valores sem identificação
   Lançar na categoria "despesas a identificar" ou "receitas a identificar".
4. Avisar o cliente
   Atualizar a planilha de Despesas e Receitas a identificar e comunicar ao cliente para que ele identifique.
5. Conferir o saldo
   Confirmar que o saldo do sistema bate com o saldo do extrato bancário.

## O que verificar especialmente às segundas-feiras
Como os pagamentos são incluídos e programados na segunda, é neste dia que a conciliação tem papel mais crítico:
- [ ] Confirmar que os pagamentos programados estão refletidos no extrato
- [ ] Verificar se algum pagamento agendado da semana anterior não foi processado
- [ ] Identificar débitos automáticos ou tarifas bancárias não lançadas

## Divergências mais comuns e como tratar
| Divergência | Causa provável | Ação |
|---|---|---|
| Pagamento no banco, não no sistema | Lançamento não foi feito na inclusão | Lançar retroativamente com documento |
| Lançamento no sistema, não no banco | Agendamento não processado ou data errada | Verificar internet banking e corrigir |
| Valores diferentes | Juros, multa, desconto ou erro de digitação | Ajustar valor e documentar motivo |
| Transferência entre contas sem par | Lançada em apenas uma das contas | Registrar entrada e saída nas duas contas |
| Débito automático não identificado | Serviço bancário ou assinatura não mapeada | Identificar origem, classificar e informar cliente |

> [resultado] Meta: Conciliação 100% fechada ao final de cada dia. Saldo do sistema = saldo do extrato bancário.`,
  },
  {
    title: "Banco Inter — Configurar Acesso Secundário",
    category: "IMPLANTACAO",
    objective: "Criar usuário secundário no Inter Empresas com consulta e inclusão de operações, sem aprovar pagamentos.",
    tools: "Internet Banking PJ e App Inter Empresas (iSafe)",
    responsible: "Gestor do escritório",
    content: `## Objetivo
Criar um usuário secundário no Banco Inter Empresas com acesso limitado a consulta e inclusão de operações — sem permissão para aprovar pagamentos.

> [aviso] Atenção: Os dados do usuário secundário devem ser do gestor do escritório. O iSafe deve ser configurado no celular corporativo do escritório — nunca no celular pessoal de um colaborador.

## Parte 1 — Criar usuário secundário
1. Acessar a conta pelo Internet Banking PJ
2. Clicar na engrenagem (canto superior direito) → Gestão de Usuários
3. Clicar em Novo usuário
4. Preencher: nome, CPF (do gestor), e-mail, celular e data limite de vigência
5. Selecionar os grupos de acesso — ativar a chavinha para que fique verde
6. Clicar em Continuar
7. Selecionar o perfil de acesso e clicar em Salvar usuário
8. Autenticar com o código do iSafe gerado no App Inter Empresas

> [resultado] Resultado: O usuário secundário receberá um e-mail com o código de operador e uma senha provisória. A senha deve ser alterada no primeiro acesso.

## Parte 2 — Cadastrar iSafe no dispositivo corporativo
1. Abrir o App Inter Empresas no celular corporativo do escritório
2. Clicar em Fazer login → digitar o código de operador e a senha → Entrar
3. Ler as orientações e clicar em Cadastrar iSafe
4. Enviar a selfie seguindo as instruções do app → clicar em Ficou boa
5. Confirmar com o token enviado por SMS e depois o token por e-mail

> [regra] Passo final — aprovação pelo usuário Master: Após o cadastro do iSafe, o usuário Master deve acessar a conta e aprovar o cadastro do dispositivo em Gestão de Dispositivo.

> [resultado] Resultado: Acesso secundário configurado e pronto para operar no dispositivo corporativo do escritório.`,
  },
  {
    title: "Banco Itaú — Configurar Acesso Secundário",
    category: "IMPLANTACAO",
    objective: "Configurar operador secundário no Itaú Empresas com permissão apenas para inclusão de pagamentos.",
    tools: "Internet Banking Itaú Empresas (iToken)",
    responsible: "Gestor do escritório",
    content: `## Objetivo
Configurar um operador secundário com permissão apenas para inclusão de pagamentos — sem permissão para aprovar ou executar. O acesso deve ser criado com os dados do gestor do escritório e configurado no dispositivo corporativo.

> [aviso] Atenção: O CPF e os dados do operador devem ser do gestor ou dono do escritório — nunca de um colaborador. O token deve ser configurado no celular corporativo do escritório.

## Parte 1 — Criar perfil de acesso
1. Acessar Operadores e Perfis
   Dentro do Internet Banking do Itaú Empresas, acessar o menu mais... e clicar em Operadores e perfis.
2. Incluir novo perfil
   Na página Operadores e perfis, localizar o campo Perfis de acesso e clicar em Incluir. Escolher Criar novo perfil e clicar em Continuar.
3. Configurar o perfil
   Nome do perfil: "Contas a pagar" (ou similar). Tipo: Operador. Adicionar a conta disponível em Conta do perfil. Selecionar Operações de serviços financeiros. Escolher definir as mesmas operações para todas as contas e clicar em Continuar.
4. Definir operações permitidas
   Selecionar a conta em Contas para configuração e marcar apenas as operações necessárias — consulta de extrato e inclusão de pagamentos. Confirmar com o código iToken.

> [resultado] Resultado: Perfil de acesso criado com sucesso. Guardar o nome do perfil para usar na Parte 2.

## Parte 2 — Incluir operador
1. Acessar Gestão de Operadores
   Voltar ao menu Operadores e Perfis → Gestão de operadores → Criar novo operador.
2. Preencher dados do operador
   Permissões: Operador — apenas incluir operações. Tipo de documento: CPF (do gestor do escritório). Perfil: o criado na Parte 1. Informações adicionais: marcar as duas opções como Não. Confirmar com o código iToken.

> [resultado] Resultado: O Itaú enviará o código do operador e a senha temporária por e-mail. Guardar essas informações no cofre de senhas — serão usadas no primeiro acesso no dispositivo corporativo.`,
  },
  {
    title: "Banco Santander — Configurar Acesso Secundário",
    category: "IMPLANTACAO",
    objective: "Criar perfil e usuário secundário no Santander Empresas com consulta e inclusão de pagamentos, sem autorizar.",
    tools: "Internet Banking Santander Empresas (assinatura eletrônica e QR Code)",
    responsible: "Gestor do escritório",
    content: `## Objetivo
Criar um perfil de acesso e um usuário secundário no Santander Empresas com permissão para consulta e inclusão de pagamentos — sem permissão para autorizar operações.

> [aviso] Atenção: Os dados do usuário secundário devem ser do gestor do escritório. O acesso deve ser configurado no dispositivo corporativo — nunca no equipamento pessoal de colaboradores. O campo Perfil de Autorização deve sempre ficar sem acesso.

## Parte 1 — Criar perfil de acesso
1. Acessar Administrativo
   No Internet Banking do Santander, acessar o menu Administrativo → Perfil de Acesso → Incluir.
2. Preencher dados do perfil
   Informar o nome do perfil (ex.: "BPO Inclusão"), preencher a descrição e clicar em Continuar.
3. Definir serviços permitidos
   Marcar apenas as opções de Consulta e Extrato — não marcar opções de autorização ou aprovação. Clicar em Continuar.
4. Finalizar
   Revisar os dados, preencher a Assinatura Eletrônica e validar com o QR Code. Guardar o nome do perfil criado.

## Parte 2 — Criar usuário secundário
1. Acessar Usuário Secundário
   Voltar ao menu Administrativo → Usuário Secundário → Incluir.
2. Preencher dados do usuário
   Nome, CPF (do gestor do escritório) e telefones. Definir o nome de acesso e a senha.
3. Vincular ao perfil de acesso
   Localizar a conta bancária e selecionar o perfil criado na Parte 1. Deixar o Perfil de Autorização em branco (sem acesso) — obrigatório. Vincular uma conta por usuário: se houver mais de uma conta Santander, criar um usuário secundário para cada.
4. Definir permissões de pagamento
   Marcar todas as opções referentes a pagamentos e cobrança para emissão de boletos. Clicar em Continuar.
5. Finalizar
   Confirmar os dados, preencher a Assinatura Eletrônica e validar com o QR Code.

> [dica] Dica: O Santander recomenda não usar espaço entre nome e sobrenome no campo Nome. O CPF deve ser diferente do usuário Master.

## Parte 3 — Validar o usuário criado
Após criar o perfil e o usuário secundário, é necessário realizar o primeiro acesso com o novo usuário no internet banking para ativar o cadastro.

> [resultado] Resultado: Usuário criado, vinculado ao perfil e validado — acesso secundário pronto para operar no dispositivo corporativo do escritório.`,
  },
  {
    title: "Controles Internos e Segregação",
    category: "OUTRAS",
    objective: "Proteger cliente, escritório e profissionais com segregação de funções e regras de acesso.",
    tools: "Cofre de senhas, Drive, sistema de gestão",
    responsible: "Gestor BPO",
    content: `## Por que controles internos existem
Controles internos protegem o cliente, o escritório e os próprios profissionais do BPO. Erros acontecem; fraudes também. Um ambiente controlado minimiza ambos e facilita auditorias.

## Segregação de funções — a base de tudo
O BPO opera com acesso secundário e limitado aos sistemas bancários dos clientes. Isso significa que o analista pode visualizar extratos e incluir pagamentos para aprovação — mas nunca aprovar ou executar. Essa limitação é estrutural e intencional.

| Operação | Quem faz no BPO | Quem aprova/executa |
|---|---|---|
| Lançamento no sistema de gestão | Analista BPO | — (operação interna) |
| Inclusão de pagamentos no banco | Analista BPO (acesso limitado) | Cliente (aprova no próprio banco) |
| Aprovação e execução de pagamentos | Nunca o BPO | Sempre o cliente |
| Cadastro de novo fornecedor | Analista BPO (no sistema) | Cliente confirma antes da inclusão no banco |
| Alteração de chave Pix ou dados bancários | Nunca o BPO | Cliente — por escrito com histórico gravado. Nunca executar sem comprovação escrita |
| Concessão de acesso bancário ao BPO | — | Cliente configura o acesso limitado no banco |

## Regras de acesso — inegociáveis
> [regra] Regra absoluta: Todos os acessos secundários aos sistemas dos clientes devem estar cadastrados em nome do gestor ou dono do escritório — nunca em nome de colaboradores. E sempre em dispositivos (celulares e computadores) do escritório, nunca em equipamentos pessoais de funcionários.

Essa regra existe por razões práticas e de proteção:
- **Colaborador sai da empresa:** se o acesso estava no celular ou conta dele, o cliente fica exposto e a revogação é complexa
- **Dispositivo pessoal comprometido:** dados bancários do cliente ficam em risco sem que o escritório tenha controle
- **Responsabilidade jurídica:** em caso de incidente, o acesso em nome do gestor e em dispositivo do escritório deixa claro quem é o responsável operacional

### Como deve ser configurado
| Item | Correto | Nunca fazer |
|---|---|---|
| Token/acesso bancário | Celular do escritório, em nome do gestor | Celular pessoal de colaborador |
| Login bancário secundário | E-mail ou CPF do gestor/dono | CPF ou e-mail de colaborador |
| Aplicativo de banco do cliente | Dispositivo corporativo do escritório | Celular pessoal de qualquer colaborador |
| Certificado digital | Dispositivo do escritório, sob responsabilidade do gestor | Computador pessoal de colaborador |

## O que fazer quando um colaborador sai
Como os acessos estão nos dispositivos do escritório e em nome do gestor, a saída de um colaborador não afeta os acessos dos clientes. Basta revogar o acesso dele às ferramentas internas do BPO (sistema de gestão, Drive, grupos de WhatsApp).

## Revisão mensal de controles
- [ ] Confirmar que nenhum acesso bancário está em dispositivo pessoal de colaborador
- [ ] Revisar usuários ativos no sistema de gestão — remover inativos
- [ ] Confirmar que todos os pagamentos da semana foram aprovados pelo cliente no banco
- [ ] Verificar se há novos fornecedores cadastrados sem confirmação do cliente
- [ ] Verificar se há documentos salvos localmente nas máquinas — mover para o Drive imediatamente
- [ ] Confirmar que o Drive está instalado e sincronizado em todas as máquinas do escritório
- [ ] Checar se a estrutura de pastas dos clientes no Drive está organizada e atualizada

> [aviso] Golpes de Pix: Qualquer solicitação de alteração de dados bancários ou chave Pix deve ter autorização escrita do cliente com histórico gravado — WhatsApp, e-mail ou qualquer canal que mantenha registro. Nunca executar sem comprovação escrita. Em caso de dúvida sobre a autenticidade da solicitação, ligar para confirmar.`,
  },
  {
    title: "Distrato de Cliente (Saída da Operação)",
    category: "RELACIONAMENTO",
    objective: "Finalizar o cliente de forma organizada, segura e documentada, cumprindo contrato e LGPD.",
    tools: "Assinatura eletrônica, Drive, gravação de vídeo",
    responsible: "Gestor BPO",
    content: `## Objetivo
Garantir a finalização organizada, segura e documentada do cliente, assegurando a entrega de todas as informações, o cumprimento contratual e as diretrizes da LGPD. Um offboarding bem executado protege o escritório juridicamente e preserva a reputação — o cliente que sai bem tratado indica.

> [aviso] Pontos críticos: Nunca deixar cliente sair sem backup completo. Sempre gravar o vídeo explicativo. Formalizar tudo por escrito. Cumprir o prazo de LGPD.

## 1. Formalização do distrato
No mesmo dia em que a solicitação de saída for confirmada:
- [ ] Elaborar e enviar o documento de distrato para assinatura eletrônica
- [ ] Validar a cláusula contratual de aviso prévio de 30 dias
- [ ] Enviar o boleto referente ao período de aviso prévio para aprovação do cliente

> [aviso] Atenção: O aviso prévio de 30 dias é contratual. Mesmo que o cliente queira sair antes, o período deve ser cumprido ou negociado formalmente — nunca ignorado.

## 2. Organização e backup das informações
Criar uma pasta final do cliente no Drive contendo toda a documentação gerida durante a operação:
- Documentos operacionais
- Relatórios gerenciais de todo o período
- Comprovantes de pagamentos realizados
- Demais arquivos geridos durante a operação

Gerar e incluir na pasta:
- Planilha de contas a pagar em aberto e futuras
- Contas a receber futuras (se aplicável)

## 3. Registro em vídeo
Gravar um vídeo explicativo mostrando:
- A estrutura das pastas organizadas
- A localização de cada tipo de documento
- A explicação do que está sendo entregue e para que serve

> [info] Por que o vídeo é obrigatório: Elimina qualquer dúvida futura do cliente sobre o que foi entregue e como estava organizado. Evita retrabalho, pedidos posteriores e qualquer questionamento sobre a qualidade da entrega.

## 4. Compartilhamento com o cliente
Compartilhar a pasta via link do Google Drive com prazo de 10 dias para download, conforme diretrizes da LGPD. Após esse prazo, o acesso é removido.

## 5. Comunicação formal ao cliente
Enviar o comunicado assim que a pasta estiver pronta:

> [info] Assunto: Processo de Distrato – [Nome da Empresa]. Disponibilizaremos uma pasta com todos os documentos que estiveram conosco durante nossa gestão, compartilhada via link para download por até 10 dias, conforme a LGPD. Você receberá também uma planilha com as contas a pagar em aberto e futuras. Ainda hoje enviaremos o documento de distrato para assinatura; conforme contrato, há aviso prévio de 30 dias e encaminharemos o boleto correspondente para aprovação. A documentação será disponibilizada hoje, com exceção do fechamento do mês vigente, que será enviado após conclusão e integração com a contabilidade. O acesso ao nosso sistema será suspenso após a finalização do processo.

## 6. Sistemas e acessos
### Se o software for do BPO
- Verificar interesse do cliente em assumir a assinatura
- Caso positivo: transferir a responsabilidade da assinatura para o cliente
- Caso negativo: cancelar ou descontinuar o acesso após o período de offboarding

### Se o software for do cliente
- Solicitar formalmente ao cliente a remoção do acesso do escritório de todos os sistemas — sistema de gestão, internet banking, certificados digitais e qualquer outro acesso concedido

## 7. Encerramento
Antes de arquivar o cliente como inativo, confirmar que todos os itens foram concluídos:
- [ ] Distrato assinado pelo cliente
- [ ] Pagamento do aviso prévio realizado
- [ ] Pasta final organizada e vídeo gravado
- [ ] Link enviado e download confirmado dentro do prazo
- [ ] Acessos internos do escritório suspensos
- [ ] Acesso do escritório removido dos sistemas do cliente
- [ ] Cliente arquivado como inativo no sistema

> [dica] Lembrar: O cliente que sai bem tratado indica. O offboarding é a última impressão que o escritório deixa — deve ser tão profissional quanto o onboarding.`,
  },
  {
    title: "Estrutura e Rituais de Gestão",
    category: "ESTRATEGICO",
    objective: "Definir funções (assistente, analista, gestor), quando contratar e os rituais diário, semanal e mensal.",
    responsible: "Gestor BPO",
    content: `## Estrutura de funções
A operação do BPO é dividida em papéis distintos com responsabilidades complementares. Essa separação garante qualidade, rastreabilidade e reduz o risco de erros passarem despercebidos.

| Função | Responsabilidade principal | O que faz no dia a dia |
|---|---|---|
| Assistente (Tesouraria) | Operacional | Lança pagamentos e recebimentos, inclui pagamentos no banco, executa conciliação bancária diária, organiza documentos no Drive, prepara relatório de aprovação para o cliente |
| Analista | Conferência e qualidade | Confere o que o assistente executou, valida a conciliação no fechamento, revisa o relatório gerencial antes da entrega, identifica inconsistências e garante a qualidade da entrega |
| Gestor BPO | Estratégico e comercial | Supervisiona a operação, cuida do relacionamento com clientes, integra novos clientes, define processos e garante o crescimento do escritório |

> [regra] Princípio: O assistente executa, o analista confere. Nunca a mesma pessoa que lançou é a mesma que valida — essa separação é o principal controle de qualidade da operação.

## Quem está começando — assistente e analista ao mesmo tempo
No início da operação, é comum que uma única pessoa acumule os dois papéis — faz o operacional e confere o próprio trabalho. Isso é esperado e funciona, desde que haja consciência do risco: sem uma segunda pessoa conferindo, erros podem passar.

> [aviso] Transição importante: Assim que o volume de clientes permitir, a primeira contratação deve ser de um assistente — para que o fundador/gestor passe a atuar como analista e gestor, saindo do operacional. Manter o gestor no operacional limita o crescimento do escritório.

## Como saber a hora de contratar
Não existe um número fixo de clientes que define quando contratar — depende do perfil de cada cliente, do volume de movimentações, da complexidade e dos sistemas utilizados. O que define a necessidade de reforço é a qualidade, não a quantidade. Sinais de que está na hora:
- A conciliação está acumulando dias sem fechar
- Relatórios sendo entregues fora do prazo com frequência
- Tempo de resposta ao cliente degradando
- O gestor está no operacional e sem tempo para novos clientes
- Erros de lançamento aumentando — sinal de sobrecarga

> [dica] Regra prática: Quando o gestor perceber que não consegue mais sair do operacional para cuidar do crescimento do escritório, está na hora de contratar um assistente.

## Fluxo de conferência no fechamento
O analista não opera no dia a dia — sua atuação concentra-se no fechamento, quando confere tudo que o assistente executou durante o mês:
- [ ] Conciliação bancária 100% fechada — saldo do sistema bate com o extrato
- [ ] Todos os pagamentos lançados têm documento de suporte arquivado no Drive
- [ ] Recebimentos registrados e baixados corretamente
- [ ] DRE e fluxo de caixa consistentes com os lançamentos
- [ ] Relatório gerencial revisado antes de enviar ao cliente

## Rituais de gestão
### Daily — 15 min (diária)
Assistente e analista alinham: o que foi feito, o que será feito hoje e se há algum impedimento. Foco em urgências e vencimentos do dia.
### Weekly — 30 min (semanal)
Revisão da semana, redistribuição de carga se necessário e alinhamento das prioridades da semana seguinte. Momento de o analista dar feedback ao assistente sobre a qualidade dos lançamentos.
### Monthly — 60 min (mensal)
Após o fechamento de todos os clientes: revisão de qualidade, análise de NPS, identificação de melhorias de processo e reconhecimento de resultados.`,
  },
  {
    title: "Gestão de Erros e Situações de Crise",
    category: "RELACIONAMENTO",
    objective: "Resolver primeiro, comunicar depois: como tratar erros, reclamações e acesso bancário comprometido.",
    responsible: "Gestor BPO",
    content: `## Princípio fundamental
Erros acontecem em qualquer operação. O que diferencia um BPO profissional não é a ausência de erros — é a forma como lida com eles. A postura é sempre a mesma: resolver primeiro, comunicar depois. O cliente nunca deve receber um pedido de desculpa sem a solução junto.

> [regra] Regra de ouro: Antes de ligar ou mandar mensagem para o cliente sobre um erro, tenha o problema resolvido ou um plano concreto de resolução em mãos. Comunicar o erro sem a solução gera ansiedade e desconfiança — comunicar com a solução demonstra competência mesmo na adversidade.

## Pagamento feito errado ou duplicado
1. Identificar a origem do erro
   Antes de qualquer ação, entender o que aconteceu: erro de digitação? Pagamento duplicado? Fornecedor errado? O erro partiu do assistente, do processo ou de uma informação incorreta do cliente?
2. Resolver
   Se o erro foi do escritório, ele ressarce o cliente pelo valor do prejuízo — sem discussão (juros, multa ou diferença devolvidos integralmente). Se foi informação incorreta do cliente, apresentar os fatos com evidências (print, e-mail, formulário) e tratar como aprendizado para melhorar o fluxo de aprovação.
3. Comunicar ao cliente com a solução
   Somente após ter a solução definida, comunicar de forma direta e objetiva: o que aconteceu, como foi resolvido e o que foi ajustado no processo para não repetir.
4. Ajustar o processo
   Identificar em qual etapa o erro poderia ter sido evitado e implementar o ajuste antes de seguir em frente.

> [info] Postura correta: "Identificamos um erro no pagamento de [fornecedor]. Já realizamos o ressarcimento de R$ X e ajustamos o processo de conferência para que isso não se repita. Segue o comprovante."

## Relatório entregue com erro
Mesmo processo: identificar a origem, corrigir o relatório, e só então comunicar ao cliente — já com o relatório correto em mãos.
- Erro de lançamento do assistente: corrigir os lançamentos, reconciliar e reemitir o relatório
- Erro de conferência do analista: revisar o processo de conferência antes do próximo fechamento
- Nunca enviar um relatório corrigido sem explicar brevemente o que mudou e por quê

> [aviso] Transparência com limite: Ser transparente sobre o erro é obrigatório. Entrar em detalhes técnicos longos que confundem o cliente, não. Comunicação clara e objetiva.

## Cliente reclamando
1. Ouvir sem se defender
   Antes de qualquer resposta, ouvir o cliente completamente. Não interromper, não justificar, não minimizar. O cliente precisa sentir que foi ouvido — mesmo que a reclamação não seja procedente.
2. Avaliar se é procedente
   Com calma e dados em mãos, avaliar se a reclamação tem fundamento.
3. Avaliar o perfil do cliente
   Alguns clientes reclamam de forma recorrente e sem motivo concreto. Quando vira padrão que consome energia desproporcional da equipe, é legítimo considerar encerrar o contrato.

| Situação | Ação |
|---|---|
| Reclamação procedente | Reconhecer, resolver, ajustar o processo e comunicar o que foi feito |
| Reclamação improcedente | Apresentar os fatos com evidências de forma respeitosa, sem confronto |

> [aviso] Demitir um cliente: É uma decisão válida e às vezes necessária. Um cliente que gera estresse constante, desrespeita a equipe ou exige além do escopo contratado sem remunerar por isso não é um bom cliente — independentemente do valor que paga. A saúde da equipe e a qualidade do serviço para os outros clientes vêm primeiro.

### Como encerrar um contrato com profissionalismo
- Comunicar por escrito, com prazo adequado (respeitar o contrato)
- Organizar e entregar toda a documentação do cliente de forma impecável
- Não explicar em detalhes os motivos — "não temos mais capacidade de atender no padrão que você merece" é suficiente
- Manter o tom profissional até o último dia — a reputação também é construída em como termina os relacionamentos

## Acesso bancário comprometido
Esta é a situação mais grave. Envolve risco financeiro real para o cliente e responsabilidade operacional do escritório.

### Resposta imediata
- [ ] Suspender imediatamente qualquer operação no banco afetado
- [ ] Comunicar o cliente de forma urgente — por ligação, não por mensagem
- [ ] Orientar o cliente a bloquear o acesso comprometido diretamente no banco
- [ ] Não tentar "resolver por dentro" sem envolver o cliente — transparência total

### Investigação
Após conter o problema, investigar com rigor se o processo de segurança foi realmente seguido:
- O acesso estava em dispositivo corporativo do escritório ou em equipamento pessoal?
- O token estava no celular do gestor ou de um colaborador?
- Havia 2FA ativo?
- Houve acesso de rede pública ou desconhecida?

> [aviso] Se o processo não foi seguido: É uma falha grave de controle interno. Além de resolver o problema imediato, revisar todos os outros acessos bancários dos clientes e reforçar as regras com toda a equipe — sem exceção.

> [info] Se o processo foi seguido corretamente: O comprometimento veio de fora do escritório (banco, dispositivo do cliente etc.). Ainda assim, apoiar o cliente em todo o processo de regularização junto ao banco.`,
  },
  {
    title: "Padrões de Atendimento e SLAs",
    category: "RELACIONAMENTO",
    objective: "Definir canais, prazos de resposta, comunicação proativa e a condução da reunião mensal.",
    responsible: "Gestor e assistente",
    content: `## Atendimento como diferencial competitivo
No BPO Financeiro, o atendimento não é suporte — é consultoria contínua. O cliente não contratou um serviço; contratou tranquilidade. Cada interação deve transmitir segurança, competência e proatividade.

## SLAs de atendimento
| Canal | Horário de atendimento | Tempo de resposta |
|---|---|---|
| WhatsApp | Seg–Sex, 9h–16h | Até 2 horas |
| E-mail | Seg–Sex, 9h–16h | Até 4 horas |
| Ligação (urgência) | Seg–Sex, 9h–16h | Retorno em até 30 min |
| Fora do horário | — | Próximo dia útil pela manhã |

## Comunicação proativa — o que comunicar sem o cliente perguntar
- [ ] Vencimentos críticos nos próximos 3 dias (acima do limite de alçada)
- [ ] Inadimplência identificada acima de 7 dias
- [ ] Saldo bancário abaixo do mínimo operacional acordado
- [ ] Inconsistência ou divergência relevante encontrada durante a conciliação
- [ ] Qualquer risco financeiro identificado na operação

> [regra] Princípio: O cliente não deve descobrir um problema financeiro antes de você. Se descobriu, houve falha no monitoramento.

## Como conduzir a reunião de relatório
A reunião mensal é o principal ponto de contato consultivo. Estrutura sugerida:
1. Abertura (5 min)
   Como foi o mês do cliente e agenda da reunião.
2. Resultado financeiro (15 min)
   DRE, fluxo de caixa, comparativos.
3. Insights e análise (10 min)
   O que os números indicam.
4. Recomendações e próximos passos (10 min)
   O que o BPO recomenda e o que será feito.
5. Perguntas e alinhamentos (5 min)
   Dúvidas do cliente e combinados finais.`,
  },
  {
    title: "Padrões de Qualidade e NPS",
    category: "RELACIONAMENTO",
    objective: "Medir a qualidade da operação com indicadores e aplicar a pesquisa NPS mensal.",
    responsible: "Gestor BPO",
    content: `## Qualidade no BPO é prevenção
Um erro de lançamento pode parecer pequeno, mas acumula e gera relatórios incorretos, decisões equivocadas e perda de confiança. A qualidade no BPO é construída em processos, não em revisões de última hora.

## Indicadores de qualidade operacional
| Indicador | Meta | Alerta |
|---|---|---|
| Conciliação diária (%) | 100% dos dias úteis | Abaixo de 90% |
| Entrega de relatório no prazo (%) | 100% | Qualquer atraso |
| Taxa de erro em lançamentos | Abaixo de 0,5% | Acima de 1% |
| Tempo médio de resposta ao cliente | Até 2h (WhatsApp) | Acima de 4h |
| NPS mensal | Acima de 70 | Abaixo de 50 |

## Pesquisa NPS — como aplicar
Enviar mensalmente para todos os clientes, preferencialmente no mesmo dia da reunião de relatório. Pergunta padrão: "Em uma escala de 0 a 10, o quanto você indicaria nosso BPO para outro empresário?"

### Como agir por nota
- **9–10 (Promotores):** pedir indicação ativamente — esse é o melhor momento
- **7–8 (Neutros):** identificar o que falta para chegar a 9
- **0–6 (Detratores):** contato imediato do gestor — entender, resolver e documentar

> [aviso] Insight: NPS abaixo de 7 é sinal de cancelamento a caminho. Não espere o cliente cancelar para agir.`,
  },
  {
    title: "Prospecção e Processo Comercial",
    category: "ESTRATEGICO",
    objective: "Definir o perfil ideal de cliente (ICP), a cadência de prospecção, o diagnóstico e as respostas a objeções.",
    tools: "WhatsApp, ligação, CRM do sistema",
    responsible: "Gestor BPO",
    content: `## Perfil ideal de cliente (ICP)
Prospectar sem critério gera propostas perdidas, clientes difíceis e operação sobrecarregada. Definir e respeitar o ICP é a base de um crescimento saudável.

| Critério | Perfil ideal | Sinal de alerta |
|---|---|---|
| Faturamento | R$ 100k – R$ 3M/mês | Abaixo de R$ 50k ou acima de R$ 5M sem estrutura |
| Segmento | Serviços, comércio, indústria leve | Agronegócio, construção pesada, multinacional |
| Maturidade financeira | Reconhece que tem problema financeiro | "Está tudo bem, só quero otimizar" |
| Tomador de decisão | Acesso direto ao dono ou CEO | Precisa "consultar sócios" indefinidamente |

## Cadência de prospecção
| Dia | Ação | Objetivo |
|---|---|---|
| D+0 | Primeiro contato por WhatsApp | Gerar curiosidade, não vender |
| D+2 | Follow-up com conteúdo de valor | Demonstrar autoridade |
| D+4 | Tentativa de ligação | Qualificar e agendar diagnóstico |
| D+7 | WhatsApp com proposta de diagnóstico gratuito | Baixar a barreira de entrada |
| D+14 | Último contato | Fechar ou encerrar |

## O diagnóstico de 30 minutos
O diagnóstico não é uma reunião de vendas — é uma consultoria gratuita. O objetivo é mapear a situação financeira real do prospect e mostrar, com dados reais, onde o BPO gera valor.

> [regra] Princípio: Venda o diagnóstico, não o BPO. O fechamento acontece dentro do diagnóstico, quando o cliente enxerga o próprio problema — nunca antes.

## Objeções mais comuns e como tratar
| Objeção | Abordagem |
|---|---|
| "Já tenho contador" | Contador cuida do fiscal. BPO é gestão de caixa, margem e decisão. São complementares. |
| "Não é o momento" | O que está travando — agenda ou orçamento? Abrir espaço para ajustar a proposta. |
| "É caro" | Qual o custo de não saber quanto a empresa realmente ganha? Reposicionar valor. |
| "Me manda material" | Personalizar antes de enviar: qual é a maior dificuldade hoje — fluxo, margem ou separação PF/PJ? |`,
  },
  {
    title: "Relatório Gerencial Mensal",
    category: "RELATORIOS_GERENCIAIS",
    objective: "Entregar até o 5º dia útil um relatório com DRE, fluxo de caixa, indicadores e análise.",
    tools: "Sistema de gestão, planilhas",
    responsible: "Analista (revisão) e assistente",
    content: `## O relatório como entregável central
O relatório mensal é a principal evidência de valor do BPO para o cliente. É o momento em que meses de lançamentos, conciliações e controles se transformam em decisões de negócio. Relatórios bem feitos retêm clientes; relatórios medíocres perdem contratos.

> [resultado] Meta de entrega: Até o 5º dia útil do mês seguinte. Atrasos no relatório são percebidos como desorganização — mesmo que a operação tenha sido impecável.

## Estrutura padrão do relatório
1. Capa e sumário executivo
   Nome do cliente, período de referência, responsável e 3 a 5 insights do mês em linguagem não técnica. O dono da empresa lê o sumário primeiro — se não entender, o resto não importa.
2. DRE gerencial
   Receita bruta → Deduções e impostos → Receita líquida → Custos diretos → Margem bruta → Despesas operacionais → EBITDA → Resultado líquido. Comparativo com mês anterior e com orçado (se houver).
3. Fluxo de caixa realizado
   Entradas e saídas por categoria, saldo inicial e final de cada conta bancária, principais pagamentos e recebimentos do período.
4. Indicadores-chave
   Margem bruta, margem líquida, ponto de equilíbrio, taxa de inadimplência e índice de liquidez corrente (veja a tabela abaixo).
5. Análise e recomendações
   Seção mais valiosa do relatório. Deve responder: o que mudou em relação ao mês anterior? Por quê? O que precisa de atenção? Qual é a recomendação do BPO?

## Indicadores-chave
| Indicador | O que mede |
|---|---|
| Margem bruta | Rentabilidade do produto/serviço |
| Margem líquida | Rentabilidade real do negócio |
| Ponto de equilíbrio | Receita mínima para não ter prejuízo |
| Taxa de inadimplência | % de recebíveis em atraso |
| Índice de liquidez corrente | Capacidade de pagar obrigações de curto prazo |

> [dica] Dica: O cliente paga o BPO pela análise, não apenas pelos lançamentos. Um relatório sem análise é uma planilha cara.`,
  },
  {
    title: "Stack Tecnológico da Operação",
    category: "DOCUMENTACAO",
    objective: "Listar as ferramentas, as regras de acesso e a regra de guardar documentos somente no Drive.",
    tools: "Sistema de gestão, Drive, cofre de senhas",
    responsible: "Gestor BPO",
    content: `## Ferramentas essenciais
| Categoria | Ferramenta | Uso no BPO |
|---|---|---|
| Sistema de gestão | Omie / Conta Azul / Bling | Lançamentos, relatórios, DRE |
| Comunicação | WhatsApp Business / Slack | Atendimento ao cliente e equipe |
| Armazenamento | Google Drive | Documentos, relatórios, arquivos |
| Planilhas e análise | Google Sheets / Excel | DRE, fluxo de caixa, análises |
| Reuniões | Google Meet / Zoom | Reuniões de relatório e integração |
| Assinatura eletrônica | Docusign / D4Sign | Contratos e aprovações formais |

## Regras de acesso e segurança
> [regra] Regra inegociável: Todos os acessos bancários dos clientes devem estar cadastrados em nome do gestor ou dono do escritório, e instalados exclusivamente em dispositivos corporativos do escritório — nunca em celulares ou computadores pessoais de colaboradores.

- Autenticação de dois fatores (2FA) em todos os sistemas — sem exceção
- Tokens bancários configurados apenas no celular corporativo do escritório, sob responsabilidade do gestor
- Acessos bancários secundários vinculados ao CPF/e-mail do gestor — nunca de colaboradores
- Senhas únicas por sistema, gerenciadas em cofre de senhas do escritório (Bitwarden, 1Password)
- Acesso a internet banking somente via dispositivos corporativos e rede segura

### Por que essa regra protege o escritório
Se o acesso está no dispositivo e em nome do colaborador, e ele sai da empresa, o cliente fica exposto. O processo de revogação depende da cooperação do ex-colaborador e do banco — o que nem sempre acontece rápido. Com o acesso no dispositivo do escritório e em nome do gestor, a saída de qualquer colaborador não afeta a segurança dos clientes.

> [aviso] Wi-Fi público ou dispositivo pessoal: Acesso bancário de clientes a partir de rede pública ou equipamento pessoal é proibido. O risco de comprometimento é alto e a responsabilidade operacional recai sobre o BPO.

## Regra de armazenamento de documentos
> [aviso] Proibido salvar documentos no computador. Todos os documentos — sem exceção — devem ser salvos exclusivamente no Google Drive. Nenhum arquivo de cliente pode ficar armazenado localmente em qualquer máquina do escritório.

### Por que essa regra existe
- **Segurança:** documento salvo localmente fica fora do controle do escritório se a máquina for roubada, danificada ou acessada por alguém não autorizado
- **Continuidade:** se um colaborador falta ou sai, qualquer outro consegue acessar o que precisa
- **Backup automático:** o Drive mantém histórico de versões e backup contínuo
- **Conformidade:** extratos, contratos e NFs são dados sensíveis — o Drive permite controle de acesso

### Como deve funcionar na prática
| Situação | Correto | Proibido |
|---|---|---|
| Recebeu um boleto por e-mail | Salvar direto na pasta do cliente no Drive | Salvar na área de trabalho ou Downloads |
| Gerou um relatório | Salvar na pasta Relatórios do cliente no Drive | Salvar no computador e enviar depois |
| Baixou um extrato bancário | Mover imediatamente para a pasta Extratos no Drive | Deixar na pasta Downloads |
| Recebeu contrato assinado | Arquivar na pasta Contratos do cliente no Drive | Manter apenas no e-mail ou computador |

## Configuração obrigatória em todas as máquinas
O Google Drive para Desktop deve estar instalado e sincronizado em todos os computadores do escritório.
- [ ] Drive instalado e conta do escritório logada em todas as máquinas
- [ ] Pasta do Drive visível no explorador de arquivos — facilita o hábito de salvar no lugar certo
- [ ] Nunca usar conta pessoal do Google para armazenar documentos de clientes
- [ ] Em nova máquina ou colaborador novo, instalar o Drive é o primeiro passo antes de qualquer outra configuração`,
  },
  {
    title: "Régua de Cobrança e Recebimentos",
    category: "COBRANCA",
    objective: "Monitorar recebimentos, identificar inadimplência e, se o escritório optar, executar a régua de cobrança.",
    tools: "Sistema de gestão, WhatsApp, e-mail",
    responsible: "Assistente",
    content: `## Objetivo
Monitorar os recebimentos dos clientes, identificar inadimplência e — quando o escritório optar por isso — executar a régua de cobrança. Inadimplência não monitorada compromete o fluxo de caixa do cliente e a qualidade dos relatórios financeiros.

> [info] Decisão de cada escritório: Fazer a cobrança ativa é uma recomendação — não uma obrigação. Alguns escritórios fazem, outros apenas monitoram e alertam o cliente para que ele mesmo cobre. O importante é definir isso no kick-off e deixar claro no contrato o que está incluído no escopo.

## O que o BPO sempre faz — independente de cobrar ou não
- [ ] Monitorar diariamente os recebimentos previstos vs. realizados
- [ ] Alertar o cliente sempre que identificar inadimplência relevante
- [ ] Nunca registrar um recebimento sem confirmar que o dinheiro entrou na conta — sempre verificar antes de dar baixa
- [ ] Separar inadimplência de atraso eventual — um cliente que paga com 2 dias de atraso todo mês não é inadimplente, é um padrão a monitorar

## Régua de cobrança — para escritórios que optam por fazer
| Momento | Ação | Canal | Tom |
|---|---|---|---|
| D-3 (antes do vencimento) | Lembrete preventivo | WhatsApp | Amigável |
| D+1 | Cobrança com 2ª via do boleto | WhatsApp + e-mail | Direto |
| D+5 | Cobrança com juros calculados | E-mail formal | Formal |
| D+15 | Proposta de negociação | Ligação | Consultivo |
| D+30 | Encaminhar ao cliente para decisão | Reunião | Estratégico |

> [aviso] Antes de qualquer cobrança: Verificar se o pagamento já foi feito e ainda não foi conciliado. Cobrar um cliente que já pagou é um erro grave de relacionamento.`,
  },
];
