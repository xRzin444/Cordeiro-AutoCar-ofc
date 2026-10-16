"""Testes do middleware CORS após migração para CORS_ORIGINS via env."""
import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE = os.environ.get("TEST_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE}/api"


def test_options_preflight_allows_arbitrary_origin_in_dev():
    """Com CORS_ORIGINS='*' (padrão dev) o preflight deve aceitar qualquer Origin."""
    origin = "https://example-random.test"
    r = requests.options(
        f"{API}/auth/login",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
        timeout=20,
    )
    assert r.status_code in (200, 204), f"status={r.status_code} body={r.text}"
    allow_origin = r.headers.get("access-control-allow-origin")
    assert allow_origin in ("*", origin), f"Allow-Origin inesperado: {allow_origin}"


def test_options_preflight_exposes_expected_methods_and_headers():
    r = requests.options(
        f"{API}/customers",
        headers={
            "Origin": "https://foo.bar",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
        timeout=20,
    )
    assert r.status_code in (200, 204), r.text
    methods = (r.headers.get("access-control-allow-methods") or "").upper()
    for m in ("GET", "POST", "PUT", "DELETE"):
        assert m in methods, f"Método {m} ausente em Allow-Methods: {methods}"
    headers_h = (r.headers.get("access-control-allow-headers") or "").lower()
    assert "authorization" in headers_h, f"Authorization ausente: {headers_h}"
    assert "content-type" in headers_h, f"Content-Type ausente: {headers_h}"


def test_simple_get_includes_allow_origin_header():
    """GET real com Origin deve devolver Access-Control-Allow-Origin."""
    r = requests.get(f"{API}/", headers={"Origin": "https://any-origin.test"}, timeout=20)
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") in ("*", "https://any-origin.test")
