"""Testes unitários para o login de PIN do administrador."""
import asyncio
import time
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

import server


def test_pin_login_requires_exactly_four_digits():
    assert server.PinLoginIn(pin="4826").pin == "4826"
    for pin in ("123", "12345", "12a4", ""):
        with pytest.raises(ValidationError):
            server.PinLoginIn(pin=pin)


def test_pin_login_blocks_after_five_invalid_attempts(monkeypatch):
    pin_hash = server.hash_password("4826")

    class Users:
        async def find_one(self, _query):
            return {"pin_hash": pin_hash}

    monkeypatch.setattr(server, "db", SimpleNamespace(users=Users()))
    server.pin_login_attempts.clear()
    request = SimpleNamespace(client=SimpleNamespace(host="192.0.2.10"))

    async def attempt_login(pin):
        return await server.login(server.PinLoginIn(pin=pin), request)

    async def run_test():
        for _ in range(server.PIN_MAX_ATTEMPTS):
            with pytest.raises(HTTPException) as error:
                await attempt_login("0000")
            assert error.value.status_code == 401

        with pytest.raises(HTTPException) as blocked:
            await attempt_login("4826")
        assert blocked.value.status_code == 429
        assert blocked.value.headers["Retry-After"]

    try:
        asyncio.run(run_test())
    finally:
        server.pin_login_attempts.clear()


def test_valid_pin_returns_token_and_clears_failed_attempts(monkeypatch):
    pin_hash = server.hash_password("4826")
    user = {
        "id": "admin-id",
        "email": server.ADMIN_EMAIL,
        "nome": "Administrador",
        "role": "admin",
        "pin_hash": pin_hash,
    }

    class Users:
        async def find_one(self, _query):
            return user

    monkeypatch.setattr(server, "db", SimpleNamespace(users=Users()))
    request = SimpleNamespace(client=SimpleNamespace(host="192.0.2.11"))
    server.pin_login_attempts[request.client.host] = (2, time.monotonic() + 900)

    try:
        response = asyncio.run(server.login(server.PinLoginIn(pin="4826"), request))
        assert response["access_token"]
        assert response["user"]["email"] == server.ADMIN_EMAIL
        assert request.client.host not in server.pin_login_attempts
    finally:
        server.pin_login_attempts.clear()


def test_seed_admin_replaces_legacy_password_hash_with_pin_hash(monkeypatch):
    existing = {"email": server.ADMIN_EMAIL, "password_hash": "legacy"}
    update = {}

    class Users:
        async def find_one(self, _query):
            return existing

        async def update_one(self, _query, changes):
            update.update(changes)

    monkeypatch.setattr(server, "db", SimpleNamespace(users=Users()))
    monkeypatch.setattr(server, "ADMIN_PIN", "4826")

    asyncio.run(server.seed_admin())

    assert server.verify_password("4826", update["$set"]["pin_hash"])
    assert update["$unset"] == {"password_hash": ""}
