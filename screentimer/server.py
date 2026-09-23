#!/usr/bin/env python3
"""Screen Timer : petit serveur, bibliothèque standard Python uniquement.

Deux rôles :
1. servir la page (index.html, css/, js/, assets/) ;
2. lire le pad Etherpad de la FAQ à la place des écrans, avec un cache.
   Quel que soit le nombre d'écrans, l'hébergeur du pad ne reçoit qu'une lecture toutes les
   10 s (framapad bloque au-delà d'une dizaine de lectures par minute et demie).

Le lien du pad n'est jamais mis dans le lien des surveillants : on l'enregistre ici sous un
identifiant aléatoire, et les écrans ne connaissent que cet identifiant.

    POST /api/faqs          {"padUrl": "https://…/p/nom"}  -> {"id": "…"}
    GET  /api/faqs/<id>                                    -> {"text", "fetchedAt", "error"}

En local :       python3 server.py                                -> http://localhost:8000
En production :  gunicorn --workers 1 --threads 8 server:app      (un seul processus : cache partagé)

Variables d'environnement : PORT (8000), SCREENTIMER_DB (data/screentimer.sqlite3),
SCREENTIMER_PAD_HOSTS (framapad.org), SCREENTIMER_RETENTION_HOURS (72).
"""

import json
import mimetypes
import os
import re
import secrets
import socket
import sqlite3
import threading
import time
import urllib.error
import urllib.request
from collections import deque
from http import HTTPStatus
from pathlib import Path
from socketserver import ThreadingMixIn
from urllib.parse import urlsplit
from wsgiref.simple_server import WSGIServer, make_server

ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = {"index.html"}
PUBLIC_DIRS = {"css", "js", "assets", "tests"}

DB_PATH = os.environ.get("SCREENTIMER_DB", str(ROOT / "data" / "screentimer.sqlite3"))
PAD_HOSTS = [h.strip().lower() for h in os.environ.get("SCREENTIMER_PAD_HOSTS", "framapad.org").split(",") if h.strip()]
RETENTION_S = float(os.environ.get("SCREENTIMER_RETENTION_HOURS", "72")) * 3600

PAD_REFRESH_S = 10  # un pad est relu au plus toutes les 10 s
PAD_BUDGET = (8, 90)  # au plus 8 lectures par 90 s vers un même hébergeur
PAD_BACKOFF_S = 60  # pause après une surcharge de l'hébergeur
PAD_TIMEOUT_S = 8
PAD_MAX_BYTES = 256 * 1024
MAX_BODY = 4096


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


# --------------------------------------------------------------------------- pads


def pad_export_url(url):
    """https://hôte/p/nom[…] -> https://hôte/p/nom/export/txt, si l'hébergeur est autorisé."""
    parts = urlsplit(str(url).strip())
    host = (parts.hostname or "").lower()
    match = re.match(r"^/p/([^/]+)", parts.path)
    if parts.scheme not in ("http", "https") or not match:
        raise ValueError("Lien de pad invalide (attendu : https://…/p/nom-du-pad)")
    if not any(host == h or host.endswith("." + h) for h in PAD_HOSTS):
        raise ValueError(f"Hébergeur de pad non autorisé : {host} (autorisés : {', '.join(PAD_HOSTS)})")
    port = f":{parts.port}" if parts.port else ""
    return f"{parts.scheme}://{host}{port}/p/{match[1]}/export/txt"


class PadError(Exception):
    def __init__(self, message, backoff=False):
        super().__init__(message)
        self.backoff = backoff


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # une redirection pourrait viser un hôte interne


_opener = urllib.request.build_opener(_NoRedirect)


def fetch_pad_text(export_url):
    request = urllib.request.Request(export_url, headers={"User-Agent": "ScreenTimer-ESI/1.0"})
    try:
        with _opener.open(request, timeout=PAD_TIMEOUT_S) as res:
            return res.read(PAD_MAX_BYTES).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as err:
        if err.code == 404:
            raise PadError("pad introuvable : ouvrez le lien du pad une fois pour le créer")
        if err.code == 429 or err.code >= 500:
            raise PadError(f"l'hébergeur du pad est surchargé (erreur {err.code})", backoff=True)
        raise PadError(f"le pad a répondu par une erreur {err.code}")
    except (urllib.error.URLError, socket.timeout, TimeoutError):
        raise PadError("l'hébergeur du pad ne répond pas", backoff=True)


class PadCache:
    """Lit chaque pad au plus toutes les PAD_REFRESH_S secondes, dans un budget par hébergeur.
    En cas de problème, la dernière version lue reste servie, avec un message d'erreur."""

    def __init__(self, fetch=fetch_pad_text, clock=time.time):
        self.fetch = fetch
        self.clock = clock
        self.lock = threading.Lock()
        self.entries = {}  # export_url -> {"text", "fetchedAt", "checkedAt", "error"}
        self.fetching = set()
        self.calls = {}  # hôte -> instants des dernières lectures
        self.paused_until = {}  # hôte -> fin de pause

    def _may_fetch(self, export, host, now):
        """À appeler sous verrou : réserve une lecture si c'est utile et permis."""
        entry = self.entries.get(export)
        calls = self.calls.setdefault(host, deque())
        while calls and now - calls[0] > PAD_BUDGET[1]:
            calls.popleft()
        allowed = ((entry is None or now - entry["checkedAt"] >= PAD_REFRESH_S)
                   and export not in self.fetching
                   and now >= self.paused_until.get(host, 0)
                   and len(calls) < PAD_BUDGET[0])
        if allowed:
            self.fetching.add(export)
            calls.append(now)
        return allowed

    def get(self, pad_url):
        export = pad_export_url(pad_url)
        host = urlsplit(export).hostname
        now = self.clock()
        with self.lock:
            allowed = self._may_fetch(export, host, now)
            previous = self.entries.get(export) or {"text": None, "fetchedAt": None}
        if allowed:
            try:
                entry = {"text": self.fetch(export), "fetchedAt": now, "checkedAt": now, "error": ""}
            except Exception as err:  # noqa: BLE001 : quoi qu'il arrive, on garde la dernière version
                if not isinstance(err, PadError):
                    err = PadError("lecture du pad impossible", backoff=True)
                entry = {**previous, "checkedAt": now, "error": str(err)}
                if err.backoff:
                    with self.lock:
                        self.paused_until[host] = now + PAD_BACKOFF_S
            with self.lock:
                self.entries[export] = entry
                self.fetching.discard(export)
        with self.lock:
            entry = self.entries.get(export)
        if entry is None:
            return {"text": None, "fetchedAt": None, "error": "lecture du pad en attente"}
        return {"text": entry["text"], "fetchedAt": entry["fetchedAt"], "error": entry["error"]}


