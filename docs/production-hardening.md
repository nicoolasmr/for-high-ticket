# Production Hardening

## Estado atual do runtime

O backend ainda usa **SQLite local** como persistência padrão. Isso significa que cada pod/container mantém seu próprio arquivo de banco, sem coordenação com outras réplicas.

### Implicação direta para Kubernetes

- **`replicas: 1` é o único modo seguro** enquanto a aplicação ainda grava em SQLite local.
- Escalar horizontalmente antes da migração para **Postgres/Supabase** pode causar divergência de dados entre pods, leituras inconsistentes e perda aparente de alterações dependendo de qual réplica atende a requisição.
- Reinícios e re-agendamentos de pods também podem descartar dados locais se o volume não for persistente e compartilhado.

## Perfis de manifesto

O repositório agora separa dois perfis de uso:

- `k8s/deployment.yaml`: manifesto padrão alinhado com a realidade atual do runtime, fixado em **1 réplica**.
- `k8s/local-demo/deployment.yaml`: perfil explícito para ambientes locais/demo com SQLite.
- `k8s/production/deployment.yaml`: perfil de produção, com múltiplas réplicas, que **exige** banco compartilhado via `DATABASE_URL` apontando para Postgres/Supabase.

## Regra operacional

### Pode usar múltiplas réplicas quando

- a persistência do `server.py` tiver sido migrada para Postgres/Supabase;
- todas as instâncias compartilharem o mesmo banco remoto;
- segredos/variáveis de ambiente de banco estiverem configurados no cluster;
- a equipe tiver validado concorrência, migrações e health checks no novo runtime.

### Não pode usar múltiplas réplicas quando

- a aplicação ainda estiver usando SQLite local;
- o banco estiver acoplado ao filesystem do pod;
- cada réplica puder iniciar com um arquivo diferente ou vazio.

## Recomendação de rollout

1. Use `k8s/deployment.yaml` ou `k8s/local-demo/deployment.yaml` para demos e ambientes temporários.
2. Conclua a migração de persistência para Postgres/Supabase.
3. Só depois promova o cluster para `k8s/production/deployment.yaml` e aumente `replicas`.
