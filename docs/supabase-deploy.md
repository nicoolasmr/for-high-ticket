# Supabase + Deploy Readiness

## O que já está preparado

- `supabase/schema.sql` cria a estrutura PostgreSQL do MVP.
- `supabase/seed.sql` carrega os dados demo iniciais no projeto.
- `supabase/indexes.sql` aplica os índices principais para performance.
- `supabase/rls.sql` habilita o primeiro pacote de RLS/policies para isolamento por workspace.
- `.env.example` já inclui placeholders para `SUPABASE_PROJECT_URL`, keys e connection strings/poolers.
- `server.py` agora respeita `HOST` e `PORT`, o que facilita deploy em plataformas como Render, Fly.io ou Railway.

## Passo a passo sugerido

1. Crie o projeto no Supabase.
2. Abra o SQL Editor e rode `supabase/schema.sql`.
3. Rode `supabase/seed.sql` para subir o dataset demo.
4. Rode `supabase/indexes.sql`.
5. Rode `supabase/rls.sql`.
6. Copie as connection strings do painel **Connect** do Supabase para o seu ambiente.
7. Configure `.env` com `HOST`, `PORT` e as variáveis Supabase.
8. Faça o deploy do backend usando `python server.py` como start command.

## Qual connection string usar

- **VM/container persistente com IPv6**: use a **Direct connection string**.
- **VM/container persistente sem IPv6**: use o **Session pooler**.
- **Serverless / funções com conexões transitórias**: use o **Transaction pooler**.

## Próximo passo técnico

A base ainda executa em SQLite por padrão. A próxima etapa de implementação é trocar o acesso de persistência do `server.py` para Postgres/Supabase usando a connection string definida no ambiente, mantendo o mesmo contrato da API atual.
