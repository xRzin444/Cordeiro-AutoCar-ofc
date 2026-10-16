# Cordeiro AutoCar — PRD

## Visão
Sistema de gestão para a oficina mecânica Cordeiro AutoCar. Mobile-first (Expo
React Native) com versão web/PWA pelo mesmo bundle. Interface em pt-BR,
moeda R$, data DD/MM/AAAA, timezone America/Sao_Paulo.

## Stack
- **Backend:** FastAPI + Motor (MongoDB) com JWT (bcrypt + PyJWT).
- **Frontend:** Expo SDK 57 (React Native 0.86) + expo-router + React Query.
- **Banco:** MongoDB (coleções: users, customers, vehicles, mechanics, work_orders, warranties, cash_transactions, counters). Índices para placa_norm, cpf_cnpj_norm, numero da OS, email de usuário.

## Autenticação
- Login por PIN administrativo de 4 dígitos → `POST /api/auth/login` devolve JWT (HS256, 8h), com bloqueio temporário após tentativas incorretas.
- Admin seed idempotente ao subir backend (ver test_credentials.md).
- Token guardado em SecureStore (nativo) e AsyncStorage (web).

## Módulos entregues (FASE 1 + 2 + 3)
1. **Dashboard** — faturamento bruto, entradas, saídas, resultado, contadores (OS, clientes, veículos, garantias próximas).
2. **Clientes** — CRUD + validação de CPF/CNPJ único + histórico de veículos e OS.
3. **Veículos** — CRUD + alerta de placa duplicada (confirmação explícita) + histórico próprio.
4. **Mecânicos** — CRUD + relatório de mão de obra + comissão calculada.
5. **Ordens de Serviço** — número sequencial, múltiplos serviços e peças, múltiplos mecânicos por serviço, cálculo central no backend, descontos/acréscimos, 9 status, pagamentos parciais (geram entradas no caixa), histórico de alterações.
6. **Garantias** — criadas automaticamente ao concluir OS, status (vigente/próxima ≤15d/vencida), filtros.
7. **Caixa** — entradas automáticas de pagamento + lançamentos manuais; saídas exigem motivo; categorias padrão BR.

## Regras financeiras aplicadas
- Totais calculados no backend (fonte única da verdade): mão_obra + peças − desconto + acréscimo.
- OS concluída NÃO vira paga automaticamente; status de pagamento é derivado de total_pago vs total.
- Cada pagamento gera uma entrada em cash_transactions com rastreabilidade (os_id, pagamento_id).
- Saídas financeiras exigem motivo ou observação.

## O que fica fora do MVP (fases 4-5)
- Exportação CSV/XLSX/PDF, relatórios por mecânico avançados, pesquisa global unificada, PWA manifesto, configurações de oficina, auditoria completa, impressão/compartilhamento. Base de dados e regras já suportam essas camadas.

## Variáveis de ambiente
Backend `.env`: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES`,
`ADMIN_EMAIL`, `ADMIN_PIN`.
Frontend `.env`: `EXPO_PUBLIC_BACKEND_URL`.
