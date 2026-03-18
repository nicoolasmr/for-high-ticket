from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / 'revenue_os.db'

SEED_STAGES = [
    ('entry', 'Entrada', 1),
    ('qualified', 'Qualificado', 2),
    ('negotiation', 'Negociação', 3),
    ('proposal', 'Proposta', 4),
    ('won', 'Fechado', 5),
]

SEED_LEADS = [
    {
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
    ('14:00', 'Call de qualificação com Lucas Neri', 'high'),
    ('16:30', 'Follow-up Ana Ribeiro com caso de uso', 'urgent'),
    ('17:00', 'Confirmar call da Clínica Lumina', 'medium'),
    ('18:00', 'Primeira resposta para Juliana Costa', 'high'),
]

SEED_ONBOARDING = [
    ('Definir nome do workspace', 1),
    ('Configurar pipeline padrão', 1),
    ('Importar leads iniciais', 0),
    ('Convidar time comercial', 0),
]


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path = DB_PATH) -> None:
    with get_connection(db_path) as conn:
        conn.executescript(
            '''
            create table if not exists stages (
                id text primary key,
                name text not null,
                order_index integer not null
            );

            create table if not exists leads (
                id text primary key,
                name text not null,
                company text not null,
                owner text not null,
                source text not null,
                stage_id text not null references stages(id),
                temperature text not null,
                value integer not null,
                next_action text not null,
                status text not null,
                last_reply_hours integer not null,
                summary_text text not null,
                objections_json text not null,
                signals_json text not null,
                next_best_action text not null,
                suggested_reply text not null
            );

            create table if not exists tasks (
                id integer primary key autoincrement,
                due_time text not null,
                title text not null,
                priority text not null
            );

            create table if not exists onboarding_steps (
                id integer primary key autoincrement,
                title text not null,
                done integer not null
            );
            '''
        )
        seed_db(conn)


