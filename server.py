from __future__ import annotations

import json
import hashlib
import sqlite3
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / 'revenue_os.db'

SEED_WORKSPACES = [('ws-default', 'High Ticket Labs'), ('ws-clinics', 'Clinic Sales Ops')]
SEED_USERS = [
    ('user-1', 'Carla', 'carla@highticketlabs.com', 'demo123'),
    ('user-2', 'Bruna', 'bruna@clinicsalesops.com', 'demo123'),
    ('user-3', 'Marcos', 'marcos@highticketlabs.com', 'demo123'),
    ('user-4', 'Bia', 'bia@invitee.com', 'demo123'),
]
SEED_MEMBERSHIPS = [
    ('user-1', 'ws-default', 'admin', 'active'),
    ('user-2', 'ws-clinics', 'admin', 'active'),
    ('user-3', 'ws-default', 'rep', 'active'),
    ('user-4', 'ws-default', 'rep', 'invited'),
]

SEED_STAGES = [
    ('entry', 'Entrada', 1),
    ('qualified', 'Qualificado', 2),
    ('negotiation', 'Negociação', 3),
    ('proposal', 'Proposta', 4),
    ('won', 'Fechado', 5),
]

SEED_LEADS = [
    {
        'workspace_id': 'ws-default',
        'id': 'lead-1',
        'name': 'Ana Ribeiro',
        'company': 'Vértice Educação',
        'owner': 'Carla',
        'source': 'Indicação',
        'stage_id': 'negotiation',
        'temperature': 'hot',
        'value': 18000,
        'next_action': 'Hoje, 16:30',
        'status': 'Em risco',
        'last_reply_hours': 18,
        'summary_text': 'Lead quente, avaliando substituir planilhas por um cockpit comercial.',
        'objections': ['Receio de adesão do time', 'Dúvida sobre velocidade de onboarding'],
        'signals': ['Pediu ROI', 'Perguntou sobre setup guiado'],
        'next_best_action': 'Enviar caso real e proposta com urgência suave.',
        'suggested_reply': 'Ana, se eu te mostrar como seu time opera follow-up com clareza ainda nesta semana, faz sentido fecharmos a ativação hoje?',
    },
    {
        'workspace_id': 'ws-default',
        'id': 'lead-2',
        'name': 'Lucas Neri',
        'company': 'Neri Advisory',
        'owner': 'Marcos',
        'source': 'Instagram',
        'stage_id': 'qualified',
        'temperature': 'warm',
        'value': 7500,
        'next_action': 'Hoje, 14:00',
        'status': 'Qualificado',
        'last_reply_hours': 6,
        'summary_text': 'Lead comparando Revenue OS com CRM genérico.',
        'objections': ['Quer entender diferença prática vs CRM tradicional'],
        'signals': ['Abriu pricing', 'Pediu demo curta'],
        'next_best_action': 'Mostrar diferença de follow-up e analytics operacional.',
        'suggested_reply': 'Lucas, te mostro em 4 minutos como o Revenue OS reduz leads esquecidos e dá previsibilidade real ao gestor.',
    },
    {
        'workspace_id': 'ws-clinics',
        'id': 'lead-3',
        'name': 'Clínica Lumina',
        'company': 'Clínica Lumina',
        'owner': 'Carla',
        'source': 'Google',
        'stage_id': 'proposal',
        'temperature': 'hot',
        'value': 32000,
        'next_action': 'Amanhã, 09:00',
        'status': 'Proposta enviada',
        'last_reply_hours': 4,
        'summary_text': 'Operação com secretárias comerciais e necessidade de SLA visível.',
        'objections': ['Quer validar processo de onboarding'],
        'signals': ['Solicitou proposta anual', 'Chamou o gestor para a call final'],
        'next_best_action': 'Confirmar call decisória e reforçar ganhos de visibilidade.',
        'suggested_reply': 'Conseguimos estruturar o time com follow-up e prioridades já no onboarding. Queremos validar isso com vocês na call de amanhã.',
    },
    {
        'workspace_id': 'ws-default',
        'id': 'lead-4',
        'name': 'Juliana Costa',
        'company': 'JC Consultoria',
        'owner': 'Rafa',
        'source': 'Instagram',
        'stage_id': 'entry',
        'temperature': 'warm',
        'value': 12000,
        'next_action': 'Hoje, 18:00',
        'status': 'Novo lead',
        'last_reply_hours': 2,
        'summary_text': 'Lead inbound pedindo diagnóstico da operação comercial.',
        'objections': ['Ainda sem objeções claras'],
        'signals': ['Respondeu rápido', 'Mandou áudio com cenário atual'],
        'next_best_action': 'Fazer qualificação em call curta.',
        'suggested_reply': 'Juliana, consigo te mostrar rapidamente onde sua operação pode estar perdendo receita por desorganização comercial.',
    },
]

SEED_TASKS = [
    ('ws-default', 'lead-2', '14:00', 'Call de qualificação com Lucas Neri', 'high', 0),
    ('ws-default', 'lead-1', '16:30', 'Follow-up Ana Ribeiro com caso de uso', 'urgent', 0),
    ('ws-clinics', 'lead-3', '17:00', 'Confirmar call da Clínica Lumina', 'medium', 0),
    ('ws-default', 'lead-4', '18:00', 'Primeira resposta para Juliana Costa', 'high', 0),
]

