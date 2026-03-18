# Revenue OS for High Ticket

Fundação inicial do **Revenue OS** com frontend estático e **backend local em Python + SQLite**, permitindo validar uma experiência mais próxima de produto real sem depender de bibliotecas externas.

## Estrutura atual

- `index.html`: página pública do produto com posicionamento, módulos, ICP, roadmap e pricing.
- `app.html`: shell do app que consome dados reais da API local e já suporta leads, notes, follow-ups, timeline e ações de ganho/perda.
- `app.js`: cliente browser que renderiza dashboard, leads, pipeline, tasks, analytics, timeline e interações operacionais.
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
- `GET /api/leads/:leadId/notes`
- `GET /api/leads/:leadId/timeline`
- `GET /api/pipeline`
- `GET /api/tasks`
- `GET /api/analytics`
- `GET /api/stages`

### Mutação
- `POST /api/leads`
- `PATCH /api/leads/:leadId/stage`
- `POST /api/leads/:leadId/notes`
- `POST /api/leads/:leadId/mark-won`
- `POST /api/leads/:leadId/mark-lost`
- `POST /api/tasks`
- `POST /api/tasks/:taskId/complete`
