# Cordeiro AutoCar

Sistema de gestão de oficina mecânica (pt-BR, R$, DD/MM/AAAA, timezone
America/Sao_Paulo). Mobile-first com Expo (React Native + Web) e API
FastAPI + MongoDB.

## Estrutura

```
/app
  /backend     FastAPI + Motor (MongoDB) — API em /api
  /frontend    Expo SDK 57 (React Native + Web) com expo-router
```

Nenhuma dependência exclusiva do Emergent. Pode ser executado em qualquer
provedor que suporte Python 3.11+ e Node 18+.

---

## 1. Backend — instalar e rodar

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # edite os valores
uvicorn server:app --host 0.0.0.0 --port 8000
```

Variáveis obrigatórias no `.env`:
- `MONGO_URL` — connection string do MongoDB (local ou Atlas).
- `DB_NAME` — nome do banco (ex.: `cordeiro_autocar`).
- `JWT_SECRET` — gere com `python -c "import secrets;print(secrets.token_urlsafe(64))"`.
- `ADMIN_EMAIL` — identidade da conta administradora criada automaticamente.
- `ADMIN_PIN` — PIN privado de 4 dígitos para entrar como administrador. O backend armazena o hash, limita cinco tentativas incorretas por endereço em 15 minutos e bloqueia novas tentativas até a janela expirar. Restrinja a API à rede da oficina; um PIN curto não deve proteger uma API pública.
- `CORS_ORIGINS` — lista separada por vírgula (`https://app1.com,https://app2.com`). Em produção **nunca use `*`**.
- `JWT_EXPIRE_MINUTES` — opcional (padrão 480 = 8h).

API escuta em `http://localhost:8000/api`. Docs interativas em `/docs`.

### Testes

Os testes de API usam `http://127.0.0.1:8000` por padrão e leem `ADMIN_EMAIL` e
`ADMIN_PIN` do `backend/.env`. Inicie o backend antes de executá-los. Para
apontar para outra instância, configure `TEST_API_BASE_URL` localmente.

```bash
cd backend
pytest tests/ -v
```

Os testes cobrem login, deduplicação de CPF e placa, totais da OS, pagamentos,
garantias, caixa e dashboard.

---

## 2. Frontend — instalar e rodar

```bash
cd frontend
yarn install                     # package manager fixado em yarn 1.22
cp .env.example .env             # defina EXPO_PUBLIC_BACKEND_URL para sua API
yarn start                       # dev server (QR code + web)
yarn web                         # só web
```

Para gerar build estático de web:

```bash
yarn expo export -p web          # saída em dist/
```

Publicar `dist/` em Vercel, Netlify, Cloudflare Pages, S3+CloudFront etc. **Troque `EXPO_PUBLIC_BACKEND_URL` para a URL pública da sua API antes do `expo export`**.

Para iOS/Android nativo, use o botão **Publish** do Emergent ou configure EAS Build no seu próprio Expo account.

---

## 3. Banco de dados

**Local (dev):** instale o MongoDB Community e aponte `MONGO_URL=mongodb://localhost:27017`.

**Produção recomendada:** [MongoDB Atlas](https://www.mongodb.com/atlas) — plano M0 grátis suficiente para 1 usuário.
1. Crie cluster M0.
2. Em *Database Access* crie usuário/senha.
3. Em *Network Access* libere o IP do seu backend (nunca `0.0.0.0/0` em prod).
4. Copie a connection string para `MONGO_URL`.
5. Índices e admin seed são criados automaticamente no startup.

### Backup e restauração

```bash
# Backup
mongodump --uri="$MONGO_URL" --db=cordeiro_autocar --out=./backup/$(date +%F)

# Restauração
mongorestore --uri="$MONGO_URL" --db=cordeiro_autocar ./backup/<DATA>/cordeiro_autocar
```

No Atlas, backups automáticos diários estão disponíveis mesmo no plano gratuito.

---

## 4. Deploy sugerido

| Camada | Provedor | Observação |
|---|---|---|
| Frontend web | Vercel / Netlify / Cloudflare Pages | Grátis |
| Backend | Render / Fly.io / Railway | Grátis ou ~US$ 5-10/mês |
| MongoDB | Atlas M0 | Grátis (512 MB) |

Lembre-se:
- Fixe o CORS no backend com o domínio exato do frontend.
- Use HTTPS em produção (o provedor cuida).
- Mantenha `ADMIN_PIN` somente na configuração local do backend; não publique a API com PIN de 4 dígitos.

---

## 5. Credenciais iniciais

Veja `/app/memory/test_credentials.md`. Trocar antes de operar em produção.

---

## 6. Pontos que exigem configuração manual

- Gerar `JWT_SECRET` novo e configurar `ADMIN_PIN` somente no `.env` privado do backend.
- Preencher `CORS_ORIGINS` com o domínio real do frontend.
- Provisionar MongoDB Atlas e atualizar `MONGO_URL`.
- Criar `manifest.json` + ícones para PWA instalável no iPhone (não incluso).
- Configurar backup agendado (cron ou Atlas Scheduled Backup).
- Domínio próprio opcional (~R$ 40/ano).

## 7. Não há dependências Emergent-exclusivas

O código só depende de FastAPI, Motor/PyMongo, PyJWT, bcrypt, Expo SDK 57 e bibliotecas públicas. Variáveis `EXPO_PACKAGER_*` existem apenas para o preview Emergent — podem ser removidas no deploy externo.
