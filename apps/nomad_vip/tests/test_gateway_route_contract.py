from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "deploy" / "gateway.default.conf"


class GatewayRouteContractTest(unittest.TestCase):
	def test_staff_and_entry_routes_remain_dedicated(self):
		source = CONFIG.read_text(encoding="utf-8")
		self.assertIn("location ^~ /staff/", source)
		self.assertIn("proxy_pass http://nomad-entertainer-web/;", source)
		self.assertIn("location ^~ /vip-entry/", source)
		self.assertIn("proxy_pass http://vip-entry-web/;", source)

	def test_root_and_desk_routes_are_owned_by_frappe(self):
		source = CONFIG.read_text(encoding="utf-8")
		self.assertIn("location / {\n    proxy_pass http://nomad-frontend-1:8080;", source)
		self.assertNotIn("try_files $uri $uri/ /index.html", source)
		self.assertNotIn("root /usr/share/nginx/html", source)

	def test_frappe_realtime_socket_uses_public_origin(self):
		source = CONFIG.read_text(encoding="utf-8")
		self.assertIn("location /socket.io", source)
		self.assertIn("proxy_pass http://nomad-websocket-1:9000;", source)
		self.assertIn("proxy_set_header Host nomad-frontend-1:8080;", source)
		self.assertIn("proxy_set_header Origin http://nomad-frontend-1:8080;", source)
		self.assertIn('add_header Access-Control-Allow-Origin "https://srv1871758.hstgr.cloud" always;', source)
		self.assertIn("proxy_set_header X-Frappe-Site-Name nomad.local;", source)


if __name__ == "__main__":
	unittest.main()
