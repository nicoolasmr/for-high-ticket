from __future__ import annotations

import json
import os
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import server


def parse_json_body(raw_body: bytes) -> dict:
    body = raw_body or b'{}'
    try:
        payload = json.loads(body.decode('utf-8'))
    except json.JSONDecodeError as exc:
        raise ValueError('Invalid JSON body') from exc
    if not isinstance(payload, dict):
        raise ValueError('JSON body must be an object')
    return payload


def read_bearer_token(headers: dict[str, str]) -> str | None:
    header = headers.get('Authorization', '')
    if header.startswith('Bearer '):
        return header.split(' ', 1)[1].strip()
    return None


def parse_non_negative_int(raw_value: str | None, field_name: str, default: int | None = None) -> int | None:
    if raw_value in (None, ''):
        return default
    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f'{field_name} must be an integer') from exc
    if value < 0:
        raise ValueError(f'{field_name} must be >= 0')
    return value


def json_response(payload: dict, status: int, request_id: str) -> tuple[str, list[tuple[str, str]], list[bytes]]:
    payload = dict(payload)
    payload.setdefault('requestId', request_id)
    if 'error' in payload and 'code' not in payload:
        payload['code'] = server.default_error_code(status)
    body = json.dumps(payload).encode('utf-8')
    headers = [
        ('Content-Type', 'application/json; charset=utf-8'),
        ('Content-Length', str(len(body))),
        ('Cache-Control', 'no-store'),
        ('X-Request-Id', request_id),
        ('X-Content-Type-Options', 'nosniff'),
        ('X-Frame-Options', 'DENY'),
        ('Referrer-Policy', 'no-referrer'),
    ]
    return f'{status} {status_text(status)}', headers, [body]


def status_text(status: int) -> str:
    return {
        200: 'OK',
        201: 'Created',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        422: 'Unprocessable Entity',
    }.get(status, 'OK')