PADS = PadCache()


# --------------------------------------------------------------------------- stockage id -> pad


def connect():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=10)
    db.execute("CREATE TABLE IF NOT EXISTS faqs (id TEXT PRIMARY KEY, pad_url TEXT NOT NULL, used_at REAL NOT NULL)")
    return db


def create_faq(body):
    pad_url = body.get("padUrl")
    if not isinstance(pad_url, str) or len(pad_url) > 300:
        raise ApiError(400, "Lien de pad manquant ou trop long")
    try:
        pad_export_url(pad_url)
    except ValueError as err:
        raise ApiError(400, str(err))
    faq_id = secrets.token_urlsafe(9)
    now = time.time()
    db = connect()
    with db:
        db.execute("DELETE FROM faqs WHERE used_at < ?", (now - RETENTION_S,))
        db.execute("INSERT INTO faqs VALUES (?, ?, ?)", (faq_id, pad_url.strip(), now))
    db.close()
    return 201, {"id": faq_id}


def read_faq(faq_id):
    now = time.time()
    db = connect()
    with db:
        row = db.execute("SELECT pad_url FROM faqs WHERE id = ?", (faq_id,)).fetchone()
        # Une FAQ lue par les écrans reste en vie (écriture au plus toutes les 10 min).
        db.execute("UPDATE faqs SET used_at = ? WHERE id = ? AND used_at < ?", (now, faq_id, now - 600))
    db.close()
    if row is None:
        raise ApiError(404, "FAQ inconnue (lien erroné ou supprimée après inactivité)")
    try:
        return 200, PADS.get(row[0])  # lecture du pad hors de la base
    except ValueError as err:  # hébergeur retiré de SCREENTIMER_PAD_HOSTS depuis
        return 200, {"text": None, "fetchedAt": None, "error": str(err)}


# --------------------------------------------------------------------------- HTTP


def read_json(environ):
    try:
        length = min(int(environ.get("CONTENT_LENGTH") or 0), MAX_BODY)
        body = json.loads(environ["wsgi.input"].read(length) or b"{}")
    except ValueError:
        raise ApiError(400, "JSON invalide")
    if not isinstance(body, dict):
        raise ApiError(400, "Le corps doit être un objet JSON")
    return body


def handle_api(method, path, environ):
    if path == "/api/faqs" and method == "POST":
        return create_faq(read_json(environ))
    match = re.match(r"^/api/faqs/([\w-]+)$", path)
    if match and method == "GET":
        return read_faq(match[1])
    raise ApiError(404, "Route inconnue")


def static_file(path):
    """Fichier public correspondant à l'URL, ou None (pas de listing, pas de ../)."""
    parts = [p for p in path.split("/") if p] or ["index.html"]
    if any(p.startswith(".") for p in parts):
        return None
    if not ((len(parts) == 1 and parts[0] in PUBLIC_FILES) or (len(parts) > 1 and parts[0] in PUBLIC_DIRS)):
        return None
    file = ROOT.joinpath(*parts).resolve()
    return file if ROOT in file.parents and file.is_file() else None


def respond(start_response, status, body, content_type, extra=()):
    start_response(f"{status} {HTTPStatus(status).phrase}", [
        ("Content-Type", content_type), ("Content-Length", str(len(body))), *extra])
    return [body]


def app(environ, start_response):
    method = environ["REQUEST_METHOD"]
    path = environ.get("PATH_INFO") or "/"

    if path.startswith("/api/"):
        try:
            status, payload = handle_api(method, path, environ)
        except ApiError as err:
            status, payload = err.status, {"error": str(err)}
        body = json.dumps(payload, ensure_ascii=False).encode()
        return respond(start_response, status, body, "application/json; charset=utf-8", [("Cache-Control", "no-store")])

    file = static_file(path) if method in ("GET", "HEAD") else None
    if file is None:
        return respond(start_response, 404, "Introuvable".encode(), "text/plain; charset=utf-8")
    ctype = mimetypes.guess_type(file.name)[0] or "application/octet-stream"
    if ctype.startswith("text/") or ctype == "application/javascript":
        ctype += "; charset=utf-8"
    body = file.read_bytes()
    result = respond(start_response, 200, body, ctype, [("Cache-Control", "no-cache")])
    return [b""] if method == "HEAD" else result


class ThreadingWSGIServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    with make_server("", port, app, server_class=ThreadingWSGIServer) as httpd:
        print(f"Screen Timer : http://localhost:{port}")
        httpd.serve_forever()
