# Revenue OS MVP Foundation

## Evolução desta iteração

O MVP local agora cobre uma base operacional mais próxima do produto:

- time comercial modelado por `users` + `workspace_memberships`, com convites locais e aceite no app;
- ownership reutilizado na criação e leitura de leads;
- filtro por status no lead inbox;
- timeline de eventos por lead;
- marcação de ganho/perda com motivo;
- tasks de follow-up com conclusão;
- notas persistidas por lead;
- analytics por origem, owner e status;
- suporte a auth demo, memberships iniciais e workspaces no backend e na UI;
- proteção das rotas operacionais para evitar leitura/escrita fora do workspace ativo;
- analytics e convites restritos a perfis de gestão.

## O que isso valida melhor agora

1. **Operação diária comercial** com pipeline, tasks e fila de prioridade.
2. **Contexto do lead** com notas, timeline e resumo operacional.
3. **Leitura gerencial simplificada** por owner, origem e status.
4. **Isolamento básico por workspace** para demonstrar a direção SaaS do produto.

## Papéis de cada conceito no schema

- **time**: conjunto de usuários vinculados a um workspace por `workspace_memberships`;
- **convite**: uma membership com `status = 'invited'`, ainda sem acesso operacional ativo;
- **membership**: o vínculo entre `users` e `workspaces`, contendo papel (`role`) e estado (`status`).

Com isso, não existe uma tabela paralela para representar membros do time: a fonte de verdade é sempre `users` + `workspace_memberships`.

## Limites conhecidos desta fundação

Ainda não existem:

- RBAC completo além dos gates atuais de manager/admin em analytics e convites;
- convites por email/aceite completo;
- billing;
- automações e integrações externas.

## Próxima fase sugerida

1. expandir permissões por papel para CRUD granular e trilhas de aprovação;
2. convites por email e gestão completa de membros;
3. filtros avançados e views salvas;
4. automações comerciais;
5. billing e access model.
