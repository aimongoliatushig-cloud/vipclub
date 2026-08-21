from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "deploy" / "gateway.default.conf"


class GatewayRouteContractTest(unittest.TestCase):
	def _location(self, source, path):
		start = source.index(f"location ^~ {path}")
		body_start = source.index("{", start) + 1
		depth = 1
		for index in range(body_start, len(source)):
			if source[index] == "{":
				depth += 1
			elif source[index] == "}":
				depth -= 1
				if depth == 0:
					return source[body_start:index]
		raise AssertionError(f"Location block not closed: {path}")

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

	def test_employee_surfaces_are_frameable_only_in_marked_qa_mode(self):
		source = CONFIG.read_text(encoding="utf-8")
		for path in ("/staff/", "/manager/", "/vip-entry/"):
			with self.subTest(path=path):
				location = self._location(source, path)
				self.assertNotRegex(location, r'add_header\s+X-Frame-Options\s+"DENY"')
				self.assertIn('X-Nomad-QA-Frame-Mode "enabled"', location)
				self.assertIn('X-Content-Type-Options "nosniff"', location)
		self.assertIn("restore X-Frame-Options", source)

	def test_qa_frame_mode_does_not_bypass_protected_api_routes(self):
		source = CONFIG.read_text(encoding="utf-8")
		self.assertIn("location ^~ /staff-api/", source)
		self.assertIn("location ^~ /vip-entry-api/", source)
		self.assertIn("proxy_pass http://nomad-frontend-1:8080;", source)


if __name__ == "__main__":
	unittest.main()
