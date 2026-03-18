# Revenue OS MVP Foundation

## O que foi melhorado nesta iteração

Esta versão substitui o protótipo puramente estático por uma demo mais útil para validação:

- navegação entre áreas do app sem trocar de página;
- lead inbox filtrável por busca, owner e temperatura;
- resumo IA trocado dinamicamente conforme o lead selecionado;
- pipeline renderizado a partir de dados estruturados;
- analytics e tasks montados via dataset compartilhado.

## Por que isso importa

A demo agora ajuda a validar três coisas antes da build full-stack:

1. **Narrativa comercial** — o site já explica posicionamento, ICP e pricing beta.
2. **Modelo operacional** — o app mostra como leads, tasks, pipeline e insights se conectam.
3. **Estrutura de domínio** — o dataset já antecipa entidades centrais do produto.

## Próxima fase sugerida

### Foundation técnica
- Next.js App Router
- TypeScript strict
- Tailwind/shadcn
- schema de environment

### Core SaaS
- Supabase Auth
- workspaces e memberships
- leads, stages, tasks e events
- RLS por account_id

### Monetização e IA
- Stripe Checkout + portal
- webhooks de assinatura
- AI summary service
- tracking de eventos do funil
