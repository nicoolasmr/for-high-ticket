# Revenue OS MVP Foundation

## Evolução desta iteração

O projeto saiu de uma base apenas operacional para um MVP mais próximo da realidade comercial:

- criação manual de lead no app;
- movimentação de lead entre etapas do pipeline;
- criação e conclusão de tasks de follow-up;
- notas por lead com timeline de eventos no dashboard;
- marcação de oportunidade como ganha ou perdida com motivo;
- API HTTP local para dashboard, leads, summary, notes, timeline, pipeline, tasks, analytics e stages;
- persistência SQLite com schema inicial e seed automática;
- testes unitários cobrindo seed, filtros, summary, dashboard, mutações do lead, tasks, notas e timeline.

## O que isso valida melhor agora

1. **Fluxo operacional real** de entrada, progresso, decisão e acompanhamento do lead.
2. **Contrato de dados** entre frontend e backend.
3. **Estrutura de domínios centrais**: leads, stages, tasks, notes, events e onboarding.
4. **Migração futura** para Next.js + Supabase com menos retrabalho no modelo.

## Próxima fase sugerida

### Produto
- CRUD completo de leads
- convites de time e ownership real
- filtros por status/won/lost
- autenticação de workspace

### Plataforma
- troca de SQLite por Supabase/Postgres
- policies multi-tenant
- eventos auditáveis mais ricos
- billing e access model

### Inteligência
- AI summary persistido
- next best action por contexto
- insights de pipeline gerados dinamicamente
