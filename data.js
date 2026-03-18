export const stages = [
  { id: 'entry', name: 'Entrada' },
  { id: 'qualified', name: 'Qualificado' },
  { id: 'negotiation', name: 'Negociação' },
  { id: 'proposal', name: 'Proposta' },
  { id: 'won', name: 'Fechado' },
]

export const leads = [
  {
    id: 'lead-1',
    name: 'Ana Ribeiro',
    company: 'Vértice Educação',
    owner: 'Carla',
    source: 'Indicação',
    stage: 'negotiation',
    temperature: 'hot',
    value: 18000,
    nextAction: 'Hoje, 16:30',
    status: 'Em risco',
    lastReplyHours: 18,
    summary: {
      text: 'Lead quente, avaliando substituição de planilhas por um cockpit comercial.',
      objections: ['Receio de adesão do time', 'Dúvida sobre velocidade de onboarding'],
      signals: ['Pediu ROI', 'Perguntou sobre setup guiado'],
      nextBestAction: 'Enviar caso real + proposta com urgência suave.',
      suggestedReply:
        'Ana, se eu te mostrar como seu time passa a operar follow-up com clareza ainda nesta semana, faz sentido fecharmos a ativação hoje?',
    },
  },
  {
    id: 'lead-2',
    name: 'Lucas Neri',
    company: 'Neri Advisory',
    owner: 'Marcos',
    source: 'Instagram',
    stage: 'qualified',
    temperature: 'warm',
    value: 7500,
    nextAction: 'Hoje, 14:00',
    status: 'Qualificado',
    lastReplyHours: 6,
    summary: {
      text: 'Lead comparando Revenue OS com CRM genérico.',
      objections: ['Quer entender diferença prática vs Pipedrive'],
      signals: ['Abriu pricing', 'Pediu demo curta'],
      nextBestAction: 'Mostrar diferença em follow-up e analytics operacional.',
      suggestedReply:
        'Lucas, te mostro em 4 minutos como o Revenue OS reduz leads esquecidos e dá previsibilidade real ao gestor.',
    },
  },
  {
    id: 'lead-3',
    name: 'Clínica Lumina',
    company: 'Clínica Lumina',
    owner: 'Carla',
    source: 'Google',
    stage: 'proposal',
    temperature: 'hot',
    value: 32000,
    nextAction: 'Amanhã, 09:00',
    status: 'Proposta enviada',
    lastReplyHours: 4,
    summary: {
      text: 'Operação com secretárias comerciais e necessidade de SLA visível.',
      objections: ['Quer validar processo de onboarding'],
      signals: ['Solicitou proposta anual', 'Chamou o gestor para a call final'],
      nextBestAction: 'Confirmar call decisória e reforçar ganhos de visibilidade.',
      suggestedReply:
        'Conseguimos estruturar o time com follow-up e prioridades já no onboarding. Queremos validar isso com vocês na call de amanhã.',
    },
  },
  {
    id: 'lead-4',
    name: 'Juliana Costa',
    company: 'JC Consultoria',
    owner: 'Rafa',
    source: 'Instagram',
    stage: 'entry',
    temperature: 'warm',
    value: 12000,
    nextAction: 'Hoje, 18:00',
    status: 'Novo lead',
    lastReplyHours: 2,
    summary: {
      text: 'Lead inbound pedindo diagnóstico da operação comercial.',
      objections: ['Ainda sem objeções claras'],
      signals: ['Respondeu rápido', 'Mandou áudio com cenário atual'],
      nextBestAction: 'Fazer qualificação em call curta.',
      suggestedReply:
        'Juliana, consigo te mostrar rapidamente onde sua operação pode estar perdendo receita por desorganização comercial.',
    },
  },
]

export const tasks = [
  { time: '14:00', title: 'Call de qualificação com Lucas Neri', priority: 'high' },
  { time: '16:30', title: 'Follow-up Ana Ribeiro com caso de uso', priority: 'urgent' },
  { time: '17:00', title: 'Confirmar call da Clínica Lumina', priority: 'medium' },
  { time: '18:00', title: 'Primeira resposta para Juliana Costa', priority: 'high' },
]

export const onboardingSteps = [
  { title: 'Definir nome do workspace', done: true },
  { title: 'Configurar pipeline padrão', done: true },
  { title: 'Importar leads iniciais', done: false },
  { title: 'Convidar time comercial', done: false },
]

export const insights = [
  'Sua maior queda está entre Qualificado e Negociação.',
  'Carla tem a maior taxa de ganho, mas também o maior volume em risco.',
  'Indicação converte melhor que Instagram nesta semana.',
  '11 leads estão sem resposta há mais de 24 horas.',
]
