"""Cordeiro AutoCar - Backend FastAPI + MongoDB.

Autenticação JWT (admin seed idempotente), módulos de Clientes, Veículos,
Mecânicos, Ordens de Serviço (com serviços, peças, pagamentos), Garantias
e Fluxo de Caixa. Todos os valores monetários são tratados com arredondamento
para 2 casas decimais no backend.
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator

# ---------------------------------------------------------------------------
# Configuração
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))
ADMIN_EMAIL = os.environ["ADMIN_EMAIL"].strip().lower()
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
JWT_ALG = "HS256"
JWT_ISSUER = "cordeiro-autocar"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("cordeiro")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def money(value: float | int | str) -> float:
    return round(float(value), 2)


def normalize_plate(plate: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", (plate or "").upper())


def normalize_doc(doc: str) -> str:
    return re.sub(r"\D", "", doc or "")


def hash_password(password: str) -> str:
    raw = password.encode("utf-8")
    if len(raw) > 72:
        raise ValueError("Senha excede o limite do bcrypt (72 bytes)")
    return bcrypt.hashpw(raw, bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def make_token(user: Dict[str, Any]) -> str:
    now = now_utc()
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user.get("role", "admin"),
        "iss": JWT_ISSUER,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def add_months(dt: datetime, months: int) -> datetime:
    """Soma meses respeitando limites de mês e anos bissextos."""
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    # Último dia válido do mês destino
    import calendar

    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def warranty_status(end: datetime, now: Optional[datetime] = None, closed: Optional[Dict[str, Any]] = None) -> str:
    if closed:
        return "encerrada"
    now = now or now_utc()
    if end < now:
        return "vencida"
    if end - now <= timedelta(days=15):
        return "proxima"
    return "vigente"


def _clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# Modelos Pydantic
# ---------------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=4, max_length=72)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ---- Clientes ----
class CustomerIn(BaseModel):
    nome: str = Field(min_length=1, max_length=200)
    cpf_cnpj: Optional[str] = None
    telefone: str
    telefone_secundario: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    cep: Optional[str] = None
    rua: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True


# ---- Veículos ----
class VehicleIn(BaseModel):
    cliente_id: str
    placa: str
    marca: str
    modelo: str
    versao: Optional[str] = None
    ano_fabricacao: Optional[int] = None
    ano_modelo: Optional[int] = None
    cor: Optional[str] = None
    combustivel: Optional[str] = None
    km_atual: Optional[int] = 0
    chassi: Optional[str] = None
    renavam: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: bool = True


# ---- Mecânicos ----
class MechanicIn(BaseModel):
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    especialidade: Optional[str] = None
    data_contratacao: Optional[str] = None
    modelo_remuneracao: Literal["comissao", "fixo", "misto", "none"] = "none"
    percentual_comissao: Optional[float] = 0
    valor_fixo: Optional[float] = 0
    observacoes: Optional[str] = None
    ativo: bool = True


# ---- OS ----
class ServiceItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descricao: str
    mecanico_id: Optional[str] = None
    mecanico_nome: Optional[str] = None
    valor_mao_obra: float = 0
    data_execucao: Optional[str] = None
    garantia_dias: Optional[int] = 0
    observacoes: Optional[str] = None

    @field_validator("valor_mao_obra")
    @classmethod
    def _round(cls, v): return money(v)


class PartItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    descricao: str
    codigo: Optional[str] = None
    quantidade: float = 1
    custo_unitario: Optional[float] = 0
    preco_unitario: float = 0
    garantia_dias: Optional[int] = 0
    fornecedor: Optional[str] = None

    @property
    def subtotal(self) -> float:
        return money(self.quantidade * self.preco_unitario)


class PaymentItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    valor: float
    data: str
    forma: Literal["dinheiro", "pix", "debito", "credito", "transferencia", "outros"]
    referencia: Optional[str] = None
    observacoes: Optional[str] = None


OS_STATUS = Literal[
    "orcamento", "aguardando_aprovacao", "aguardando_pecas", "aguardando_inicio",
    "em_execucao", "aguardando_retirada", "concluida", "entregue", "cancelada",
]


class WorkOrderIn(BaseModel):
    cliente_id: str
    veiculo_id: str
    km_entrada: Optional[int] = 0
    relato_cliente: Optional[str] = None
    diagnostico: Optional[str] = None
    servicos_solicitados: Optional[str] = None
    observacoes_internas: Optional[str] = None
    observacoes_cliente: Optional[str] = None
    status: OS_STATUS = "orcamento"
    data_inicio: Optional[str] = None
    data_conclusao: Optional[str] = None
    servicos: List[ServiceItem] = []
    pecas: List[PartItem] = []
    desconto: float = 0
    acrescimo: float = 0


class PaymentIn(BaseModel):
    valor: float
    data: Optional[str] = None
    forma: Literal["dinheiro", "pix", "debito", "credito", "transferencia", "outros"]
    referencia: Optional[str] = None
    observacoes: Optional[str] = None


# ---- Caixa (lançamentos manuais) ----
class CashIn(BaseModel):
    tipo: Literal["entrada", "saida"]
    data: Optional[str] = None
    descricao: str
    categoria: str
    valor: float
    forma_pagamento: Optional[str] = None
    cliente_id: Optional[str] = None
    ordem_servico_id: Optional[str] = None
    fornecedor: Optional[str] = None
    documento: Optional[str] = None
    motivo: Optional[str] = None
    observacoes: Optional[str] = None

    @field_validator("motivo")
    @classmethod
    def _require_motivo_on_saida(cls, v, info):
        return v


# ---------------------------------------------------------------------------
# Cálculo de totais da OS (fonte de verdade financeira)
# ---------------------------------------------------------------------------
def compute_totals(os_doc: Dict[str, Any]) -> Dict[str, Any]:
    servicos = os_doc.get("servicos", []) or []
    pecas = os_doc.get("pecas", []) or []
    pagamentos = os_doc.get("pagamentos", []) or []

    total_mao_obra = money(sum(money(s.get("valor_mao_obra", 0)) for s in servicos))
    total_pecas = money(sum(money(p.get("quantidade", 0)) * money(p.get("preco_unitario", 0)) for p in pecas))
    desconto = money(os_doc.get("desconto", 0) or 0)
    acrescimo = money(os_doc.get("acrescimo", 0) or 0)
    total = money(total_mao_obra + total_pecas - desconto + acrescimo)
    total_pago = money(sum(money(p.get("valor", 0)) for p in pagamentos))
    saldo = money(total - total_pago)

    if total_pago <= 0:
        status_pag = "pendente"
    elif saldo <= 0.009:
        status_pag = "pago"
    else:
        status_pag = "parcial"

    return {
        "total_mao_obra": total_mao_obra,
        "total_pecas": total_pecas,
        "total_desconto": desconto,
        "total_acrescimo": acrescimo,
        "total": total,
        "total_pago": total_pago,
        "saldo": saldo,
        "status_pagamento": status_pag,
    }


# ---------------------------------------------------------------------------
# Lifespan / seed / índices
# ---------------------------------------------------------------------------
async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.customers.create_index("nome")
    await db.customers.create_index("telefone")
    await db.customers.create_index("cpf_cnpj_norm")
    await db.vehicles.create_index("placa_norm")
    await db.vehicles.create_index("cliente_id")
    await db.mechanics.create_index("nome")
    await db.work_orders.create_index("numero", unique=True)
    await db.work_orders.create_index("cliente_id")
    await db.work_orders.create_index("veiculo_id")
    await db.work_orders.create_index("placa_norm")
    await db.work_orders.create_index("status")
    await db.warranties.create_index("os_id")
    await db.warranties.create_index("veiculo_id")
    await db.cash_transactions.create_index("data")
    await db.counters.create_index("name", unique=True)


async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing:
        return
    doc = {
        "id": str(uuid.uuid4()),
        "email": ADMIN_EMAIL,
        "password_hash": hash_password(ADMIN_PASSWORD),
        "nome": "Administrador",
        "role": "admin",
        "ativo": True,
        "criado_em": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    logger.info("Admin seed criado: %s", ADMIN_EMAIL)


async def next_os_number() -> int:
    doc = await db.counters.find_one_and_update(
        {"name": "os"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    # motor returns the updated doc only when return_document=ReturnDocument.AFTER
    if not doc or "seq" not in doc:
        doc = await db.counters.find_one({"name": "os"})
    return int(doc["seq"]) if doc else 1


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    await seed_admin()
    yield
    client.close()


app = FastAPI(title="Cordeiro AutoCar API", lifespan=lifespan)
# CORS: lista separada por vírgula em CORS_ORIGINS. Em dev use "*" apenas se
# CORS_ORIGINS não estiver definido.
_cors = os.environ.get("CORS_ORIGINS", "*").strip()
_origins = [o.strip() for o in _cors.split(",") if o.strip()] if _cors != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=False,
)


# ---------------------------------------------------------------------------
# Auth deps
# ---------------------------------------------------------------------------
async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    unauthorized = HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    if not creds or creds.scheme.lower() != "bearer":
        raise unauthorized
    try:
        payload = jwt.decode(
            creds.credentials, JWT_SECRET, algorithms=[JWT_ALG], issuer=JWT_ISSUER,
            options={"require": ["sub", "exp", "iss"]},
        )
    except jwt.PyJWTError:
        raise unauthorized
    user = await db.users.find_one({"id": payload["sub"], "ativo": True}, {"_id": 0, "password_hash": 0})
    if not user:
        raise unauthorized
    return user


# ---------------------------------------------------------------------------
# Rotas
# ---------------------------------------------------------------------------
from fastapi import APIRouter

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"app": "Cordeiro AutoCar", "status": "ok"}


# ---------- AUTH ----------
@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email, "ativo": True})
    if not user or not verify_password(body.senha, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    payload = {"id": user["id"], "email": user["email"], "role": user.get("role", "admin")}
    return {
        "access_token": make_token(payload),
        "token_type": "bearer",
        "user": {"id": user["id"], "email": user["email"], "nome": user.get("nome"), "role": user.get("role")},
    }


@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ---------- CLIENTES ----------
@api.get("/customers")
async def list_customers(q: Optional[str] = None, ativo: Optional[bool] = None, user=Depends(current_user)):
    filt: Dict[str, Any] = {}
    if ativo is not None:
        filt["ativo"] = ativo
    if q:
        qn = normalize_doc(q)
        filt["$or"] = [
            {"nome": {"$regex": q, "$options": "i"}},
            {"telefone": {"$regex": q, "$options": "i"}},
            {"cpf_cnpj_norm": {"$regex": qn}} if qn else {"nome": {"$regex": q, "$options": "i"}},
        ]
    items = await db.customers.find(filt, {"_id": 0}).sort("nome", 1).to_list(500)
    return items


@api.post("/customers")
async def create_customer(body: CustomerIn, user=Depends(current_user)):
    cpf_norm = normalize_doc(body.cpf_cnpj) if body.cpf_cnpj else ""
    if cpf_norm:
        dup = await db.customers.find_one({"cpf_cnpj_norm": cpf_norm})
        if dup:
            raise HTTPException(status_code=409, detail="Já existe um cliente com este CPF/CNPJ")
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["cpf_cnpj_norm"] = cpf_norm
    doc["criado_em"] = now_utc().isoformat()
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/customers/{cid}")
async def get_customer(cid: str, user=Depends(current_user)):
    c = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    c["veiculos"] = await db.vehicles.find({"cliente_id": cid}, {"_id": 0}).to_list(200)
    c["ordens"] = await db.work_orders.find({"cliente_id": cid}, {"_id": 0}).sort("numero", -1).to_list(200)
    return c


@api.put("/customers/{cid}")
async def update_customer(cid: str, body: CustomerIn, user=Depends(current_user)):
    cpf_norm = normalize_doc(body.cpf_cnpj) if body.cpf_cnpj else ""
    if cpf_norm:
        dup = await db.customers.find_one({"cpf_cnpj_norm": cpf_norm, "id": {"$ne": cid}})
        if dup:
            raise HTTPException(409, "Já existe outro cliente com este CPF/CNPJ")
    update = body.model_dump()
    update["cpf_cnpj_norm"] = cpf_norm
    update["atualizado_em"] = now_utc().isoformat()
    r = await db.customers.update_one({"id": cid}, {"$set": update})
    if not r.matched_count:
        raise HTTPException(404, "Cliente não encontrado")
    return await db.customers.find_one({"id": cid}, {"_id": 0})


# ---------- VEÍCULOS ----------
@api.get("/vehicles")
async def list_vehicles(q: Optional[str] = None, cliente_id: Optional[str] = None, user=Depends(current_user)):
    filt: Dict[str, Any] = {}
    if cliente_id:
        filt["cliente_id"] = cliente_id
    if q:
        placa = normalize_plate(q)
        filt["$or"] = [
            {"placa_norm": {"$regex": placa}} if placa else {"modelo": {"$regex": q, "$options": "i"}},
            {"modelo": {"$regex": q, "$options": "i"}},
            {"marca": {"$regex": q, "$options": "i"}},
        ]
    items = await db.vehicles.find(filt, {"_id": 0}).sort("placa", 1).to_list(500)
    # join cliente nome
    ids = {v["cliente_id"] for v in items}
    clients = {c["id"]: c["nome"] async for c in db.customers.find({"id": {"$in": list(ids)}}, {"_id": 0, "id": 1, "nome": 1})}
    for v in items:
        v["cliente_nome"] = clients.get(v["cliente_id"], "—")
    return items


@api.post("/vehicles")
async def create_vehicle(body: VehicleIn, force: bool = False, user=Depends(current_user)):
    placa_norm = normalize_plate(body.placa)
    if not placa_norm:
        raise HTTPException(400, "Placa inválida")
    if not force:
        dup = await db.vehicles.find_one({"placa_norm": placa_norm})
        if dup:
            raise HTTPException(409, f"Já existe veículo com placa {body.placa}. Confirme para cadastrar mesmo assim.")
    cli = await db.customers.find_one({"id": body.cliente_id})
    if not cli:
        raise HTTPException(400, "Cliente informado não existe")
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["placa_norm"] = placa_norm
    doc["placa"] = body.placa.upper()
    doc["criado_em"] = now_utc().isoformat()
    await db.vehicles.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/vehicles/{vid}")
async def get_vehicle(vid: str, user=Depends(current_user)):
    v = await db.vehicles.find_one({"id": vid}, {"_id": 0})
    if not v:
        raise HTTPException(404, "Veículo não encontrado")
    v["cliente"] = await db.customers.find_one({"id": v["cliente_id"]}, {"_id": 0})
    v["ordens"] = await db.work_orders.find({"veiculo_id": vid}, {"_id": 0}).sort("numero", -1).to_list(200)
    return v


@api.put("/vehicles/{vid}")
async def update_vehicle(vid: str, body: VehicleIn, user=Depends(current_user)):
    update = body.model_dump()
    update["placa_norm"] = normalize_plate(body.placa)
    update["placa"] = body.placa.upper()
    update["atualizado_em"] = now_utc().isoformat()
    r = await db.vehicles.update_one({"id": vid}, {"$set": update})
    if not r.matched_count:
        raise HTTPException(404, "Veículo não encontrado")
    return await db.vehicles.find_one({"id": vid}, {"_id": 0})


# ---------- MECÂNICOS ----------
@api.get("/mechanics")
async def list_mechanics(user=Depends(current_user)):
    return await db.mechanics.find({}, {"_id": 0}).sort("nome", 1).to_list(500)


@api.post("/mechanics")
async def create_mechanic(body: MechanicIn, user=Depends(current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["criado_em"] = now_utc().isoformat()
    await db.mechanics.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/mechanics/{mid}")
async def get_mechanic(mid: str, mes: Optional[str] = None, user=Depends(current_user)):
    m = await db.mechanics.find_one({"id": mid}, {"_id": 0})
    if not m:
        raise HTTPException(404, "Mecânico não encontrado")
    # Faturamento mão-de-obra por mecânico (serviços atribuídos)
    ordens = await db.work_orders.find({"servicos.mecanico_id": mid}, {"_id": 0}).to_list(1000)
    servicos = []
    total_mo = 0.0
    for o in ordens:
        if mes and not o.get("abertura", "").startswith(mes):
            continue
        for s in o.get("servicos", []):
            if s.get("mecanico_id") == mid:
                servicos.append({"os_numero": o.get("numero"), "os_id": o.get("id"), **s})
                total_mo += money(s.get("valor_mao_obra", 0))
    m["servicos"] = servicos
    m["total_mao_obra"] = money(total_mo)
    m["qtd_servicos"] = len(servicos)
    if m.get("modelo_remuneracao") in ("comissao", "misto") and m.get("percentual_comissao"):
        m["comissao_calculada"] = money(total_mo * float(m["percentual_comissao"]) / 100)
    return m


@api.put("/mechanics/{mid}")
async def update_mechanic(mid: str, body: MechanicIn, user=Depends(current_user)):
    update = body.model_dump()
    update["atualizado_em"] = now_utc().isoformat()
    r = await db.mechanics.update_one({"id": mid}, {"$set": update})
    if not r.matched_count:
        raise HTTPException(404, "Mecânico não encontrado")
    return await db.mechanics.find_one({"id": mid}, {"_id": 0})


# ---------- ORDENS DE SERVIÇO ----------
async def _enrich_os(o: Dict[str, Any]) -> Dict[str, Any]:
    o.pop("_id", None)
    totals = compute_totals(o)
    o.update(totals)
    cli = await db.customers.find_one({"id": o.get("cliente_id")}, {"_id": 0, "nome": 1, "telefone": 1})
    veic = await db.vehicles.find_one({"id": o.get("veiculo_id")}, {"_id": 0, "placa": 1, "marca": 1, "modelo": 1})
    o["cliente_nome"] = cli.get("nome") if cli else "—"
    o["cliente_telefone"] = cli.get("telefone") if cli else None
    o["veiculo_label"] = f"{veic.get('marca','')} {veic.get('modelo','')}".strip() if veic else ""
    o["placa"] = veic.get("placa") if veic else o.get("placa")
    return o


@api.get("/work-orders")
async def list_os(q: Optional[str] = None, status: Optional[str] = None, user=Depends(current_user)):
    filt: Dict[str, Any] = {}
    if status:
        filt["status"] = status
    if q:
        try:
            filt["$or"] = [{"numero": int(q)}, {"placa_norm": {"$regex": normalize_plate(q)}}]
        except ValueError:
            filt["placa_norm"] = {"$regex": normalize_plate(q)}
    items = await db.work_orders.find(filt, {"_id": 0}).sort("numero", -1).to_list(500)
    return [await _enrich_os(o) for o in items]


@api.post("/work-orders")
async def create_os(body: WorkOrderIn, user=Depends(current_user)):
    cli = await db.customers.find_one({"id": body.cliente_id})
    if not cli:
        raise HTTPException(400, "Cliente inválido")
    veic = await db.vehicles.find_one({"id": body.veiculo_id})
    if not veic:
        raise HTTPException(400, "Veículo inválido")
    numero = await next_os_number()
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["numero"] = numero
    doc["placa_norm"] = veic["placa_norm"]
    doc["placa"] = veic["placa"]
    doc["abertura"] = now_utc().isoformat()
    doc["pagamentos"] = []
    doc["historico"] = [{"em": doc["abertura"], "por": user["email"], "evento": "criada", "status": doc["status"]}]
    # Preencher nome dos mecânicos para snapshot
    mec_ids = [s.get("mecanico_id") for s in doc.get("servicos", []) if s.get("mecanico_id")]
    mecs = {m["id"]: m["nome"] async for m in db.mechanics.find({"id": {"$in": mec_ids}}, {"_id": 0, "id": 1, "nome": 1})}
    for s in doc["servicos"]:
        if s.get("mecanico_id") in mecs:
            s["mecanico_nome"] = mecs[s["mecanico_id"]]
    doc.update(compute_totals(doc))
    await db.work_orders.insert_one(doc)
    return await _enrich_os(await db.work_orders.find_one({"id": doc["id"]}))


@api.get("/work-orders/{oid}")
async def get_os(oid: str, user=Depends(current_user)):
    o = await db.work_orders.find_one({"id": oid})
    if not o:
        raise HTTPException(404, "OS não encontrada")
    return await _enrich_os(o)


@api.put("/work-orders/{oid}")
async def update_os(oid: str, body: WorkOrderIn, user=Depends(current_user)):
    cur = await db.work_orders.find_one({"id": oid})
    if not cur:
        raise HTTPException(404, "OS não encontrada")
    update = body.model_dump()
    update["atualizada_em"] = now_utc().isoformat()
    # mantém numero, abertura, pagamentos, historico
    update["numero"] = cur["numero"]
    update["abertura"] = cur["abertura"]
    update["pagamentos"] = cur.get("pagamentos", [])
    hist = cur.get("historico", [])
    hist.append({"em": update["atualizada_em"], "por": user["email"], "evento": "editada", "status": update.get("status")})
    update["historico"] = hist
    # snapshot nomes mecânicos
    mec_ids = [s.get("mecanico_id") for s in update.get("servicos", []) if s.get("mecanico_id")]
    mecs = {m["id"]: m["nome"] async for m in db.mechanics.find({"id": {"$in": mec_ids}}, {"_id": 0, "id": 1, "nome": 1})}
    for s in update["servicos"]:
        if s.get("mecanico_id") in mecs:
            s["mecanico_nome"] = mecs[s["mecanico_id"]]
    update.update(compute_totals(update))
    # Se mudou para concluida ou entregue, gerar garantias
    if update.get("status") in ("concluida", "entregue") and cur.get("status") not in ("concluida", "entregue"):
        update["data_conclusao"] = update.get("data_conclusao") or now_utc().isoformat()
        await _create_warranties_for_os(oid, {**cur, **update})
    await db.work_orders.update_one({"id": oid}, {"$set": update})
    return await _enrich_os(await db.work_orders.find_one({"id": oid}))


async def _create_warranties_for_os(oid: str, os_doc: Dict[str, Any]):
    base_date = now_utc()
    for s in os_doc.get("servicos", []):
        dias = int(s.get("garantia_dias") or 0)
        if dias <= 0:
            continue
        existing = await db.warranties.find_one({"os_id": oid, "item_id": s["id"], "tipo": "servico"})
        if existing:
            continue
        start = base_date
        end = start + timedelta(days=dias)
        await db.warranties.insert_one({
            "id": str(uuid.uuid4()),
            "os_id": oid,
            "os_numero": os_doc.get("numero"),
            "cliente_id": os_doc["cliente_id"],
            "veiculo_id": os_doc["veiculo_id"],
            "placa": os_doc.get("placa"),
            "tipo": "servico",
            "item_id": s["id"],
            "descricao": s.get("descricao"),
            "mecanico_nome": s.get("mecanico_nome"),
            "data_inicio": start.isoformat(),
            "data_fim": end.isoformat(),
            "prazo_dias": dias,
            "encerrada": None,
            "criada_em": base_date.isoformat(),
        })
    for p in os_doc.get("pecas", []):
        dias = int(p.get("garantia_dias") or 0)
        if dias <= 0:
            continue
        existing = await db.warranties.find_one({"os_id": oid, "item_id": p["id"], "tipo": "peca"})
        if existing:
            continue
        start = base_date
        end = start + timedelta(days=dias)
        await db.warranties.insert_one({
            "id": str(uuid.uuid4()),
            "os_id": oid,
            "os_numero": os_doc.get("numero"),
            "cliente_id": os_doc["cliente_id"],
            "veiculo_id": os_doc["veiculo_id"],
            "placa": os_doc.get("placa"),
            "tipo": "peca",
            "item_id": p["id"],
            "descricao": p.get("descricao"),
            "data_inicio": start.isoformat(),
            "data_fim": end.isoformat(),
            "prazo_dias": dias,
            "encerrada": None,
            "criada_em": base_date.isoformat(),
        })


# ---------- PAGAMENTOS ----------
@api.post("/work-orders/{oid}/payments")
async def add_payment(oid: str, body: PaymentIn, user=Depends(current_user)):
    os_doc = await db.work_orders.find_one({"id": oid})
    if not os_doc:
        raise HTTPException(404, "OS não encontrada")
    pay = body.model_dump()
    pay["id"] = str(uuid.uuid4())
    pay["data"] = pay.get("data") or now_utc().isoformat()
    pay["valor"] = money(pay["valor"])
    if pay["valor"] <= 0:
        raise HTTPException(400, "Valor do pagamento deve ser maior que zero")
    pagamentos = os_doc.get("pagamentos", []) + [pay]
    os_doc["pagamentos"] = pagamentos
    totals = compute_totals(os_doc)
    hist = os_doc.get("historico", []) + [{
        "em": now_utc().isoformat(), "por": user["email"],
        "evento": f"pagamento R$ {pay['valor']:.2f} ({pay['forma']})",
    }]
    await db.work_orders.update_one({"id": oid}, {"$set": {"pagamentos": pagamentos, "historico": hist, **totals}})
    # Registra entrada no caixa
    await db.cash_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "tipo": "entrada",
        "data": pay["data"],
        "descricao": f"Pagamento OS #{os_doc.get('numero')}",
        "categoria": "recebimento_os",
        "valor": pay["valor"],
        "forma_pagamento": pay["forma"],
        "cliente_id": os_doc["cliente_id"],
        "ordem_servico_id": oid,
        "os_numero": os_doc.get("numero"),
        "pagamento_id": pay["id"],
        "criada_em": now_utc().isoformat(),
    })
    return await _enrich_os(await db.work_orders.find_one({"id": oid}))


# ---------- GARANTIAS ----------
@api.get("/warranties")
async def list_warranties(status_filter: Optional[str] = Query(None, alias="status"), q: Optional[str] = None, user=Depends(current_user)):
    filt: Dict[str, Any] = {}
    if q:
        filt["$or"] = [
            {"placa": {"$regex": q.upper()}},
            {"descricao": {"$regex": q, "$options": "i"}},
        ]
    items = await db.warranties.find(filt, {"_id": 0}).sort("data_fim", 1).to_list(500)
    now = now_utc()
    out = []
    for w in items:
        end = datetime.fromisoformat(w["data_fim"])
        st = warranty_status(end, now, w.get("encerrada"))
        w["situacao"] = st
        if status_filter and st != status_filter:
            continue
        out.append(w)
    return out


# ---------- CAIXA ----------
@api.get("/cash")
async def list_cash(start: Optional[str] = None, end: Optional[str] = None, tipo: Optional[str] = None, user=Depends(current_user)):
    filt: Dict[str, Any] = {}
    if tipo:
        filt["tipo"] = tipo
    if start or end:
        rng: Dict[str, Any] = {}
        if start: rng["$gte"] = start
        if end: rng["$lte"] = end + "T23:59:59"
        filt["data"] = rng
    items = await db.cash_transactions.find(filt, {"_id": 0}).sort("data", -1).to_list(1000)
    return items


@api.post("/cash")
async def create_cash(body: CashIn, user=Depends(current_user)):
    data = body.model_dump()
    if data["tipo"] == "saida" and not (data.get("motivo") or data.get("observacoes")):
        raise HTTPException(400, "Para saídas, o motivo ou observação é obrigatório")
    data["id"] = str(uuid.uuid4())
    data["data"] = data.get("data") or now_utc().isoformat()
    data["valor"] = money(data["valor"])
    data["criada_em"] = now_utc().isoformat()
    data["criada_por"] = user["email"]
    await db.cash_transactions.insert_one(data)
    data.pop("_id", None)
    return data


# ---------- DASHBOARD ----------
@api.get("/dashboard")
async def dashboard(start: Optional[str] = None, end: Optional[str] = None, user=Depends(current_user)):
    now = now_utc()
    if not start:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    if not end:
        end = now.isoformat()
    # Caixa
    entradas = await db.cash_transactions.find({"tipo": "entrada", "data": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(10000)
    saidas = await db.cash_transactions.find({"tipo": "saida", "data": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(10000)
    total_entradas = money(sum(money(e.get("valor", 0)) for e in entradas))
    total_saidas = money(sum(money(s.get("valor", 0)) for s in saidas))
    resultado = money(total_entradas - total_saidas)
    # Faturamento bruto = soma dos totais das OS criadas no período
    ordens_periodo = await db.work_orders.find({"abertura": {"$gte": start, "$lte": end}}, {"_id": 0}).to_list(10000)
    faturamento_bruto = money(sum(money(o.get("total", 0)) for o in ordens_periodo))
    # Contadores
    abertas_statuses = ["orcamento", "aguardando_aprovacao", "aguardando_pecas", "aguardando_inicio", "em_execucao", "aguardando_retirada"]
    os_abertas = await db.work_orders.count_documents({"status": {"$in": abertas_statuses}})
    os_execucao = await db.work_orders.count_documents({"status": "em_execucao"})
    os_concluidas = await db.work_orders.count_documents({"status": {"$in": ["concluida", "entregue"]}, "abertura": {"$gte": start, "$lte": end}})
    total_clientes = await db.customers.count_documents({})
    total_veiculos = await db.vehicles.count_documents({})
    # Garantias próximas (vence em até 15 dias)
    now_dt = now_utc()
    cutoff = (now_dt + timedelta(days=15)).isoformat()
    gar_proximas = await db.warranties.count_documents({"data_fim": {"$gte": now_dt.isoformat(), "$lte": cutoff}, "encerrada": None})
    return {
        "periodo": {"start": start, "end": end},
        "faturamento_bruto": faturamento_bruto,
        "total_entradas": total_entradas,
        "total_saidas": total_saidas,
        "resultado": resultado,
        "os_abertas": os_abertas,
        "os_execucao": os_execucao,
        "os_concluidas": os_concluidas,
        "garantias_proximas": gar_proximas,
        "total_clientes": total_clientes,
        "total_veiculos": total_veiculos,
    }


app.include_router(api)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
