# Revenue OS for High Ticket

Fundação inicial do **Revenue OS** com frontend estático e **backend local em Python + SQLite**, permitindo validar uma experiência mais próxima de produto real sem depender de bibliotecas externas.

## Estrutura atual

- `index.html`: página pública do produto com posicionamento, módulos, ICP, roadmap e pricing.
- `app.html`: shell do app que consome dados reais da API local e já suporta leads, notes, follow-ups, timeline, ações de ganho/perda e gestão básica de time.
- `app.js`: cliente browser que renderiza dashboard, leads, pipeline, tasks, analytics, timeline e interações operacionais.
- `server.py`: servidor HTTP com rotas da API, persistência em SQLite e operações mutáveis do MVP.
- `revenue_os.db`: banco local criado automaticamente ao subir a aplicação.
- `tests/test_server.py`: testes unitários do backend.

## Rotas adicionais relevantes

- `GET /api/team`
- `POST /api/team`
- `GET /api/leads?status=...`
- `POST /api/leads/:leadId/mark-won`
- `POST /api/leads/:leadId/mark-lost`

- `GET /api/analytics` agora retorna também recortes por `owner` e `status`.
