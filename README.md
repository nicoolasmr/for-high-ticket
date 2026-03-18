# Revenue OS for High Ticket

Protótipo inicial do **Revenue OS**, um cockpit comercial para operações high ticket que querem transformar conversas, follow-ups e pipeline em receita previsível.

## O que existe neste repositório agora

- `index.html`: landing page de marketing e vendas do produto.
- `app.html`: demo navegável do dashboard/app MVP.
- `styles.css`: identidade visual compartilhada entre marketing site e app shell.

## Como abrir localmente

Como este primeiro passo foi estruturado sem dependências externas, basta servir os arquivos estáticos.

### Opção 1: Python

```bash
python -m http.server 3000
```

Depois, acesse:

- `http://localhost:3000/`
- `http://localhost:3000/app.html`

## Próximos passos recomendados

1. Migrar este protótipo para Next.js App Router.
2. Implementar autenticação e multi-tenant com Supabase.
3. Criar schema SQL inicial para leads, pipeline, tasks e subscriptions.
4. Adicionar billing com Stripe e analytics de produto.
5. Conectar a camada de IA para resumos e próxima melhor ação.