def seed_db(conn: sqlite3.Connection) -> None:
    has_leads = conn.execute('select count(*) as count from leads').fetchone()['count']
    if has_leads:
        return

    conn.executemany('insert into stages (id, name, order_index) values (?, ?, ?)', SEED_STAGES)
    conn.executemany(
        '''
        insert into leads (
            id, name, company, owner, source, stage_id, temperature, value, next_action,
            status, last_reply_hours, summary_text, objections_json, signals_json,
            next_best_action, suggested_reply
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        [
            (
                lead['id'],
                lead['name'],
                lead['company'],
                lead['owner'],
                lead['source'],
                lead['stage_id'],
                lead['temperature'],
                lead['value'],
                lead['next_action'],
                lead['status'],
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
    conn.executemany('insert into tasks (due_time, title, priority) values (?, ?, ?)', SEED_TASKS)
    conn.executemany('insert into onboarding_steps (title, done) values (?, ?)', SEED_ONBOARDING)
    conn.commit()


def fetch_leads(conn: sqlite3.Connection, search: str = '', owner: str = 'all', temperature: str = 'all') -> list[dict]:
    query = '''
        select leads.*, stages.name as stage_name
        from leads
        join stages on stages.id = leads.stage_id
        where (? = '' or lower(leads.name || ' ' || leads.company || ' ' || leads.source) like '%' || lower(?) || '%')
          and (? = 'all' or leads.owner = ?)
          and (? = 'all' or leads.temperature = ?)
        order by leads.last_reply_hours desc, leads.value desc
    '''
    rows = conn.execute(query, (search, search, owner, owner, temperature, temperature)).fetchall()
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
        'text': row['summary_text'],
        'objections': json.loads(row['objections_json']),
        'signals': json.loads(row['signals_json']),
        'nextBestAction': row['next_best_action'],
        'suggestedReply': row['suggested_reply'],
    }


def fetch_dashboard(conn: sqlite3.Connection) -> dict:
    total_leads = conn.execute('select count(*) as count from leads').fetchone()['count']
    hot_leads = conn.execute("select count(*) as count from leads where temperature = 'hot'").fetchone()['count']
    risky = conn.execute('select count(*) as count from leads where last_reply_hours >= 18').fetchone()['count']
    revenue = conn.execute('select coalesce(sum(value), 0) as total from leads').fetchone()['total']
    priority_tasks = conn.execute("select count(*) as count from tasks where priority in ('urgent', 'high')").fetchone()['count']

    priorities = conn.execute(
        'select id, name, company, owner, last_reply_hours from leads order by last_reply_hours desc, value desc limit 3'
    ).fetchall()

    return {
        'kpis': [
            {'label': 'Leads no pipeline', 'value': total_leads, 'detail': f'{hot_leads} quentes'},
            {'label': 'Receita prevista', 'value': revenue, 'detail': 'Somatório do pipeline'},
            {'label': 'Leads em risco', 'value': risky, 'detail': 'Silêncio crítico ou atraso'},
            {'label': 'Tasks prioritárias', 'value': priority_tasks, 'detail': 'Hoje'},
        ],
        'priorities': [
            {
                'id': row['id'],
                'name': row['name'],
                'company': row['company'],
                'owner': row['owner'],
                'lastReplyHours': row['last_reply_hours'],
            }
            for row in priorities
        ],
        'generatedAt': datetime.now(timezone.utc).isoformat(),
    }


def fetch_pipeline(conn: sqlite3.Connection) -> list[dict]:
    stages = conn.execute('select id, name from stages order by order_index asc').fetchall()
    payload = []
    for stage in stages:
        leads = conn.execute(
            'select id, name, company, owner, value from leads where stage_id = ? order by value desc', (stage['id'],)
        ).fetchall()
        payload.append(
            {
                'id': stage['id'],
                'name': stage['name'],
                'leads': [dict(row) for row in leads],
            }
        )
    return payload


def fetch_tasks(conn: sqlite3.Connection) -> dict:
    tasks = conn.execute('select due_time, title, priority from tasks order by due_time asc').fetchall()
    onboarding = conn.execute('select title, done from onboarding_steps order by id asc').fetchall()
    return {
        'tasks': [dict(row) for row in tasks],
        'onboarding': [{'title': row['title'], 'done': bool(row['done'])} for row in onboarding],
    }


def create_lead(conn: sqlite3.Connection, payload: dict) -> dict:
    lead_id = f"lead-{uuid4().hex[:8]}"
    stage_id = payload.get('stageId') or 'entry'
    conn.execute(
        '''
        insert into leads (
            id, name, company, owner, source, stage_id, temperature, value, next_action, status,
            last_reply_hours, summary_text, objections_json, signals_json, next_best_action, suggested_reply
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''',
        (
            lead_id,
            payload['name'],
            payload.get('company', 'Sem empresa'),
            payload.get('owner', 'Unassigned'),
            payload.get('source', 'Manual'),
            stage_id,
            payload.get('temperature', 'warm'),
            int(payload.get('value', 0)),
            payload.get('nextAction', 'Hoje, 17:00'),
            'Novo lead',
            0,
            payload.get('summaryText', 'Lead criado manualmente no workspace.'),
            json.dumps(payload.get('objections', ['Sem objeções mapeadas ainda'])),
            json.dumps(payload.get('signals', ['Lead recém-criado'])),
            payload.get('nextBestAction', 'Realizar primeiro contato e qualificação.'),
            payload.get('suggestedReply', 'Olá! Quero entender seu cenário e te mostrar como o Revenue OS pode ajudar.'),
        ),
    )
    conn.commit()
    row = conn.execute(
        'select leads.*, stages.name as stage_name from leads join stages on stages.id = leads.stage_id where leads.id = ?',
        (lead_id,),
    ).fetchone()
    return serialize_lead(row)


def update_lead_stage(conn: sqlite3.Connection, lead_id: str, stage_id: str) -> dict | None:
    conn.execute('update leads set stage_id = ?, status = ? where id = ?', (stage_id, 'Etapa atualizada', lead_id))
    if conn.total_changes == 0:
        return None
    conn.commit()
    row = conn.execute(
        'select leads.*, stages.name as stage_name from leads join stages on stages.id = leads.stage_id where leads.id = ?',
        (lead_id,),
    ).fetchone()
    return serialize_lead(row) if row else None


def fetch_stages(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute('select id, name from stages order by order_index asc').fetchall()
    return [dict(row) for row in rows]


def fetch_analytics(conn: sqlite3.Connection) -> dict:
    sources = conn.execute('select source, count(*) as count, sum(value) as revenue from leads group by source order by revenue desc').fetchall()
    insights = [
        'Sua maior queda está entre Qualificado e Negociação.',
        'Carla tem a maior taxa de ganho, mas também o maior volume em risco.',
        'Indicação converte melhor que Instagram nesta semana.',
        '11 leads estão sem resposta há mais de 24 horas.',
    ]
    return {
        'insights': insights,
        'sources': [dict(row) for row in sources],
    }


class RevenueOSHandler(SimpleHTTPRequestHandler):
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

    def __init__(self, *args, directory: str | None = None, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

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

    def read_json_body(self) -> dict:
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length) if length else b'{}'
        return json.loads(body.decode('utf-8'))

    def handle_api_get(self, parsed) -> None:
        params = parse_qs(parsed.query)
        with get_connection() as conn:
            if parsed.path == '/api/health':
                return self.write_json({'status': 'ok'})
            if parsed.path == '/api/dashboard':
                return self.write_json(fetch_dashboard(conn))
            if parsed.path == '/api/leads':
                payload = fetch_leads(
                    conn,
                    search=params.get('search', [''])[0],
                    owner=params.get('owner', ['all'])[0],
                    temperature=params.get('temperature', ['all'])[0],
                )
                return self.write_json({'items': payload})
            if parsed.path.startswith('/api/leads/') and parsed.path.endswith('/summary'):
                lead_id = parsed.path.split('/')[3]
                summary = fetch_summary(conn, lead_id)
                if summary is None:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                return self.write_json(summary)
            if parsed.path == '/api/pipeline':
                return self.write_json({'stages': fetch_pipeline(conn)})
            if parsed.path == '/api/tasks':
                return self.write_json(fetch_tasks(conn))
            if parsed.path == '/api/analytics':
                return self.write_json(fetch_analytics(conn))
            if parsed.path == '/api/stages':
                return self.write_json({'items': fetch_stages(conn)})
        self.write_json({'error': 'Not found'}, status=404)

    def handle_api_write(self, parsed, method: str) -> None:
        payload = self.read_json_body()
        with get_connection() as conn:
            if method == 'POST' and parsed.path == '/api/leads':
                required = ['name']
                missing = [field for field in required if not payload.get(field)]
                if missing:
                    return self.write_json({'error': 'Missing fields: ' + ', '.join(missing)}, status=400)
                lead = create_lead(conn, payload)
                return self.write_json(lead, status=201)
            if method == 'PATCH' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/stage'):
                lead_id = parsed.path.split('/')[3]
                if not payload.get('stageId'):
                    return self.write_json({'error': 'stageId is required'}, status=400)
                lead = update_lead_stage(conn, lead_id, payload['stageId'])
                if lead is None:
                    return self.write_json({'error': 'Lead not found'}, status=404)
                return self.write_json(lead)
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
