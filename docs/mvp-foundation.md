# Revenue OS MVP Foundation

## Escopo implementado nesta primeira entrega

Esta entrega cria a fundação visual e estratégica do produto com dois artefatos principais:

1. **Marketing site inicial** para apresentar proposta de valor, ICP, módulos, pricing beta e CTA.
2. **App shell operacional** com dashboard, lead inbox, pipeline, tasks e bloco de inteligência comercial.

## Decisões desta fase

- Estrutura estática para permitir versionamento imediato no GitHub sem depender de registry externa.
- Design focado em operações high ticket que usam WhatsApp e times pequenos.
- Conteúdo já orientado a venda para suportar captação de design partners.

## Roadmap sugerido a partir daqui

### Fase 1 — Plataforma web
- Migrar para Next.js App Router
- Adicionar TypeScript strict
- Introduzir Tailwind e componentes reutilizáveis
- Separar marketing site e app shell em rotas reais

### Fase 2 — Core backend
- Configurar Supabase Auth
- Criar schema multi-tenant com accounts, memberships, leads e tasks
- Aplicar RLS
- Criar seeds com dados demo

### Fase 3 — Produto comercial
- CRUD de leads
- Pipeline com persistência
- Tasks e follow-up
- Dashboard com KPIs reais

### Fase 4 — Monetização e IA
- Stripe Checkout + webhook
- Billing portal
- Resumo IA por lead
- Sugestão de próxima ação
