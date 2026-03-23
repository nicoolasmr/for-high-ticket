# Supabase + Deploy Readiness

## O que já está preparado

- `supabase/schema.sql` cria a estrutura PostgreSQL do MVP.
- `supabase/seed.sql` carrega os dados demo iniciais no projeto.
- `supabase/indexes.sql` aplica os índices principais para performance.
- `supabase/rls.sql` habilita o primeiro pacote de RLS/policies para isolamento por workspace.
- `.env.example` já inclui `DATABASE_URL`, placeholders para `SUPABASE_PROJECT_URL`, keys e connection strings/poolers.
- `server.py` agora troca automaticamente de SQLite para Postgres quando `DATABASE_URL`/`SUPABASE_*_URL` estiver configurada, e o projeto inclui `vercel.json` + `api/index.py` para deploy serverless no Vercel.

## Passo a passo sugerido

1. Crie o projeto no Supabase.
2. Abra o SQL Editor e rode `supabase/schema.sql`.
3. Rode `supabase/seed.sql` para subir o dataset demo.
4. Rode `supabase/indexes.sql`.
5. Rode `supabase/rls.sql`.
6. Copie as connection strings do painel **Connect** do Supabase para o seu ambiente.
7. Configure `.env` com `HOST`, `PORT` e `DATABASE_URL` ou as variáveis Supabase.
8. Se for usar VM/container, faça o deploy do backend usando `python server.py` como start command.
9. Se for usar Vercel, publique este repositório e configure as variáveis de ambiente.

## Qual connection string usar

- **VM/container persistente com IPv6**: use a **Direct connection string**.
- **VM/container persistente sem IPv6**: use o **Session pooler**.
- **Serverless / funções com conexões transitórias**: use o **Transaction pooler**.

## Vercel

### O que foi adaptado

- `/api/*` é roteado para `api/index.py`.
- `/app` é reescrito para `app.html`.
- O SQLite local pode usar `/tmp/revenue_os.db` para demos efêmeras.

### Variáveis recomendadas no Vercel

- `REVENUE_OS_DB_PATH=/tmp/revenue_os.db`
- `REVENUE_OS_DISABLE_API_LOGS=0`
- `DATABASE_URL=...`
- `REVENUE_OS_AUTO_MIGRATE=0`
- `REVENUE_OS_SEED_DEMO_DATA=0`
- `REVENUE_OS_SESSION_TTL_HOURS=720`
- `SUPABASE_PROJECT_URL=...`
- `SUPABASE_ANON_KEY=...`
- `SUPABASE_TRANSACTION_POOLER_URL=...`

### Recomendação prática

- **Demo rápida:** publique com SQLite em `/tmp`.
- **Deploy sério:** publique com `DATABASE_URL` ou `SUPABASE_TRANSACTION_POOLER_URL` configurada para usar Postgres automaticamente no runtime.

Após o deploy, valide com `GET /api/health`: a resposta deve retornar `backend: "postgres"` quando a connection string estiver ativa.

## Próximo passo técnico

A base continua suportando SQLite para desenvolvimento/demo, mas já troca automaticamente para Postgres/Supabase quando a connection string estiver presente no ambiente, mantendo o mesmo contrato da API atual.
