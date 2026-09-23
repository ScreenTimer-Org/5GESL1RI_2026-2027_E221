"""Tests du serveur : python3 -m unittest discover -s tests -v"""

import io
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path
from wsgiref.util import setup_testing_defaults

TMP = tempfile.TemporaryDirectory()
os.environ["SCREENTIMER_DB"] = str(Path(TMP.name) / "test.sqlite3")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server  # noqa: E402

PAD = "https://quotidien.framapad.org/p/faq-dev1-abc123"


def call(method, path, body=None):
    environ = {}
    setup_testing_defaults(environ)
    raw = json.dumps(body).encode() if body is not None else b""
    environ.update({"REQUEST_METHOD": method, "PATH_INFO": path,
                    "CONTENT_LENGTH": str(len(raw)), "wsgi.input": io.BytesIO(raw)})
    captured = {}

    def start_response(status, headers):
        captured["status"] = int(status.split()[0])
        captured["type"] = dict(headers)["Content-Type"]

    data = b"".join(server.app(environ, start_response))
    return captured["status"], json.loads(data) if captured["type"].startswith("application/json") else data


class FakePad:
    """Faux framapad : renvoie `text` ou lève `error`, compte les appels, horloge manuelle."""

    def __init__(self, text="Calculatrice ?\nNon."):
        self.text, self.error, self.calls, self.now = text, None, 0, 1000.0

    def fetch(self, url):
        self.calls += 1
        self.last_url = url
        if self.error:
            raise self.error
        return self.text

    def cache(self):
        return server.PadCache(fetch=self.fetch, clock=lambda: self.now)


class PadCacheTest(unittest.TestCase):
    def test_export_url_and_allowed_hosts(self):
        self.assertEqual(server.pad_export_url(PAD + "?lang=fr"), PAD + "/export/txt")
        self.assertEqual(server.pad_export_url("https://framapad.org/p/x/export/txt"), "https://framapad.org/p/x/export/txt")
        for bad in ("https://evil.example/p/x", "https://framapad.org.evil.example/p/x",
                    "file:///etc/passwd", "https://framapad.org/admin", "http://169.254.169.254/p/x"):
            with self.assertRaises(ValueError, msg=bad):
                server.pad_export_url(bad)

    def test_many_screens_one_request(self):
        fake = FakePad()
        cache = fake.cache()
        for _ in range(50):  # 50 écrans lisent en même temps
            self.assertEqual(cache.get(PAD)["text"], "Calculatrice ?\nNon.")
        self.assertEqual((fake.calls, fake.last_url), (1, PAD + "/export/txt"))
        fake.now += server.PAD_REFRESH_S
        cache.get(PAD)
        self.assertEqual(fake.calls, 2)

    def test_host_budget_is_respected(self):
        fake = FakePad()
        cache = fake.cache()
        for i in range(20):  # 20 épreuves sur le même hébergeur
            cache.get(f"{PAD}-{i}")
        self.assertEqual(fake.calls, server.PAD_BUDGET[0])
        self.assertEqual(cache.get(f"{PAD}-19")["error"], "lecture du pad en attente")

    def test_keeps_last_version_and_backs_off_when_host_is_overloaded(self):
        fake = FakePad()
        cache = fake.cache()
        cache.get(PAD)
        fake.error = server.PadError("surchargé", backoff=True)
        fake.now += server.PAD_REFRESH_S
        self.assertEqual(cache.get(PAD), {"text": "Calculatrice ?\nNon.", "fetchedAt": 1000.0, "error": "surchargé"})
        fake.now += server.PAD_REFRESH_S  # encore en pause : pas de nouvel appel
        cache.get(PAD)
        self.assertEqual(fake.calls, 2)
        fake.error = None
        fake.now += server.PAD_BACKOFF_S
        self.assertEqual(cache.get(PAD)["error"], "")
        self.assertEqual(fake.calls, 3)

    def test_unexpected_error_does_not_block_the_pad(self):
        fake = FakePad()
        fake.error = RuntimeError("boum")
        cache = fake.cache()
        self.assertEqual(cache.get(PAD)["error"], "lecture du pad impossible")
        fake.error = None
        fake.now += server.PAD_BACKOFF_S
        self.assertEqual(cache.get(PAD)["text"], "Calculatrice ?\nNon.")


class FaqApiTest(unittest.TestCase):
    def setUp(self):
        self.fake = FakePad("Brouillon ?\nFeuilles jaunes.")
        server.PADS = self.fake.cache()

    def test_register_pad_then_screens_read_it(self):
        status, created = call("POST", "/api/faqs", {"padUrl": PAD})
        self.assertEqual(status, 201)
        status, data = call("GET", f"/api/faqs/{created['id']}")
        self.assertEqual((status, data["text"], data["error"]), (200, "Brouillon ?\nFeuilles jaunes.", ""))
        self.assertNotIn(PAD, json.dumps(data))  # les écrans ne voient jamais le lien du pad

    def test_validation(self):
        self.assertEqual(call("POST", "/api/faqs", {"padUrl": "https://evil.example/p/x"})[0], 400)
        self.assertEqual(call("POST", "/api/faqs", {})[0], 400)
        self.assertEqual(call("POST", "/api/faqs", ["x"])[0], 400)
        self.assertEqual(call("GET", "/api/faqs/inconnu")[0], 404)
        self.assertEqual(call("DELETE", "/api/faqs/x")[0], 404)

    def test_unused_faqs_are_purged(self):
        _, created = call("POST", "/api/faqs", {"padUrl": PAD})
        db = server.connect()
        with db:
            db.execute("UPDATE faqs SET used_at = ?", (time.time() - server.RETENTION_S - 1,))
        db.close()
        call("POST", "/api/faqs", {"padUrl": PAD})  # la purge a lieu à chaque création
        self.assertEqual(call("GET", f"/api/faqs/{created['id']}")[0], 404)


class StaticFilesTest(unittest.TestCase):
    def test_serves_page_and_assets(self):
        status, data = call("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b"Screen Timer", data)
        self.assertEqual(call("GET", "/js/main.js")[0], 200)

    def test_does_not_leak_private_files(self):
        for path in ("/server.py", "/data/test.sqlite3", "/../server.py", "/js/../server.py",
                     "/.claude/launch.json", "/legacy/timer.html", "/README.md"):
            self.assertEqual(call("GET", path)[0], 404, path)


if __name__ == "__main__":
    unittest.main()
