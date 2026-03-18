# Revenue OS for High Ticket

Implementação inicial de uma **demo interativa** do Revenue OS para validar proposta de valor, UX operacional e narrativa comercial do produto.

## Estrutura atual

- `index.html`: página pública do produto com posicionamento, módulos, ICP, roadmap e pricing.
- `app.html`: demo interativa do app com navegação entre dashboard, leads, pipeline, tasks e analytics.
- `app.js`: lógica client-side para renderizar dataset mockado, filtros e troca de views.
- `data.js`: dados de demonstração do pipeline comercial.
- `styles.css`: sistema visual compartilhado entre site e app.

## Rodando localmente

```bash
python -m http.server 3000
```

Depois abra:

- `http://localhost:3000/`
- `http://localhost:3000/app.html`

## Próximo passo recomendado

Migrar esta demo para uma base real em Next.js + TypeScript + Supabase, preservando:

1. narrativa de marketing já pronta;
2. arquitetura de navegação do app;
3. modelo de dados inicial para leads, pipeline e tasks;
4. espaço reservado para IA, billing e analytics reais.
