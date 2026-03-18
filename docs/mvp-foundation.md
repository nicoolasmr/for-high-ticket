# Revenue OS MVP Foundation

## Evolução desta iteração

O projeto saiu de uma demo consultiva para um MVP local já com duas operações centrais do produto:

- criação manual de lead no app;
- movimentação de lead entre etapas do pipeline;
- API HTTP local para dashboard, leads, summary, pipeline, tasks, analytics e stages;
- persistência SQLite com schema inicial e seed automática;
- frontend desacoplado do mock local e consumindo endpoints reais;
- testes unitários cobrindo seed, filtros, summary, dashboard e mutações do lead.

## O que isso valida melhor agora

1. **Fluxo operacional real** de entrada e progressão do lead.
2. **Contrato de dados** entre frontend e backend.
3. **Estrutura de domínios centrais**: leads, stages, tasks e onboarding.
4. **Migração futura** para Next.js + Supabase com menos retrabalho no modelo.

## Próxima fase sugerida

### Produto
- CRUD completo de leads
- concluir task
- registrar notas e timeline
- autenticação de workspace

### Plataforma
- troca de SQLite por Supabase/Postgres
- policies multi-tenant
- eventos auditáveis
- billing e access model

### Inteligência
- AI summary persistido
- next best action por contexto
- insights de pipeline gerados dinamicamente