def handle_api_request(method: str, raw_path: str, headers: dict[str, str], raw_body: bytes) -> tuple[int, dict, str]:
    request_id = uuid4().hex
    parsed = urlparse(raw_path)
    params = parse_qs(parsed.query)
    server.ensure_database_ready()
    with server.get_connection() as conn:
        def require_session():
            token = read_bearer_token(headers)
            return server.fetch_session(conn, token) if token else None

        if method == 'GET' and parsed.path in {'/api', '/api/', '/api/health'}:
            return 200, {'status': 'ok', 'backend': server.resolve_backend_name()}, request_id

        if method == 'GET' and parsed.path == '/api/auth/me':
            token = read_bearer_token(headers)
            if not token:
                return 401, {'error': 'Unauthorized'}, request_id
            session = server.fetch_session(conn, token)
            return (200, session, request_id) if session else (401, {'error': 'Unauthorized'}, request_id)

        if method == 'POST' and parsed.path == '/api/auth/login':
            try:
                payload = parse_json_body(raw_body)
            except ValueError as error:
                return 400, {'error': str(error)}, request_id
            if not payload.get('email') or not payload.get('password'):
                return 400, {'error': 'email and password are required'}, request_id
            session = server.authenticate(conn, payload['email'], payload['password'])
            return (200, session, request_id) if session else (401, {'error': 'Invalid credentials'}, request_id)

        if method == 'POST' and parsed.path == '/api/auth/logout':
            token = read_bearer_token(headers)
            if not token:
                return 401, {'error': 'Unauthorized'}, request_id
            server.revoke_session(conn, token)
            return 200, {'ok': True}, request_id

        session = require_session()
        if not session:
            return 401, {'error': 'Unauthorized'}, request_id

        if method == 'GET' and parsed.path == '/api/workspaces':
            return 200, {'items': session['workspaces']}, request_id

        requested_workspace_id = params.get('workspace', [None])[0]
        workspace_id, membership = server.resolve_workspace_access(conn, session, requested_workspace_id)

        if parsed.path in {'/api/dashboard', '/api/leads', '/api/pipeline', '/api/tasks', '/api/analytics', '/api/stages', '/api/team'} and not workspace_id:
            return 403, {'error': 'Forbidden'}, request_id

        if method == 'GET' and parsed.path == '/api/dashboard':
            return 200, server.fetch_dashboard(conn, workspace_id), request_id
        if method == 'GET' and parsed.path == '/api/leads':
            search = params.get('search', [''])[0]
            owner = params.get('owner', ['all'])[0]
            temperature = params.get('temperature', ['all'])[0]
            status = params.get('status', ['all'])[0]
            try:
                limit = parse_non_negative_int(params.get('limit', [None])[0], 'limit')
                offset = parse_non_negative_int(params.get('offset', [None])[0], 'offset', 0) or 0
            except ValueError as error:
                return 422, {'error': str(error)}, request_id
            total = server.count_leads(conn, workspace_id=workspace_id, search=search, owner=owner, temperature=temperature, status=status)
            items = server.fetch_leads(conn, workspace_id=workspace_id, search=search, owner=owner, temperature=temperature, status=status, limit=limit, offset=offset)
            return 200, {'items': items, 'meta': {'total': total, 'limit': limit, 'offset': offset}}, request_id
        if method == 'GET' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/summary'):
            lead_id = parsed.path.split('/')[3]
            lead_workspace_id = server.fetch_lead_workspace(conn, lead_id)
            if not lead_workspace_id:
                return 404, {'error': 'Lead not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                return 403, {'error': 'Forbidden'}, request_id
            summary = server.fetch_summary(conn, lead_id)
            return (200, summary, request_id) if summary else (404, {'error': 'Lead not found'}, request_id)
        if method == 'GET' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/notes'):
            lead_id = parsed.path.split('/')[3]
            lead_workspace_id = server.fetch_lead_workspace(conn, lead_id)
            if not lead_workspace_id:
                return 404, {'error': 'Lead not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                return 403, {'error': 'Forbidden'}, request_id
            return 200, {'items': server.fetch_notes(conn, lead_id)}, request_id
        if method == 'GET' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/timeline'):
            lead_id = parsed.path.split('/')[3]
            lead_workspace_id = server.fetch_lead_workspace(conn, lead_id)
            if not lead_workspace_id:
                return 404, {'error': 'Lead not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                return 403, {'error': 'Forbidden'}, request_id
            return 200, {'items': server.fetch_timeline(conn, lead_id)}, request_id
        if method == 'GET' and parsed.path == '/api/pipeline':
            return 200, {'stages': server.fetch_pipeline(conn, workspace_id)}, request_id
        if method == 'GET' and parsed.path == '/api/tasks':
            return 200, server.fetch_tasks(conn, workspace_id), request_id
        if method == 'GET' and parsed.path == '/api/analytics':
            if not membership or not server.role_allows(membership['role'], ('admin', 'manager')):
                return 403, {'error': 'Forbidden'}, request_id
            return 200, server.fetch_analytics(conn, workspace_id), request_id
        if method == 'GET' and parsed.path == '/api/stages':
            return 200, {'items': server.fetch_stages(conn)}, request_id
        if method == 'GET' and parsed.path == '/api/team':
            return 200, {'items': server.fetch_team(conn, workspace_id)}, request_id

        try:
            payload = parse_json_body(raw_body) if method in {'POST', 'PATCH'} else {}
        except ValueError as error:
            return 400, {'error': str(error)}, request_id

        if method == 'POST' and parsed.path == '/api/leads':
            if not payload.get('name'):
                return 400, {'error': 'Missing fields: name'}, request_id
            workspace_id, membership = server.resolve_workspace_access(conn, session, payload.get('workspaceId'))
            if not workspace_id or not membership:
                return 403, {'error': 'Forbidden'}, request_id
            payload['workspaceId'] = workspace_id
            return 201, server.create_lead(conn, payload), request_id
        if method == 'PATCH' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/stage'):
            lead_id = parsed.path.split('/')[3]
            lead_workspace_id = server.fetch_lead_workspace(conn, lead_id)
            if not lead_workspace_id:
                return 404, {'error': 'Lead not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                return 403, {'error': 'Forbidden'}, request_id
            if not payload.get('stageId'):
                return 400, {'error': 'stageId is required'}, request_id
            lead = server.update_lead_stage(conn, lead_id, payload['stageId'])
            return (200, lead, request_id) if lead else (404, {'error': 'Lead not found'}, request_id)
        if method == 'POST' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/notes'):
            lead_id = parsed.path.split('/')[3]
            lead_workspace_id = server.fetch_lead_workspace(conn, lead_id)
            if not lead_workspace_id:
                return 404, {'error': 'Lead not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                return 403, {'error': 'Forbidden'}, request_id
            if not payload.get('body'):
                return 400, {'error': 'body is required'}, request_id
            return 201, server.create_note(conn, lead_id, payload), request_id
        if method == 'POST' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/mark-won'):
            lead_id = parsed.path.split('/')[3]
            lead_workspace_id = server.fetch_lead_workspace(conn, lead_id)
            if not lead_workspace_id:
                return 404, {'error': 'Lead not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                return 403, {'error': 'Forbidden'}, request_id
            lead = server.mark_lead_status(conn, lead_id, 'Ganho')
            return (200, lead, request_id) if lead else (404, {'error': 'Lead not found'}, request_id)
        if method == 'POST' and parsed.path.startswith('/api/leads/') and parsed.path.endswith('/mark-lost'):
            lead_id = parsed.path.split('/')[3]
            lead_workspace_id = server.fetch_lead_workspace(conn, lead_id)
            if not lead_workspace_id:
                return 404, {'error': 'Lead not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], lead_workspace_id):
                return 403, {'error': 'Forbidden'}, request_id
            lead = server.mark_lead_status(conn, lead_id, 'Perdido', payload.get('lostReason'))
            return (200, lead, request_id) if lead else (404, {'error': 'Lead not found'}, request_id)
        if method == 'POST' and parsed.path == '/api/team':
            workspace_id, membership = server.resolve_workspace_access(conn, session, payload.get('workspaceId'))
            if not workspace_id or not membership or not server.role_allows(membership['role'], ('admin', 'manager')):
                return 403, {'error': 'Forbidden'}, request_id
            if not payload.get('name') or not payload.get('email'):
                return 400, {'error': 'name and email are required'}, request_id
            payload['workspaceId'] = workspace_id
            return 201, server.invite_team_member(conn, payload), request_id
        if method == 'POST' and parsed.path == '/api/team/accept-invite':
            workspace_id = payload.get('workspaceId', 'ws-default')
            membership = server.accept_team_invite(conn, session['user']['id'], workspace_id)
            return (200, membership, request_id) if membership else (404, {'error': 'Invite not found'}, request_id)
        if method == 'POST' and parsed.path == '/api/tasks':
            if not payload.get('title'):
                return 400, {'error': 'title is required'}, request_id
            workspace_id, membership = server.resolve_workspace_access(conn, session, payload.get('workspaceId'))
            if not workspace_id or not membership:
                return 403, {'error': 'Forbidden'}, request_id
            if payload.get('leadId'):
                lead_workspace_id = server.fetch_lead_workspace(conn, payload['leadId'])
                if not lead_workspace_id:
                    return 404, {'error': 'Lead not found'}, request_id
                if lead_workspace_id != workspace_id:
                    return 400, {'error': 'Lead belongs to another workspace'}, request_id
            payload['workspaceId'] = workspace_id
            return 201, server.create_task(conn, payload), request_id
        if method == 'POST' and parsed.path.startswith('/api/tasks/') and parsed.path.endswith('/complete'):
            task_id = int(parsed.path.split('/')[3])
            task_row = conn.execute('select workspace_id from tasks where id = ?', (task_id,)).fetchone()
            if not task_row:
                return 404, {'error': 'Task not found'}, request_id
            if not server.fetch_active_membership(conn, session['user']['id'], task_row['workspace_id']):
                return 403, {'error': 'Forbidden'}, request_id
            task = server.complete_task(conn, task_id)
            return (200, task, request_id) if task else (404, {'error': 'Task not found'}, request_id)

    return 404, {'error': 'Not found'}, request_id


def application(environ, start_response):
    method = environ.get('REQUEST_METHOD', 'GET').upper()
    path = environ.get('PATH_INFO', '/')
    query_string = environ.get('QUERY_STRING', '')
    raw_path = f'{path}?{query_string}' if query_string else path
    content_length = int(environ.get('CONTENT_LENGTH') or 0)
    raw_body = environ['wsgi.input'].read(content_length) if content_length else b''
    headers = {
        'Authorization': environ.get('HTTP_AUTHORIZATION', ''),
        'Content-Type': environ.get('CONTENT_TYPE', 'application/json'),
    }
    status, payload, request_id = handle_api_request(method, raw_path, headers, raw_body)
    if os.getenv('REVENUE_OS_DISABLE_API_LOGS') != '1':
        print(json.dumps({'requestId': request_id, 'method': method, 'path': raw_path, 'status': status}), flush=True)
    status_line, response_headers, chunks = json_response(payload, status, request_id)
    start_response(status_line, response_headers)
    return chunks


app = application
