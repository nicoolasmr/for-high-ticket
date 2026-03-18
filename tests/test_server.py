from pathlib import Path
import tempfile
import unittest

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

    def test_seeded_leads_exist(self):
        leads = server.fetch_leads(self.conn)
        self.assertGreaterEqual(len(leads), 4)
        self.assertEqual(leads[0]['id'], 'lead-1')

    def test_filters_work(self):
        leads = server.fetch_leads(self.conn, owner='Carla', temperature='hot')
        ids = {lead['id'] for lead in leads}
        self.assertEqual(ids, {'lead-1', 'lead-3'})

    def test_summary_exists(self):
        summary = server.fetch_summary(self.conn, 'lead-1')
        self.assertIsNotNone(summary)
        self.assertIn('objections', summary)
        self.assertEqual(summary['name'], 'Ana Ribeiro')

    def test_dashboard_payload(self):
        dashboard = server.fetch_dashboard(self.conn)
        self.assertEqual(len(dashboard['kpis']), 4)
        self.assertEqual(len(dashboard['priorities']), 3)

    def test_create_lead(self):
        lead = server.create_lead(
            self.conn,
            {
                'name': 'Novo Lead',
                'company': 'Empresa X',
                'owner': 'Bia',
                'source': 'Manual',
                'temperature': 'hot',
                'value': 9900,
            },
        )
        self.assertEqual(lead['name'], 'Novo Lead')
        self.assertEqual(lead['stageId'], 'entry')

    def test_update_lead_stage(self):
        lead = server.update_lead_stage(self.conn, 'lead-2', 'proposal')
        self.assertIsNotNone(lead)
        self.assertEqual(lead['stageId'], 'proposal')

    def test_create_and_complete_task(self):
        task = server.create_task(self.conn, {'title': 'Enviar proposta', 'priority': 'high', 'leadId': 'lead-1'})
        self.assertEqual(task['title'], 'Enviar proposta')
        completed = server.complete_task(self.conn, task['id'])
        self.assertEqual(completed, {'id': task['id'], 'completed': True})

    def test_create_and_fetch_note(self):
        note = server.create_note(self.conn, 'lead-1', {'author': 'Carla', 'body': 'Lead pediu validação de ROI.'})
        self.assertEqual(note['author'], 'Carla')
        notes = server.fetch_notes(self.conn, 'lead-1')
        self.assertTrue(any(item['body'] == 'Lead pediu validação de ROI.' for item in notes))


if __name__ == '__main__':
    unittest.main()
