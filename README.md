# Revenue OS for High Ticket

MVP local do **Revenue OS** com frontend estático e backend em **Python + SQLite** para validar a operação comercial de times high ticket sem dependências externas.

## Estado atual do produto

Esta base já cobre:

- página pública de marketing em `index.html`;
- app operacional em `app.html`;
- cliente browser em `app.js` com dashboard, lead inbox, pipeline, tasks, analytics, timeline e notas;
- backend local em `server.py` com API HTTP, persistência SQLite e seed inicial;
- suporte básico a **workspaces** para segmentar leads, dashboard, pipeline, analytics e time;
- autenticação demo obrigatória para as rotas operacionais, com isolamento por workspace e gates básicos por papel;
- testes unitários em `tests/test_server.py`.

## Estrutura do repositório

- `index.html`: landing page com tese, módulos, ICP, roadmap e pricing beta.
- `app.html`: shell do app operacional.
- `app.js`: camada cliente para renderização e interações.
- `server.py`: API local, schema SQLite, seed e mutações.
- `styles.css`: estilos da landing page e do app.
- `docs/mvp-foundation.md`: documentação da iteração atual.
- `tests/test_server.py`: cobertura do backend.
- `supabase/schema.sql`: schema PostgreSQL base para Supabase/Postgres.
- `supabase/seed.sql`: seed inicial do MVP para carregar no projeto Supabase.
- `docs/supabase-deploy.md`: checklist prático para a ida a Supabase e deploy.
- `supabase/indexes.sql`: índices de performance recomendados para a base no Supabase.
- `supabase/rls.sql`: pacote inicial de RLS/policies para multitenancy e segurança de leitura/escrita.
- `.env.example`: variáveis de ambiente sugeridas para deploy e conexão futura com Supabase.
- `Dockerfile` / `.dockerignore`: containerização inicial para deploy.
- `k8s/`: manifests base de Kubernetes (namespace, config, secret example, deployment, service, ingress).
- `docs/production-hardening.md`: roadmap operacional para rotas, multitenancy, devops e Kubernetes.

> **Importante:** enquanto o runtime padrão continuar em SQLite local, o manifesto em `k8s/deployment.yaml` deve permanecer com uma única réplica. Escala horizontal só é segura após migrar a persistência para Postgres/Supabase compartilhado.

## Principais rotas

- `GET /api/health`
- `GET /api/workspaces` *(requer sessão)*
- `GET /api/dashboard` *(requer sessão)*
- `GET /api/leads` *(requer sessão)*
- `POST /api/leads` *(requer sessão)*
- `PATCH /api/leads/:leadId/stage` *(requer sessão)*
- `GET /api/leads/:leadId/summary` *(requer sessão)*
- `GET /api/leads/:leadId/notes` *(requer sessão)*
- `POST /api/leads/:leadId/notes` *(requer sessão)*
- `GET /api/leads/:leadId/timeline` *(requer sessão)*
- `POST /api/leads/:leadId/mark-won` *(requer sessão)*
- `POST /api/leads/:leadId/mark-lost` *(requer sessão)*
- `GET /api/pipeline` *(requer sessão)*
- `GET /api/tasks` *(requer sessão)*
- `POST /api/tasks` *(requer sessão)*
- `POST /api/tasks/:taskId/complete` *(requer sessão)*
- `GET /api/team` *(requer sessão)*
- `POST /api/team` *(requer sessão + admin/manager)*
- `GET /api/analytics` *(requer sessão + admin/manager)*

## Como rodar localmente

```bash
python server.py
```

Também é possível sobrescrever host/porta via ambiente, o que deixa a base pronta para deploy:

```bash
HOST=0.0.0.0 PORT=3000 python server.py
```

Depois abra:

- `http://127.0.0.1:3000/` para a landing page;
- `http://127.0.0.1:3000/app` para a demo do app.

## O que o MVP valida hoje

- organização operacional do pipeline;
- execução diária via follow-ups e tasks;
- leitura de contexto por lead com resumo, notas e timeline;
- visão gerencial básica por origem, owner e status;
- operação em múltiplos workspaces com auth demo, memberships ativas/pendentes e isolamento consistente dos dados por workspace.

## Supabase / deploy

- Rode `supabase/schema.sql` no SQL Editor para criar a estrutura.
- Rode `supabase/seed.sql` em seguida para carregar os dados demo.
- Rode `supabase/indexes.sql` para criar os índices recomendados.
- Rode `supabase/rls.sql` para habilitar RLS e as policies iniciais.
- Preencha `.env.example` com os dados reais do projeto Supabase.
- Siga `docs/supabase-deploy.md` para escolher a connection string correta e preparar o deploy.

## Plataforma / produção

- Use `Dockerfile` e `.dockerignore` como base para build da imagem.
- Ajuste os manifests em `k8s/` com imagem, domínio e secrets reais.
- Siga `docs/production-hardening.md` para a ordem de evolução: rotas, multitenancy, devops e Kubernetes.

## Próximos passos naturais

- permissões por papel;
- convites por email e onboarding real de membros;
- filtros salvos e automações;
- billing e access model.
