# Revenue OS MVP Foundation

## Evolução desta iteração

O projeto saiu de um MVP somente com leads para uma base operacional mais próxima do fluxo real:

- criação manual de lead no app;
- movimentação de lead entre etapas do pipeline;
- criação e conclusão de tasks de follow-up;
- notas por lead com timeline básica no dashboard;
- API HTTP local para dashboard, leads, summary, notes, pipeline, tasks, analytics e stages;
- persistência SQLite com schema inicial e seed automática;
- testes unitários cobrindo seed, filtros, summary, dashboard, mutações do lead, tasks e notas.

## O que isso valida melhor agora

1. **Fluxo operacional real** de entrada, progresso e acompanhamento do lead.
2. **Contrato de dados** entre frontend e backend.
3. **Estrutura de domínios centrais**: leads, stages, tasks, notes e onboarding.
4. **Migração futura** para Next.js + Supabase com menos retrabalho no modelo.

## Próxima fase sugerida

### Produto
- CRUD completo de leads
- registrar motivos de perda
- timeline unificada com eventos
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
