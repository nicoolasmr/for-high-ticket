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


if __name__ == '__main__':
    unittest.main()
