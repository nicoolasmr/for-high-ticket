# Revenue OS for High Ticket

Fundação inicial do **Revenue OS** com frontend estático e **backend local em Python + SQLite**, permitindo validar uma experiência mais próxima de produto real sem depender de bibliotecas externas.

## Estrutura atual

- `index.html`: página pública do produto com posicionamento, módulos, ICP, roadmap e pricing.
- `app.html`: shell do app que consome dados reais da API local e já suporta cadastro rápido de lead.
- `app.js`: cliente browser que renderiza dashboard, leads, pipeline, tasks e analytics a partir da API.
- `server.py`: servidor HTTP com rotas da API, persistência em SQLite e operações mutáveis do MVP.
- `revenue_os.db`: banco local criado automaticamente ao subir a aplicação.
- `tests/test_server.py`: testes unitários do backend.

## Como rodar

```bash
python server.py
```

Depois acesse:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/app.html`
- `http://127.0.0.1:3000/api/health`

## Rotas disponíveis

### Consulta
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/leads`
- `GET /api/leads/:leadId/summary`
- `GET /api/pipeline`
- `GET /api/tasks`
- `GET /api/analytics`
- `GET /api/stages`

### Mutação
- `POST /api/leads`
- `PATCH /api/leads/:leadId/stage`

## Próximo passo recomendado

Migrar essa fundação para uma stack de produção com:

1. Next.js App Router no frontend;
2. Supabase Auth + Postgres + RLS;
3. server actions/route handlers;
4. billing com Stripe;
5. camada de IA desacoplada para summaries e next best action.
