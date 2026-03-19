insert into public.workspaces (id, name)
values
  ('ws-default', 'High Ticket Labs'),
  ('ws-clinics', 'Clinic Sales Ops')
on conflict (id) do nothing;

insert into public.users (id, name, email, password_hash)
values
  ('user-1', 'Carla', 'carla@highticketlabs.com', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791'),
  ('user-2', 'Bruna', 'bruna@clinicsalesops.com', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791'),
  ('user-3', 'Marcos', 'marcos@highticketlabs.com', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791'),
  ('user-4', 'Bia', 'bia@invitee.com', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791')
on conflict (id) do nothing;

insert into public.workspace_memberships (user_id, workspace_id, role, status)
values
  ('user-1', 'ws-default', 'admin', 'active'),
  ('user-2', 'ws-clinics', 'admin', 'active'),
  ('user-3', 'ws-default', 'rep', 'active'),
  ('user-4', 'ws-default', 'rep', 'invited')
on conflict (user_id, workspace_id) do nothing;

insert into public.stages (id, name, order_index)
values
  ('entry', 'Entrada', 1),
  ('qualified', 'Qualificado', 2),
  ('negotiation', 'Negociação', 3),
  ('proposal', 'Proposta', 4),
  ('won', 'Fechado', 5)
on conflict (id) do nothing;

insert into public.leads (
  id, workspace_id, name, company, owner, source, stage_id, temperature, value, next_action,
  status, lost_reason, last_reply_hours, summary_text, objections_json, signals_json,
  next_best_action, suggested_reply
)
values
  ('lead-1', 'ws-default', 'Ana Ribeiro', 'Vértice Educação', 'Carla', 'Indicação', 'negotiation', 'hot', 18000, 'Hoje, 16:30', 'Em risco', null, 18, 'Lead quente, avaliando substituir planilhas por um cockpit comercial.', '["Receio de adesão do time","Dúvida sobre velocidade de onboarding"]'::jsonb, '["Pediu ROI","Perguntou sobre setup guiado"]'::jsonb, 'Enviar caso real e proposta com urgência suave.', 'Ana, se eu te mostrar como seu time opera follow-up com clareza ainda nesta semana, faz sentido fecharmos a ativação hoje?'),
  ('lead-2', 'ws-default', 'Lucas Neri', 'Neri Advisory', 'Marcos', 'Instagram', 'qualified', 'warm', 7500, 'Hoje, 14:00', 'Qualificado', null, 6, 'Lead comparando Revenue OS com CRM genérico.', '["Quer entender diferença prática vs CRM tradicional"]'::jsonb, '["Abriu pricing","Pediu demo curta"]'::jsonb, 'Mostrar diferença de follow-up e analytics operacional.', 'Lucas, te mostro em 4 minutos como o Revenue OS reduz leads esquecidos e dá previsibilidade real ao gestor.'),
  ('lead-3', 'ws-clinics', 'Clínica Lumina', 'Clínica Lumina', 'Carla', 'Google', 'proposal', 'hot', 32000, 'Amanhã, 09:00', 'Proposta enviada', null, 4, 'Operação com secretárias comerciais e necessidade de SLA visível.', '["Quer validar processo de onboarding"]'::jsonb, '["Solicitou proposta anual","Chamou o gestor para a call final"]'::jsonb, 'Confirmar call decisória e reforçar ganhos de visibilidade.', 'Conseguimos estruturar o time com follow-up e prioridades já no onboarding. Queremos validar isso com vocês na call de amanhã.'),
  ('lead-4', 'ws-default', 'Juliana Costa', 'JC Consultoria', 'Rafa', 'Instagram', 'entry', 'warm', 12000, 'Hoje, 18:00', 'Novo lead', null, 2, 'Lead inbound pedindo diagnóstico da operação comercial.', '["Ainda sem objeções claras"]'::jsonb, '["Respondeu rápido","Mandou áudio com cenário atual"]'::jsonb, 'Fazer qualificação em call curta.', 'Juliana, consigo te mostrar rapidamente onde sua operação pode estar perdendo receita por desorganização comercial.')
on conflict (id) do nothing;

insert into public.tasks (workspace_id, lead_id, due_time, title, priority, completed)
values
  ('ws-default', 'lead-2', '14:00', 'Call de qualificação com Lucas Neri', 'high', false),
  ('ws-default', 'lead-1', '16:30', 'Follow-up Ana Ribeiro com caso de uso', 'urgent', false),
  ('ws-clinics', 'lead-3', '17:00', 'Confirmar call da Clínica Lumina', 'medium', false),
  ('ws-default', 'lead-4', '18:00', 'Primeira resposta para Juliana Costa', 'high', false)
on conflict do nothing;

insert into public.onboarding_steps (workspace_id, title, done)
values
  ('ws-default', 'Definir nome do workspace', true),
  ('ws-default', 'Configurar pipeline padrão', true),
  ('ws-default', 'Importar leads iniciais', false),
  ('ws-default', 'Convidar time comercial', false),
  ('ws-clinics', 'Definir playbook da clínica', true),
  ('ws-clinics', 'Cadastrar secretárias comerciais', false)
on conflict do nothing;

insert into public.notes (lead_id, author, body, created_at)
values
  ('lead-1', 'Carla', 'Lead pediu ROI e quer validar rapidez do onboarding.', now()),
  ('lead-3', 'Carla', 'Gestor participa da próxima call para decisão final.', now())
on conflict do nothing;

insert into public.events (lead_id, event_type, payload_json, created_at)
values
  ('lead-1', 'note_added', '{"author":"Carla","body":"Lead pediu ROI e quer validar rapidez do onboarding."}'::jsonb, now()),
  ('lead-3', 'note_added', '{"author":"Carla","body":"Gestor participa da próxima call para decisão final."}'::jsonb, now()),
  ('lead-1', 'lead_seeded', '{"stageId":"negotiation","status":"Em risco"}'::jsonb, now()),
  ('lead-2', 'lead_seeded', '{"stageId":"qualified","status":"Qualificado"}'::jsonb, now()),
  ('lead-3', 'lead_seeded', '{"stageId":"proposal","status":"Proposta enviada"}'::jsonb, now()),
  ('lead-4', 'lead_seeded', '{"stageId":"entry","status":"Novo lead"}'::jsonb, now())
on conflict do nothing;