SEED_TEAM = [('ws-default', 'Carla', 'manager'), ('ws-default', 'Marcos', 'rep'), ('ws-default', 'Rafa', 'rep'), ('ws-clinics', 'Bruna', 'manager')]

SEED_ONBOARDING = [
    ('ws-default', 'Definir nome do workspace', 1),
    ('ws-default', 'Configurar pipeline padrão', 1),
    ('ws-default', 'Importar leads iniciais', 0),
    ('ws-default', 'Convidar time comercial', 0),
    ('ws-clinics', 'Definir playbook da clínica', 1),
    ('ws-clinics', 'Cadastrar secretárias comerciais', 0),
]

SEED_NOTES = [
    ('lead-1', 'Carla', 'Lead pediu ROI e quer validar rapidez do onboarding.'),
    ('lead-3', 'Carla', 'Gestor participa da próxima call para decisão final.'),
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def get_connection(db_path: Path | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path or DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def has_column(conn: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    columns = conn.execute(f'pragma table_info({table_name})').fetchall()
    return any(column['name'] == column_name for column in columns)


def init_db(db_path: Path | None = None) -> None:
    with get_connection(db_path) as conn:
        conn.executescript(
            '''
            create table if not exists workspaces (
                id text primary key,
                name text not null
            );

            create table if not exists users (
                id text primary key,
                name text not null,
                email text not null unique,
                password_hash text not null
            );

            create table if not exists workspace_memberships (
                id integer primary key autoincrement,
                user_id text not null references users(id),
                workspace_id text not null references workspaces(id),
                role text not null,
                status text not null default 'active'
            );

            create table if not exists sessions (
                token text primary key,
                user_id text not null references users(id),
                created_at text not null
            );

            create table if not exists stages (
                id text primary key,
                name text not null,
                order_index integer not null
            );

            create table if not exists leads (
                id text primary key,
                workspace_id text not null references workspaces(id),
                name text not null,
                company text not null,
                owner text not null,
                source text not null,
                stage_id text not null references stages(id),
                temperature text not null,
                value integer not null,
                next_action text not null,
                status text not null,
                lost_reason text,
                last_reply_hours integer not null,
                summary_text text not null,
                objections_json text not null,
                signals_json text not null,
                next_best_action text not null,
                suggested_reply text not null
            );

            create table if not exists tasks (
                id integer primary key autoincrement,
                workspace_id text references workspaces(id),
                lead_id text references leads(id),
                due_time text not null,
                title text not null,
                priority text not null,
                completed integer not null default 0
            );

            create table if not exists team_members (
                id integer primary key autoincrement,
                workspace_id text not null references workspaces(id),
                name text not null,
                role text not null
            );

            create table if not exists onboarding_steps (
                id integer primary key autoincrement,
                workspace_id text references workspaces(id),
                title text not null,
                done integer not null
            );

            create table if not exists notes (
                id integer primary key autoincrement,
                lead_id text not null references leads(id),
                author text not null,
                body text not null,
                created_at text not null
            );

            create table if not exists events (
                id integer primary key autoincrement,
                lead_id text not null references leads(id),
                event_type text not null,
                payload_json text not null,
                created_at text not null
            );
            '''
        )
        if not has_column(conn, 'tasks', 'workspace_id'):
            conn.execute('alter table tasks add column workspace_id text references workspaces(id)')
            conn.execute(
                '''
                update tasks
                set workspace_id = (
                    select leads.workspace_id
                    from leads
                    where leads.id = tasks.lead_id
                )
                where workspace_id is null
                '''
            )
        if not has_column(conn, 'onboarding_steps', 'workspace_id'):
            conn.execute('alter table onboarding_steps add column workspace_id text references workspaces(id)')
            conn.execute("update onboarding_steps set workspace_id = 'ws-default' where workspace_id is null")
        if not has_column(conn, 'workspace_memberships', 'status'):
            conn.execute("alter table workspace_memberships add column status text not null default 'active'")
            conn.execute("update workspace_memberships set status = 'active' where status is null")
        seed_db(conn)


def log_event(conn: sqlite3.Connection, lead_id: str, event_type: str, payload: dict) -> None:
    conn.execute(
        'insert into events (lead_id, event_type, payload_json, created_at) values (?, ?, ?, ?)',
        (lead_id, event_type, json.dumps(payload), utc_now()),
    )


def seed_db(conn: sqlite3.Connection) -> None:
    has_leads = conn.execute('select count(*) as count from leads where workspace_id = ?', ('ws-default',)).fetchone()['count']
    if has_leads:
        return

    conn.executemany('insert into workspaces (id, name) values (?, ?)', SEED_WORKSPACES)
    conn.executemany(
        'insert into users (id, name, email, password_hash) values (?, ?, ?, ?)',
        [(user_id, name, email, hash_password(password)) for user_id, name, email, password in SEED_USERS],
    )
    conn.executemany(
        'insert into workspace_memberships (user_id, workspace_id, role, status) values (?, ?, ?, ?)',
        SEED_MEMBERSHIPS,
    )
    conn.executemany('insert into stages (id, name, order_index) values (?, ?, ?)', SEED_STAGES)
    conn.executemany(
        '''
        insert into leads (
            id, workspace_id, name, company, owner, source, stage_id, temperature, value, next_action,
            status, lost_reason, last_reply_hours, summary_text, objections_json, signals_json,
            next_best_action, suggested_reply
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        [
            (
                lead['id'],
                lead['workspace_id'],
                lead['name'],
                lead['company'],
                lead['owner'],
                lead['source'],
                lead['stage_id'],
                lead['temperature'],
                lead['value'],
                lead['next_action'],
                lead['status'],
                None,
                lead['last_reply_hours'],
                lead['summary_text'],
                json.dumps(lead['objections']),
                json.dumps(lead['signals']),
                lead['next_best_action'],
                lead['suggested_reply'],
            )
            for lead in SEED_LEADS
        ],
    )
    conn.executemany('insert into team_members (workspace_id, name, role) values (?, ?, ?)', SEED_TEAM)
    conn.executemany('insert into tasks (workspace_id, lead_id, due_time, title, priority, completed) values (?, ?, ?, ?, ?, ?)', SEED_TASKS)
    conn.executemany('insert into onboarding_steps (workspace_id, title, done) values (?, ?, ?)', SEED_ONBOARDING)
    for lead_id, author, body in SEED_NOTES:
        conn.execute('insert into notes (lead_id, author, body, created_at) values (?, ?, ?, ?)', (lead_id, author, body, utc_now()))
        log_event(conn, lead_id, 'note_added', {'author': author, 'body': body})
    for lead in SEED_LEADS:
        log_event(conn, lead['id'], 'lead_seeded', {'stageId': lead['stage_id'], 'status': lead['status']})
    conn.commit()


def fetch_leads(conn: sqlite3.Connection, workspace_id: str = 'ws-default', search: str = '', owner: str = 'all', temperature: str = 'all', status: str = 'all') -> list[dict]:
    query = '''
        select leads.*, stages.name as stage_name
        from leads
        join stages on stages.id = leads.stage_id
        where leads.workspace_id = ?
          and (? = '' or lower(leads.name || ' ' || leads.company || ' ' || leads.source) like '%' || lower(?) || '%')
          and (? = 'all' or leads.owner = ?)
          and (? = 'all' or leads.temperature = ?)
          and (? = 'all' or lower(leads.status) like '%' || lower(?) || '%')
        order by leads.last_reply_hours desc, leads.value desc
    '''
    rows = conn.execute(query, (workspace_id, search, search, owner, owner, temperature, temperature, status, status)).fetchall()
    return [serialize_lead(row) for row in rows]


def serialize_lead(row: sqlite3.Row) -> dict:
    return {
        'id': row['id'],
        'name': row['name'],
        'company': row['company'],
        'owner': row['owner'],
        'source': row['source'],
        'stageId': row['stage_id'],
        'stageName': row['stage_name'],
        'temperature': row['temperature'],
        'value': row['value'],
        'nextAction': row['next_action'],
        'status': row['status'],
        'lostReason': row['lost_reason'],
        'lastReplyHours': row['last_reply_hours'],
    }


def fetch_summary(conn: sqlite3.Connection, lead_id: str) -> dict | None:
    row = conn.execute(
        'select leads.*, stages.name as stage_name from leads join stages on stages.id = leads.stage_id where leads.id = ?',
        (lead_id,),
    ).fetchone()
    if not row:
        return None
    return {
        'id': row['id'],
        'name': row['name'],
        'company': row['company'],
        'stageName': row['stage_name'],
        'status': row['status'],
        'lostReason': row['lost_reason'],
        'text': row['summary_text'],
        'objections': json.loads(row['objections_json']),
        'signals': json.loads(row['signals_json']),
        'nextBestAction': row['next_best_action'],
        'suggestedReply': row['suggested_reply'],
    }


def fetch_dashboard(conn: sqlite3.Connection, workspace_id: str = 'ws-default') -> dict:
    total_leads = conn.execute('select count(*) as count from leads where workspace_id = ?', (workspace_id,)).fetchone()['count']
    hot_leads = conn.execute("select count(*) as count from leads where workspace_id = ? and temperature = 'hot'", (workspace_id,)).fetchone()['count']
    risky = conn.execute(
        'select count(*) as count from leads where workspace_id = ? and last_reply_hours >= 18 and status not in ("Ganho", "Perdido")',
        (workspace_id,),
    ).fetchone()['count']
    revenue = conn.execute('select coalesce(sum(value), 0) as total from leads where workspace_id = ?', (workspace_id,)).fetchone()['total']
    priority_tasks = conn.execute(
        "select count(*) as count from tasks where workspace_id = ? and priority in ('urgent', 'high') and completed = 0",
        (workspace_id,),
    ).fetchone()['count']
    priorities = conn.execute('select id, name, company, owner, last_reply_hours from leads where workspace_id = ? order by last_reply_hours desc, value desc limit 3', (workspace_id,)).fetchall()
    return {
        'kpis': [
            {'label': 'Leads no pipeline', 'value': total_leads, 'detail': f'{hot_leads} quentes'},
            {'label': 'Receita prevista', 'value': revenue, 'detail': 'Somatório do pipeline'},
            {'label': 'Leads em risco', 'value': risky, 'detail': 'Silêncio crítico ou atraso'},
            {'label': 'Tasks prioritárias', 'value': priority_tasks, 'detail': 'Hoje'},
        ],
        'priorities': [
            {'id': row['id'], 'name': row['name'], 'company': row['company'], 'owner': row['owner'], 'lastReplyHours': row['last_reply_hours']}
            for row in priorities
        ],
        'generatedAt': utc_now(),
    }


def fetch_pipeline(conn: sqlite3.Connection, workspace_id: str = 'ws-default') -> list[dict]:
    stages = conn.execute('select id, name from stages order by order_index asc').fetchall()
    payload = []
    for stage in stages:
        leads = conn.execute('select id, name, company, owner, value from leads where workspace_id = ? and stage_id = ? order by value desc', (workspace_id, stage['id'])).fetchall()
        payload.append({'id': stage['id'], 'name': stage['name'], 'leads': [dict(row) for row in leads]})
    return payload


def fetch_tasks(conn: sqlite3.Connection, workspace_id: str = 'ws-default') -> dict:
    tasks = conn.execute(
        'select id, workspace_id, lead_id, due_time, title, priority from tasks where workspace_id = ? and completed = 0 order by due_time asc',
        (workspace_id,),
    ).fetchall()
    onboarding = conn.execute(
        'select title, done from onboarding_steps where workspace_id = ? order by id asc',
        (workspace_id,),
    ).fetchall()
    completed_count = conn.execute(
        'select count(*) as count from tasks where workspace_id = ? and completed = 1',
        (workspace_id,),
    ).fetchone()['count']
    return {
        'tasks': [dict(row) for row in tasks],
        'onboarding': [{'title': row['title'], 'done': bool(row['done'])} for row in onboarding],
        'completedCount': completed_count,
    }


def create_lead(conn: sqlite3.Connection, payload: dict) -> dict:
    lead_id = f'lead-{uuid4().hex[:8]}'
    workspace_id = payload.get('workspaceId', 'ws-default')
    stage_id = payload.get('stageId') or 'entry'
    conn.execute(
        '''
        insert into leads (
            id, workspace_id, name, company, owner, source, stage_id, temperature, value, next_action, status,
            lost_reason, last_reply_hours, summary_text, objections_json, signals_json, next_best_action, suggested_reply
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            lead_id,
            workspace_id,
            payload['name'],
            payload.get('company', 'Sem empresa'),
            payload.get('owner', 'Unassigned'),
            payload.get('source', 'Manual'),
            stage_id,
            payload.get('temperature', 'warm'),
            int(payload.get('value', 0)),
            payload.get('nextAction', 'Hoje, 17:00'),
            'Novo lead',
            None,
            0,
            payload.get('summaryText', 'Lead criado manualmente no workspace.'),
            json.dumps(payload.get('objections', ['Sem objeções mapeadas ainda'])),
            json.dumps(payload.get('signals', ['Lead recém-criado'])),
            payload.get('nextBestAction', 'Realizar primeiro contato e qualificação.'),
            payload.get('suggestedReply', 'Olá! Quero entender seu cenário e te mostrar como o Revenue OS pode ajudar.'),
        ),
    )
    log_event(conn, lead_id, 'lead_created', {'stageId': stage_id})
    conn.commit()
    row = conn.execute('select leads.*, stages.name as stage_name from leads join stages on stages.id = leads.stage_id where leads.id = ?', (lead_id,)).fetchone()
    return serialize_lead(row)


def update_lead_stage(conn: sqlite3.Connection, lead_id: str, stage_id: str) -> dict | None:
    before = conn.total_changes
    conn.execute('update leads set stage_id = ?, status = ? where id = ?', (stage_id, 'Etapa atualizada', lead_id))
    if conn.total_changes == before:
        return None
    log_event(conn, lead_id, 'stage_changed', {'stageId': stage_id})
    conn.commit()
    row = conn.execute('select leads.*, stages.name as stage_name from leads join stages on stages.id = leads.stage_id where leads.id = ?', (lead_id,)).fetchone()
    return serialize_lead(row) if row else None


def mark_lead_status(conn: sqlite3.Connection, lead_id: str, status: str, lost_reason: str | None = None) -> dict | None:
    before = conn.total_changes
    stage_id = 'won' if status == 'Ganho' else conn.execute('select stage_id from leads where id = ?', (lead_id,)).fetchone()
    next_stage = 'won' if status == 'Ganho' else (stage_id['stage_id'] if stage_id else 'proposal')
    conn.execute('update leads set status = ?, lost_reason = ?, stage_id = ? where id = ?', (status, lost_reason, next_stage, lead_id))
    if conn.total_changes == before:
        return None
    log_event(conn, lead_id, 'status_changed', {'status': status, 'lostReason': lost_reason})
    conn.commit()
    row = conn.execute('select leads.*, stages.name as stage_name from leads join stages on stages.id = leads.stage_id where leads.id = ?', (lead_id,)).fetchone()
    return serialize_lead(row) if row else None


def fetch_stages(conn: sqlite3.Connection) -> list[dict]:
    return [dict(row) for row in conn.execute('select id, name from stages order by order_index asc').fetchall()]


def fetch_notes(conn: sqlite3.Connection, lead_id: str) -> list[dict]:
    return [dict(row) for row in conn.execute('select id, author, body, created_at from notes where lead_id = ? order by id desc', (lead_id,)).fetchall()]


def create_note(conn: sqlite3.Connection, lead_id: str, payload: dict) -> dict:
    created_at = utc_now()
    author = payload.get('author', 'Equipe')
    body = payload['body']
    cursor = conn.execute('insert into notes (lead_id, author, body, created_at) values (?, ?, ?, ?)', (lead_id, author, body, created_at))
    log_event(conn, lead_id, 'note_added', {'author': author, 'body': body})
    note_id = cursor.lastrowid
    conn.commit()
    return dict(conn.execute('select id, author, body, created_at from notes where id = ?', (note_id,)).fetchone())


def create_task(conn: sqlite3.Connection, payload: dict) -> dict:
    lead_id = payload.get('leadId')
    workspace_id = payload.get('workspaceId')
    if lead_id:
        lead = conn.execute('select workspace_id from leads where id = ?', (lead_id,)).fetchone()
        workspace_id = lead['workspace_id'] if lead else workspace_id
    workspace_id = workspace_id or 'ws-default'
    cursor = conn.execute(
        'insert into tasks (workspace_id, lead_id, due_time, title, priority, completed) values (?, ?, ?, ?, ?, 0)',
        (workspace_id, lead_id, payload.get('dueTime', 'Hoje, 17:00'), payload['title'], payload.get('priority', 'medium')),
    )
    if lead_id:
        log_event(conn, lead_id, 'task_created', {'title': payload['title'], 'priority': payload.get('priority', 'medium')})
    task_id = cursor.lastrowid
    conn.commit()
    return dict(conn.execute('select id, workspace_id, lead_id, due_time, title, priority from tasks where id = ?', (task_id,)).fetchone())


def complete_task(conn: sqlite3.Connection, task_id: int) -> dict | None:
    task = conn.execute('select id, lead_id, title from tasks where id = ?', (task_id,)).fetchone()
    if not task:
        return None
    conn.execute('update tasks set completed = 1 where id = ?', (task_id,))
    if task['lead_id']:
        log_event(conn, task['lead_id'], 'task_completed', {'title': task['title']})
    conn.commit()
    return {'id': task_id, 'completed': True}


def fetch_timeline(conn: sqlite3.Connection, lead_id: str) -> list[dict]:
    rows = conn.execute('select id, event_type, payload_json, created_at from events where lead_id = ? order by id desc', (lead_id,)).fetchall()
    return [{'id': row['id'], 'eventType': row['event_type'], 'payload': json.loads(row['payload_json']), 'createdAt': row['created_at']} for row in rows]






def fetch_workspaces(conn: sqlite3.Connection) -> list[dict]:
    return [dict(row) for row in conn.execute('select id, name from workspaces order by id asc').fetchall()]


def fetch_user_workspaces(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    rows = conn.execute(
        '''
        select workspaces.id, workspaces.name, workspace_memberships.role
        from workspace_memberships
        join workspaces on workspaces.id = workspace_memberships.workspace_id
        where workspace_memberships.user_id = ?
          and workspace_memberships.status = 'active'
        order by workspaces.id asc
        ''',
        (user_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def fetch_user_invites(conn: sqlite3.Connection, user_id: str) -> list[dict]:
    rows = conn.execute(
        '''
        select workspaces.id, workspaces.name, workspace_memberships.role, workspace_memberships.status
        from workspace_memberships
        join workspaces on workspaces.id = workspace_memberships.workspace_id
        where workspace_memberships.user_id = ?
          and workspace_memberships.status = 'invited'
        order by workspaces.id asc
        ''',
        (user_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def create_session(conn: sqlite3.Connection, user_id: str) -> str:
    token = uuid4().hex
    conn.execute('insert into sessions (token, user_id, created_at) values (?, ?, ?)', (token, user_id, utc_now()))
    conn.commit()
    return token


def authenticate(conn: sqlite3.Connection, email: str, password: str) -> dict | None:
    user = conn.execute('select id, name, email, password_hash from users where lower(email) = lower(?)', (email,)).fetchone()
    if not user or user['password_hash'] != hash_password(password):
        return None
    token = create_session(conn, user['id'])
    workspaces = fetch_user_workspaces(conn, user['id'])
    invites = fetch_user_invites(conn, user['id'])
    return {
        'token': token,
        'user': {'id': user['id'], 'name': user['name'], 'email': user['email']},
        'workspaces': workspaces,
        'invites': invites,
    }


def fetch_session(conn: sqlite3.Connection, token: str) -> dict | None:
    row = conn.execute(
        '''
        select users.id, users.name, users.email
        from sessions
        join users on users.id = sessions.user_id
        where sessions.token = ?
        ''',
        (token,),
    ).fetchone()
    if not row:
        return None
    workspaces = fetch_user_workspaces(conn, row['id'])
    invites = fetch_user_invites(conn, row['id'])
    return {
        'user': {'id': row['id'], 'name': row['name'], 'email': row['email']},
        'workspaces': workspaces,
        'invites': invites,
    }


def revoke_session(conn: sqlite3.Connection, token: str) -> None:
    conn.execute('delete from sessions where token = ?', (token,))
    conn.commit()


def fetch_membership(conn: sqlite3.Connection, user_id: str, workspace_id: str) -> dict | None:
    row = conn.execute(
        'select user_id, workspace_id, role, status from workspace_memberships where user_id = ? and workspace_id = ?',
        (user_id, workspace_id),
    ).fetchone()
    return dict(row) if row else None


def role_allows(role: str, allowed_roles: tuple[str, ...]) -> bool:
    return role in allowed_roles


def fetch_active_membership(conn: sqlite3.Connection, user_id: str, workspace_id: str) -> dict | None:
    membership = fetch_membership(conn, user_id, workspace_id)
    if not membership or membership['status'] != 'active':
        return None
    return membership


def resolve_workspace_access(conn: sqlite3.Connection, session: dict | None, requested_workspace_id: str | None) -> tuple[str | None, dict | None]:
    if not session:
        return None, None
    workspaces = session.get('workspaces', [])
    workspace_id = requested_workspace_id or (workspaces[0]['id'] if workspaces else None)
    if not workspace_id:
        return None, None
    membership = fetch_active_membership(conn, session['user']['id'], workspace_id)
    if not membership:
        return None, None
    return workspace_id, membership


def fetch_lead_workspace(conn: sqlite3.Connection, lead_id: str) -> str | None:
    row = conn.execute('select workspace_id from leads where id = ?', (lead_id,)).fetchone()
    return row['workspace_id'] if row else None

def fetch_team(conn: sqlite3.Connection, workspace_id: str = 'ws-default') -> list[dict]:
    rows = conn.execute(
        '''
        select users.id, users.name, users.email, workspace_memberships.role, workspace_memberships.status
        from workspace_memberships
        join users on users.id = workspace_memberships.user_id
        where workspace_memberships.workspace_id = ?
        order by users.name asc
        ''',
        (workspace_id,),
    ).fetchall()
    return [dict(row) for row in rows]


def invite_team_member(conn: sqlite3.Connection, payload: dict) -> dict:
    workspace_id = payload.get('workspaceId', 'ws-default')
    email = payload['email'].strip().lower()
    user = conn.execute('select id, name, email from users where lower(email) = lower(?)', (email,)).fetchone()
    if user:
        user_id = user['id']
        conn.execute('update users set name = ? where id = ?', (payload['name'], user_id))
    else:
        user_id = f'user-{uuid4().hex[:8]}'
        conn.execute(
            'insert into users (id, name, email, password_hash) values (?, ?, ?, ?)',
            (user_id, payload['name'], email, hash_password('demo123')),
        )
    existing = fetch_membership(conn, user_id, workspace_id)
    if existing:
        conn.execute(
            'update workspace_memberships set role = ?, status = ? where user_id = ? and workspace_id = ?',
            (payload.get('role', 'rep'), 'invited', user_id, workspace_id),
        )
    else:
        conn.execute(
            'insert into workspace_memberships (user_id, workspace_id, role, status) values (?, ?, ?, ?)',
            (user_id, workspace_id, payload.get('role', 'rep'), 'invited'),
        )
    conn.commit()
    return dict(
        conn.execute(
            '''
            select users.id, users.name, users.email, workspace_memberships.role, workspace_memberships.status
            from workspace_memberships
            join users on users.id = workspace_memberships.user_id
            where workspace_memberships.user_id = ? and workspace_memberships.workspace_id = ?
            ''',
            (user_id, workspace_id),
        ).fetchone()
    )


def accept_team_invite(conn: sqlite3.Connection, user_id: str, workspace_id: str) -> dict | None:
    before = conn.total_changes
    conn.execute(
        "update workspace_memberships set status = 'active' where user_id = ? and workspace_id = ? and status = 'invited'",
        (user_id, workspace_id),
    )
    if conn.total_changes == before:
        return None
    conn.commit()
    return fetch_membership(conn, user_id, workspace_id)

def fetch_analytics(conn: sqlite3.Connection, workspace_id: str = 'ws-default') -> dict:
    sources = conn.execute('select source, count(*) as count, sum(value) as revenue from leads where workspace_id = ? group by source order by revenue desc', (workspace_id,)).fetchall()
    owners = conn.execute('select owner, count(*) as count, sum(value) as revenue from leads where workspace_id = ? group by owner order by revenue desc', (workspace_id,)).fetchall()
    statuses = conn.execute('select status, count(*) as count, sum(value) as revenue from leads where workspace_id = ? group by status order by count desc', (workspace_id,)).fetchall()
    insights = [
        'Sua maior queda está entre Qualificado e Negociação.',
        'Carla tem a maior taxa de ganho, mas também o maior volume em risco.',
        'Indicação converte melhor que Instagram nesta semana.',
        '11 leads estão sem resposta há mais de 24 horas.',
    ]
    return {
        'insights': insights,
        'sources': [dict(row) for row in sources],
        'owners': [dict(row) for row in owners],
        'statuses': [dict(row) for row in statuses],
    }


class RevenueOSHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def get_db_connection(self) -> sqlite3.Connection:
        db_path = getattr(self.server, 'db_path', None)
        return get_connection(db_path)

    def log_message(self, format: str, *args) -> None:
        return

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith('/api/'):
            self.handle_api_get(parsed)
            return
        if parsed.path == '/app':
            self.path = '/app.html'
        elif parsed.path == '/':
            self.path = '/index.html'
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith('/api/'):
            self.write_json({'error': 'Not found'}, status=404)
            return
        self.handle_api_write(parsed, method='POST')

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith('/api/'):
            self.write_json({'error': 'Not found'}, status=404)
            return
        self.handle_api_write(parsed, method='PATCH')

    def read_json_body(self) -> dict:
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length) if length else b'{}'
        return json.loads(body.decode('utf-8'))

    def read_bearer_token(self) -> str | None:
        header = self.headers.get('Authorization', '')
        if header.startswith('Bearer '):
            return header.split(' ', 1)[1].strip()
        return None

    def require_session(self, conn: sqlite3.Connection) -> dict | None:
        token = self.read_bearer_token()
        return fetch_session(conn, token) if token else None

    def handle_api_get(self, parsed) -> None:
        params = parse_qs(parsed.query)
        with self.get_db_connection() as conn:
            if parsed.path == '/api/health':
                return self.write_json({'status': 'ok'})
            if parsed.path == '/api/auth/me':
                token = self.read_bearer_token()
                if not token:
                    return self.write_json({'error': 'Unauthorized'}, status=401)
                session = fetch_session(conn, token)
                return self.write_json(session if session else {'error': 'Unauthorized'}, status=200 if session else 401)
            if parsed.path == '/api/workspaces':
                session = self.require_session(conn)
                if not session:
                    return self.write_json({'error': 'Unauthorized'}, status=401)
                return self.write_json({'items': session['workspaces']})

            session = self.require_session(conn)
            if not session:
                return self.write_json({'error': 'Unauthorized'}, status=401)

            requested_workspace_id = params.get('workspace', [None])[0]
            workspace_id, membership = resolve_workspace_access(conn, session, requested_workspace_id)

            if parsed.path in {'/api/dashboard', '/api/leads', '/api/pipeline', '/api/tasks', '/api/analytics', '/api/stages', '/api/team'} and not workspace_id:
                return self.write_json({'error': 'Forbidden'}, status=403)

            if parsed.path == '/api/dashboard':
                return self.write_json(fetch_dashboard(conn, workspace_id))
            if parsed.path == '/api/leads':
                return self.write_json({'items': fetch_leads(conn, workspace_id=workspace_id, search=params.get('search', [''])[0], owner=params.get('owner', ['all'])[0], temperature=params.get('temperature', ['all'])[0], status=params.get('status', ['all'])[0])})
            if parsed.path.startswith('/api/leads/') and parsed.path.endswith('/summary'):
                lead_id = parsed.path.split('/')[3]
                lead_workspace_id = fetch_lead_workspace(conn, lead_id)
                if not lead_workspace_id:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                summary = fetch_summary(conn, lead_id)
                return self.write_json(summary if summary else {'error': 'Lead not found'}, status=200 if summary else 404)
            if parsed.path.startswith('/api/leads/') and parsed.path.endswith('/notes'):
                lead_id = parsed.path.split('/')[3]
                lead_workspace_id = fetch_lead_workspace(conn, lead_id)
                if not lead_workspace_id:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                return self.write_json({'items': fetch_notes(conn, lead_id)})
            if parsed.path.startswith('/api/leads/') and parsed.path.endswith('/timeline'):
                lead_id = parsed.path.split('/')[3]
                lead_workspace_id = fetch_lead_workspace(conn, lead_id)
                if not lead_workspace_id:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                return self.write_json({'items': fetch_timeline(conn, lead_id)})
            if parsed.path == '/api/pipeline':
                return self.write_json({'stages': fetch_pipeline(conn, workspace_id)})
            if parsed.path == '/api/tasks':
                return self.write_json(fetch_tasks(conn, workspace_id))
            if parsed.path == '/api/analytics':
                if not membership or not role_allows(membership['role'], ('admin', 'manager')):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                return self.write_json(fetch_analytics(conn, workspace_id))
            if parsed.path == '/api/stages':
                return self.write_json({'items': fetch_stages(conn)})
            if parsed.path == '/api/team':
                return self.write_json({'items': fetch_team(conn, workspace_id)})
        self.write_json({'error': 'Not found'}, status=404)

    def handle_api_write(self, parsed, method: str) -> None:
        payload = self.read_json_body()
        with self.get_db_connection() as conn:
            if method == 'POST' and parsed.path == '/api/auth/login':
                if not payload.get('email') or not payload.get('password'):
                    return self.write_json({'error': 'email and password are required'}, status=400)
                session = authenticate(conn, payload['email'], payload['password'])
                return self.write_json(session if session else {'error': 'Invalid credentials'}, status=200 if session else 401)
            if method == 'POST' and parsed.path == '/api/auth/logout':
                token = self.read_bearer_token()
                if not token:
                    return self.write_json({'error': 'Unauthorized'}, status=401)
                revoke_session(conn, token)
                return self.write_json({'ok': True})

            session = self.require_session(conn)
            if not session:
                return self.write_json({'error': 'Unauthorized'}, status=401)

            if method == 'POST' and parsed.path == '/api/leads':
                if not payload.get('name'):
                    return self.write_json({'error': 'Missing fields: name'}, status=400)
                workspace_id, membership = resolve_workspace_access(conn, session, payload.get('workspaceId'))
                if not workspace_id or not membership:
                    return self.write_json({'error': 'Forbidden'}, status=403)
                payload['workspaceId'] = workspace_id
                return self.write_json(create_lead(conn, payload), status=201)
            if method == 'PATCH' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/stage'):
                lead_id = parsed.path.split('/')[3]
                lead_workspace_id = fetch_lead_workspace(conn, lead_id)
                if not lead_workspace_id:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                if not payload.get('stageId'):
                    return self.write_json({'error': 'stageId is required'}, status=400)
                lead = update_lead_stage(conn, lead_id, payload['stageId'])
                return self.write_json(lead if lead else {'error': 'Lead not found'}, status=200 if lead else 404)
            if method == 'POST' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/notes'):
                lead_id = parsed.path.split('/')[3]
                lead_workspace_id = fetch_lead_workspace(conn, lead_id)
                if not lead_workspace_id:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                if not payload.get('body'):
                    return self.write_json({'error': 'body is required'}, status=400)
                return self.write_json(create_note(conn, lead_id, payload), status=201)
            if method == 'POST' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/mark-won'):
                lead_id = parsed.path.split('/')[3]
                lead_workspace_id = fetch_lead_workspace(conn, lead_id)
                if not lead_workspace_id:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                lead = mark_lead_status(conn, lead_id, 'Ganho')
                return self.write_json(lead if lead else {'error': 'Lead not found'}, status=200 if lead else 404)
            if method == 'POST' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/mark-lost'):
                lead_id = parsed.path.split('/')[3]
                lead_workspace_id = fetch_lead_workspace(conn, lead_id)
                if not lead_workspace_id:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                lead = mark_lead_status(conn, lead_id, 'Perdido', payload.get('lostReason'))
                return self.write_json(lead if lead else {'error': 'Lead not found'}, status=200 if lead else 404)
            if method == 'POST' and parsed.path == '/api/team':
                workspace_id, membership = resolve_workspace_access(conn, session, payload.get('workspaceId'))
                if not workspace_id or not membership or not role_allows(membership['role'], ('admin', 'manager')):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                if not payload.get('name') or not payload.get('email'):
                    return self.write_json({'error': 'name and email are required'}, status=400)
                payload['workspaceId'] = workspace_id
                return self.write_json(invite_team_member(conn, payload), status=201)
            if method == 'POST' and parsed.path == '/api/team/accept-invite':
                workspace_id = payload.get('workspaceId', 'ws-default')
                membership = accept_team_invite(conn, session['user']['id'], workspace_id)
                return self.write_json(membership if membership else {'error': 'Invite not found'}, status=200 if membership else 404)
            if method == 'POST' and parsed.path == '/api/tasks':
                if not payload.get('title'):
                    return self.write_json({'error': 'title is required'}, status=400)
                workspace_id, membership = resolve_workspace_access(conn, session, payload.get('workspaceId'))
                if not workspace_id or not membership:
                    return self.write_json({'error': 'Forbidden'}, status=403)
                if payload.get('leadId'):
                    lead_workspace_id = fetch_lead_workspace(conn, payload['leadId'])
                    if not lead_workspace_id:
                        return self.write_json({'error': 'Lead not found'}, status=404)
                    if lead_workspace_id != workspace_id:
                        return self.write_json({'error': 'Lead belongs to another workspace'}, status=400)
                payload['workspaceId'] = workspace_id
                return self.write_json(create_task(conn, payload), status=201)
            if method == 'POST' and parsed.path.startswith('/api/tasks/') and parsed.path.endswith('/complete'):
                task_id = int(parsed.path.split('/')[3])
                task_row = conn.execute('select workspace_id from tasks where id = ?', (task_id,)).fetchone()
                if not task_row:
                    return self.write_json({'error': 'Task not found'}, status=404)
                if not fetch_active_membership(conn, session['user']['id'], task_row['workspace_id']):
                    return self.write_json({'error': 'Forbidden'}, status=403)
                task = complete_task(conn, task_id)
                return self.write_json(task if task else {'error': 'Task not found'}, status=200 if task else 404)
        self.write_json({'error': 'Not found'}, status=404)

    def write_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run(host: str = '127.0.0.1', port: int = 3000) -> None:
    init_db()
    server = ThreadingHTTPServer((host, port), RevenueOSHandler)
    print(f'Revenue OS running at http://{host}:{port}')
    server.serve_forever()


if __name__ == '__main__':
    run()
