"""Testes de API Cordeiro AutoCar - fluxo completo."""
import os, uuid, time
from pathlib import Path

import pytest, requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

BASE = os.environ.get("TEST_API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE}/api"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    raise RuntimeError("Defina ADMIN_EMAIL e ADMIN_PASSWORD em backend/.env antes de executar os testes.")
ADMIN = {"email": ADMIN_EMAIL, "senha": ADMIN_PASSWORD}

state = {}

@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data.get("user", {}).get("email") == ADMIN["email"]
    return data["access_token"]

@pytest.fixture(scope="module")
def h(token):
    return {"Authorization": f"Bearer {token}"}

# --- AUTH ---
def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email":"admin@cordeiro.com.br","senha":"wrong"}, timeout=20)
    assert r.status_code == 401

def test_me_no_token():
    r = requests.get(f"{API}/auth/me", timeout=20)
    assert r.status_code == 401

def test_me_ok(h):
    r = requests.get(f"{API}/auth/me", headers=h, timeout=20)
    assert r.status_code == 200 and r.json()["email"] == ADMIN["email"]

# --- CUSTOMERS ---
def test_create_customer(h):
    cpf = f"999{int(time.time())%10000000:07d}"
    payload = {"nome": f"TEST_Cliente_{uuid.uuid4().hex[:6]}", "cpf_cnpj": cpf, "telefone": "11999990000"}
    r = requests.post(f"{API}/customers", json=payload, headers=h, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["nome"] == payload["nome"] and data["cpf_cnpj_norm"] == cpf
    state["cid"] = data["id"]; state["cpf"] = cpf; state["nome"] = payload["nome"]
    # duplicate
    r2 = requests.post(f"{API}/customers", json=payload, headers=h, timeout=20)
    assert r2.status_code == 409

def test_list_customers_search(h):
    r = requests.get(f"{API}/customers", params={"q": state["nome"][:10]}, headers=h, timeout=20)
    assert r.status_code == 200 and any(c["id"] == state["cid"] for c in r.json())

def test_get_customer_with_vehicles_os(h):
    r = requests.get(f"{API}/customers/{state['cid']}", headers=h, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert "veiculos" in d and "ordens" in d

# --- VEHICLES ---
def test_create_vehicle_normalizes_plate(h):
    placa = f"TST-{uuid.uuid4().hex[:1].upper()}{int(time.time())%100:02d}3"
    payload = {"cliente_id": state["cid"], "placa": placa, "marca": "VW", "modelo": "Gol"}
    r = requests.post(f"{API}/vehicles", json=payload, headers=h, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    expected = placa.replace("-","").upper()
    assert d["placa_norm"] == expected
    state["vid"] = d["id"]; state["placa"] = placa; state["placa_norm"] = expected

def test_duplicate_vehicle_409(h):
    payload = {"cliente_id": state["cid"], "placa": state["placa"], "marca":"VW","modelo":"Gol"}
    r = requests.post(f"{API}/vehicles", json=payload, headers=h, timeout=20)
    assert r.status_code == 409

def test_duplicate_vehicle_force(h):
    payload = {"cliente_id": state["cid"], "placa": state["placa"], "marca":"VW","modelo":"Gol"}
    r = requests.post(f"{API}/vehicles?force=true", json=payload, headers=h, timeout=20)
    assert r.status_code == 200

def test_search_vehicle_no_hyphen(h):
    r = requests.get(f"{API}/vehicles", params={"q": state["placa_norm"]}, headers=h, timeout=20)
    assert r.status_code == 200 and any(v["id"] == state["vid"] for v in r.json())

# --- MECHANICS ---
def test_create_list_mechanic(h):
    r = requests.post(f"{API}/mechanics", json={"nome": f"TEST_Mec_{uuid.uuid4().hex[:6]}"}, headers=h, timeout=20)
    assert r.status_code == 200
    state["mid"] = r.json()["id"]
    r2 = requests.get(f"{API}/mechanics", headers=h, timeout=20)
    assert r2.status_code == 200 and any(m["id"] == state["mid"] for m in r2.json())

# --- WORK ORDERS ---
def test_create_os_totals(h):
    payload = {
        "cliente_id": state["cid"], "veiculo_id": state["vid"],
        "servicos": [{"descricao":"Troca óleo","valor_mao_obra":150,"mecanico_id":state["mid"],"garantia_dias":30}],
        "pecas": [{"descricao":"Óleo 5W30","quantidade":4,"preco_unitario":45,"garantia_dias":90}],
    }
    r = requests.post(f"{API}/work-orders", json=payload, headers=h, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["total_mao_obra"] == 150 and d["total_pecas"] == 180 and d["total"] == 330
    assert d["saldo"] == 330 and d["status_pagamento"] == "pendente"
    state["oid"] = d["id"]

def test_partial_payment(h):
    r = requests.post(f"{API}/work-orders/{state['oid']}/payments", json={"valor":100,"forma":"pix"}, headers=h, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["status_pagamento"] == "parcial" and d["saldo"] == 230 and d["total_pago"] == 100
    # Verifica cash_transaction automática
    cash = requests.get(f"{API}/cash", params={"tipo":"entrada"}, headers=h, timeout=20).json()
    assert any(c.get("ordem_servico_id") == state["oid"] and c.get("categoria") == "recebimento_os" for c in cash)

def test_full_payment(h):
    r = requests.post(f"{API}/work-orders/{state['oid']}/payments", json={"valor":230,"forma":"dinheiro"}, headers=h, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d["status_pagamento"] == "pago" and d["saldo"] == 0

def test_conclude_os_generates_warranties(h):
    # get current OS to send full body
    cur = requests.get(f"{API}/work-orders/{state['oid']}", headers=h, timeout=20).json()
    body = {k: cur.get(k) for k in ["cliente_id","veiculo_id","km_entrada","relato_cliente","diagnostico","servicos_solicitados","observacoes_internas","observacoes_cliente","servicos","pecas","desconto","acrescimo","data_inicio","data_conclusao"]}
    body["status"] = "concluida"
    r = requests.put(f"{API}/work-orders/{state['oid']}", json=body, headers=h, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "concluida"
    # warranties
    w = requests.get(f"{API}/warranties", headers=h, timeout=20).json()
    assert any(x["os_id"] == state["oid"] and x["tipo"] == "servico" for x in w)
    assert any(x["os_id"] == state["oid"] and x["tipo"] == "peca" for x in w)

def test_warranties_filter_vigente(h):
    r = requests.get(f"{API}/warranties", params={"status":"vigente"}, headers=h, timeout=20)
    assert r.status_code == 200
    assert all(x["situacao"] == "vigente" for x in r.json())

# --- CASH ---
def test_cash_saida_sem_motivo_400(h):
    r = requests.post(f"{API}/cash", json={"tipo":"saida","descricao":"teste","categoria":"outros","valor":50}, headers=h, timeout=20)
    assert r.status_code == 400

def test_cash_saida_com_motivo_ok(h):
    r = requests.post(f"{API}/cash", json={"tipo":"saida","descricao":"TEST_saida","categoria":"outros","valor":10,"motivo":"teste"}, headers=h, timeout=20)
    assert r.status_code == 200

# --- DASHBOARD ---
def test_dashboard(h):
    r = requests.get(f"{API}/dashboard", headers=h, timeout=20)
    assert r.status_code == 200
    d = r.json()
    for k in ["faturamento_bruto","total_entradas","total_saidas","resultado","os_abertas","total_clientes","total_veiculos"]:
        assert k in d
    assert isinstance(d["total_clientes"], int) and d["total_clientes"] > 0
