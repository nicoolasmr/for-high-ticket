# Production Hardening Roadmap

## 1. Rotas e backend

Objetivo imediato:

- migrar o contrato atual de `/api/*` para persistência em Postgres/Supabase;
- separar melhor autenticação, autorização e acesso a dados;
- remover dependência do banco SQLite local em produção.

Checklist sugerido:

1. extrair uma camada de repositório para leads, tasks, notes, team e analytics;
2. trocar queries SQLite por acesso Postgres/Supabase;
3. padronizar erros da API (`401`, `403`, `404`, `409`, `422`);
4. adicionar paginação/filtros estáveis nas rotas de listagem;
5. adicionar request IDs e logging estruturado.

## 2. Multitenancy real

A base atual já tem isolamento por `workspace_id`, mas para produção é preciso reforçar:

- todas as tabelas operacionais com `workspace_id` obrigatório;
- RLS no Supabase para leitura e escrita por membership;
- papéis (`admin`, `manager`, `rep`) aplicados de forma consistente em API, banco e UI;
- trilha de auditoria por ação sensível.

Checklist sugerido:

1. revisar todas as entidades para garantir tenancy explícita;
2. concluir policies RLS e cenários de aceite/convite;
3. definir modelo de auth real (Supabase Auth + mapeamento para `users`/`workspace_memberships`);
4. criar índices por workspace para tabelas de alto volume.

## 3. DevOps e deploy

Artefatos já preparados no repositório:

- `Dockerfile`
- `.dockerignore`
- `k8s/*.yaml`
- `.env.example`

Próximos passos recomendados:

0. manter apenas **1 réplica** enquanto o runtime ainda usar SQLite local;
1. publicar imagem em registry (GHCR/ECR/GAR);
2. configurar ambiente de staging com Supabase real;
3. adicionar CI para testes Python + frontend harness;
4. adicionar CD para aplicar manifests ou Helm chart.

## 4. Kubernetes

Os manifests em `k8s/` servem como ponto de partida e ainda precisam ser personalizados:

- imagem final do container;
- domínio do Ingress;
- secret real com dados do Supabase;
- autoscaling, network policies e observabilidade.

Checklist sugerido:

1. aplicar `namespace`, `configmap`, `secret`, `deployment`, `service`, `ingress`;
2. adicionar HPA quando houver baseline de tráfego;
3. integrar logs e métricas (Grafana/Prometheus/OpenTelemetry);
4. configurar backups e política de incidentes.
