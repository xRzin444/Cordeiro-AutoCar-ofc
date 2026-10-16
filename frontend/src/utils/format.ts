export const BRL = (v: number | string | null | undefined) => {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const dateBR = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

export const dateTimeBR = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${dateBR(iso)} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

export const OS_STATUS_LABEL: Record<string, string> = {
  orcamento: "Orçamento",
  aguardando_aprovacao: "Aguardando aprovação",
  aguardando_pecas: "Aguardando peças",
  aguardando_inicio: "Aguardando início",
  em_execucao: "Em execução",
  aguardando_retirada: "Aguardando retirada",
  concluida: "Concluída",
  entregue: "Entregue",
  cancelada: "Cancelada",
};
export const OS_STATUS_LIST = Object.keys(OS_STATUS_LABEL);

export const PAY_METHODS: { value: string; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Cartão de débito" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "transferencia", label: "Transferência" },
  { value: "outros", label: "Outros" },
];

export const CATEGORIAS_SAIDA = [
  "Compra de peças", "Ferramentas e equipamentos", "Aluguel", "Energia elétrica",
  "Água", "Internet e telefone", "Salários e pagamentos", "Comissões", "Impostos",
  "Manutenção da oficina", "Despesas administrativas", "Outras despesas",
];
export const CATEGORIAS_ENTRADA = [
  "Recebimento de mão de obra", "Venda de peças", "Recebimento de sinal",
  "Recebimento de saldo", "Outros recebimentos",
];
