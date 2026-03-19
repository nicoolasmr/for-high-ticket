from http.client import HTTPConnection
import json
import os
from pathlib import Path
import sys
import tempfile
from threading import Thread
import unittest

os.environ['REVENUE_OS_DISABLE_API_LOGS'] = '1'

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import server


class RevenueOSTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / 'test.db'
        server.init_db(self.db_path)
        self.conn = server.get_connection(self.db_path)

    def tearDown(self):
        self.conn.close()
        self.temp_dir.cleanup()

    def test_get_connection_uses_current_db_path_by_default(self):
        original_db_path = server.DB_PATH
        try:
            server.DB_PATH = self.db_path
            with server.get_connection() as conn:
                count = conn.execute('select count(*) as count from workspaces').fetchone()['count']
            self.assertGreaterEqual(count, 2)
        finally:
            server.DB_PATH = original_db_path

    def test_seeded_leads_exist(self):
        leads = server.fetch_leads(self.conn)
        self.assertGreaterEqual(len(leads), 3)
        self.assertEqual(leads[0]['id'], 'lead-1')

    def test_filters_work(self):
        leads = server.fetch_leads(self.conn, workspace_id='ws-clinics', owner='Carla', temperature='hot', status='proposta')
        ids = {lead['id'] for lead in leads}
        self.assertEqual(ids, {'lead-3'})

    def test_fetch_leads_supports_pagination(self):
        leads = server.fetch_leads(self.conn, workspace_id='ws-default', limit=2, offset=1)
        self.assertEqual(len(leads), 2)
        self.assertEqual([lead['id'] for lead in leads], ['lead-2', 'lead-4'])
        self.assertEqual(server.count_leads(self.conn, workspace_id='ws-default'), 3)

    def test_summary_exists(self):
        summary = server.fetch_summary(self.conn, 'lead-1')
        self.assertIsNotNone(summary)
        self.assertIn('objections', summary)
        self.assertEqual(summary['name'], 'Ana Ribeiro')

    def test_dashboard_payload(self):
        dashboard = server.fetch_dashboard(self.conn)
        self.assertEqual(len(dashboard['kpis']), 4)
        self.assertEqual(len(dashboard['priorities']), 3)

    def test_workspaces_are_isolated(self):
        default_leads = {lead['id'] for lead in server.fetch_leads(self.conn, workspace_id='ws-default')}
        clinic_leads = {lead['id'] for lead in server.fetch_leads(self.conn, workspace_id='ws-clinics')}
        self.assertEqual(default_leads, {'lead-1', 'lead-2', 'lead-4'})
        self.assertEqual(clinic_leads, {'lead-3'})

    def test_analytics_payload(self):
        analytics = server.fetch_analytics(self.conn)
        self.assertIn('owners', analytics)
        self.assertIn('statuses', analytics)
        self.assertTrue(any(item['owner'] == 'Carla' for item in analytics['owners']))

    def test_create_lead(self):
        lead = server.create_lead(self.conn, {'name': 'Novo Lead', 'company': 'Empresa X', 'owner': 'Bia', 'source': 'Manual', 'temperature': 'hot', 'value': 9900})
        self.assertEqual(lead['name'], 'Novo Lead')
        self.assertEqual(lead['stageId'], 'entry')

    def test_update_lead_stage(self):
        lead = server.update_lead_stage(self.conn, 'lead-2', 'proposal')
        self.assertIsNotNone(lead)
        self.assertEqual(lead['stageId'], 'proposal')

    def test_create_and_complete_task(self):
        task = server.create_task(self.conn, {'title': 'Enviar proposta', 'priority': 'high', 'leadId': 'lead-1'})
        self.assertEqual(task['title'], 'Enviar proposta')
        self.assertEqual(task['workspace_id'], 'ws-default')
        completed = server.complete_task(self.conn, task['id'])
        self.assertEqual(completed, {'id': task['id'], 'completed': True})

    def test_tasks_are_isolated_by_workspace(self):
        default_tasks = server.fetch_tasks(self.conn, workspace_id='ws-default')
        clinic_tasks = server.fetch_tasks(self.conn, workspace_id='ws-clinics')
        self.assertTrue(all(task['workspace_id'] == 'ws-default' for task in default_tasks['tasks']))
        self.assertTrue(all(task['workspace_id'] == 'ws-clinics' for task in clinic_tasks['tasks']))
        self.assertGreater(len(default_tasks['tasks']), 0)
        self.assertGreater(len(clinic_tasks['tasks']), 0)
        self.assertNotEqual(default_tasks['onboarding'], clinic_tasks['onboarding'])

    def test_authenticate_and_fetch_session(self):
        session = server.authenticate(self.conn, 'carla@highticketlabs.com', 'demo123')
        self.assertIsNotNone(session)
        self.assertEqual(session['user']['name'], 'Carla')
        self.assertEqual({workspace['id'] for workspace in session['workspaces']}, {'ws-default'})
        self.assertEqual(session['invites'], [])
        fetched = server.fetch_session(self.conn, session['token'])
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched['user']['email'], 'carla@highticketlabs.com')

    def test_membership_role_helpers(self):
        membership = server.fetch_membership(self.conn, 'user-3', 'ws-default')
        self.assertEqual(membership['role'], 'rep')
        self.assertTrue(server.role_allows('admin', ('admin', 'manager')))
        self.assertFalse(server.role_allows('rep', ('admin', 'manager')))

    def test_sqlite_schema_does_not_keep_team_members_table(self):
        row = self.conn.execute(
            "select name from sqlite_master where type = 'table' and name = 'team_members'"
        ).fetchone()
        self.assertIsNone(row)

    def test_create_and_fetch_note(self):
        note = server.create_note(self.conn, 'lead-1', {'author': 'Carla', 'body': 'Lead pediu validação de ROI.'})
        self.assertEqual(note['author'], 'Carla')
        notes = server.fetch_notes(self.conn, 'lead-1')
        self.assertTrue(any(item['body'] == 'Lead pediu validação de ROI.' for item in notes))

    def test_mark_won_and_lost(self):
        won = server.mark_lead_status(self.conn, 'lead-2', 'Ganho')
        self.assertEqual(won['stageId'], 'won')
        lost = server.mark_lead_status(self.conn, 'lead-3', 'Perdido', 'Sem budget')
        self.assertEqual(lost['lostReason'], 'Sem budget')

    def test_timeline_collects_events(self):
        server.create_note(self.conn, 'lead-1', {'author': 'Carla', 'body': 'Nova nota de timeline'})
        timeline = server.fetch_timeline(self.conn, 'lead-1')
        self.assertTrue(any(item['eventType'] == 'note_added' for item in timeline))

    def test_team_invite(self):
        member = server.invite_team_member(self.conn, {'name': 'Bia', 'email': 'bia@example.com', 'role': 'rep'})
        self.assertEqual(member['name'], 'Bia')
        self.assertEqual(member['status'], 'invited')
        team = server.fetch_team(self.conn)
        self.assertTrue(any(item['name'] == 'Bia' for item in team))

    def test_accept_team_invite(self):
        member = server.invite_team_member(self.conn, {'name': 'Bia', 'email': 'bia@example.com', 'role': 'rep'})
        accepted = server.accept_team_invite(self.conn, member['id'], 'ws-default')
        self.assertIsNotNone(accepted)
        self.assertEqual(accepted['status'], 'active')

    def test_invited_user_session_lists_pending_invites(self):
        session = server.authenticate(self.conn, 'bia@invitee.com', 'demo123')
        self.assertIsNotNone(session)
        self.assertEqual(session['workspaces'], [])
        self.assertEqual({invite['id'] for invite in session['invites']}, {'ws-default'})


class RevenueOSHttpTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / 'http-test.db'
        server.init_db(self.db_path)
        self.httpd = server.ThreadingHTTPServer(('127.0.0.1', 0), server.RevenueOSHandler)
        self.httpd.db_path = self.db_path
        self.port = self.httpd.server_address[1]
        self.thread = Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()
        self.session = self.login('carla@highticketlabs.com', 'demo123')
        self.rep_session = self.login('marcos@highticketlabs.com', 'demo123')

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)
        self.temp_dir.cleanup()

    def request(self, method, path, payload=None, token=None):
        conn = HTTPConnection('127.0.0.1', self.port, timeout=5)
        headers = {}
        body = None
        if payload is not None:
            body = json.dumps(payload)
            headers['Content-Type'] = 'application/json'
        if token:
            headers['Authorization'] = f'Bearer {token}'
        conn.request(method, path, body=body, headers=headers)
        response = conn.getresponse()
        data = json.loads(response.read().decode('utf-8'))
        conn.close()
        return response.status, data

    def login(self, email, password):
        status, payload = self.request('POST', '/api/auth/login', {'email': email, 'password': password})
        self.assertEqual(status, 200)
        return payload

    def test_dashboard_requires_authentication(self):
        status, payload = self.request('GET', '/api/dashboard?workspace=ws-default')
        self.assertEqual(status, 401)
        self.assertEqual(payload['error'], 'Unauthorized')
        self.assertEqual(payload['code'], 'unauthorized')

    def test_workspaces_require_authentication(self):
        status, payload = self.request('GET', '/api/workspaces')
        self.assertEqual(status, 401)
        self.assertEqual(payload['error'], 'Unauthorized')

    def test_dashboard_priority_tasks_are_workspace_scoped(self):
        status, payload = self.request('GET', '/api/dashboard?workspace=ws-default', token=self.session['token'])
        self.assertEqual(status, 200)
        priorities_kpi = next(item for item in payload['kpis'] if item['label'] == 'Tasks prioritárias')
        self.assertEqual(priorities_kpi['value'], 3)

    def test_leads_endpoint_returns_meta_and_request_id(self):
        status, payload = self.request('GET', '/api/leads?workspace=ws-default&limit=2&offset=1', token=self.session['token'])
        self.assertEqual(status, 200)
        self.assertEqual(payload['meta'], {'total': 3, 'limit': 2, 'offset': 1})
        self.assertEqual([item['id'] for item in payload['items']], ['lead-2', 'lead-4'])
        self.assertTrue(payload['requestId'])

    def test_leads_endpoint_validates_limit_param(self):
        status, payload = self.request('GET', '/api/leads?workspace=ws-default&limit=abc', token=self.session['token'])
        self.assertEqual(status, 422)
        self.assertEqual(payload['error'], 'limit must be an integer')
        self.assertEqual(payload['code'], 'validation_error')
        self.assertTrue(payload['requestId'])

    def test_cross_workspace_lead_summary_is_forbidden(self):
        status, payload = self.request('GET', '/api/leads/lead-3/summary', token=self.session['token'])
        self.assertEqual(status, 403)
        self.assertEqual(payload['error'], 'Forbidden')
        self.assertEqual(payload['code'], 'forbidden')

    def test_rep_cannot_access_analytics(self):
        status, payload = self.request('GET', '/api/analytics?workspace=ws-default', token=self.rep_session['token'])
        self.assertEqual(status, 403)
        self.assertEqual(payload['error'], 'Forbidden')

    def test_cannot_create_task_for_foreign_workspace_lead(self):
        status, payload = self.request(
            'POST',
            '/api/tasks',
            {'title': 'Task inválida', 'workspaceId': 'ws-default', 'leadId': 'lead-3'},
            token=self.session['token'],
        )
        self.assertEqual(status, 400)
        self.assertEqual(payload['error'], 'Lead belongs to another workspace')


if __name__ == '__main__':
    unittest.main()
