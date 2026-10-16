# Dados de teste — Cordeiro AutoCar

## Conta administradora
O usuário administrador é criado automaticamente no primeiro início do backend.
Configure `ADMIN_EMAIL` e um `ADMIN_PIN` privado de 4 dígitos no arquivo local
`backend/.env`. Não publique credenciais nem exponha a API fora da rede da oficina.

No início do backend, o hash do PIN configurado é aplicado à conta administradora
existente ou criada.

## Dados de teste criados via curl (podem existir no banco)
- Cliente: João Teste (CPF 123.456.789-00)
- Veículo: ABC-1D23 (VW Gol 2015)
- OS #1: Troca de óleo (R$ 150 MO + 4× R$ 45 peças = R$ 330), pagamento parcial de R$ 100 via Pix.
