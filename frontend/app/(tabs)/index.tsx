import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, logout } from "@/src/api/client";
import { BRL, dateBR, dateTimeBR, OS_STATUS_LABEL } from "@/src/utils/format";
import { colors, radius, spacing, statusColor } from "@/src/theme";

type DashboardData = {
  periodo: { start: string; end: string };
  faturamento_bruto: number;
  total_entradas: number;
  total_saidas: number;
  resultado: number;
  os_abertas: number;
  os_execucao: number;
  os_concluidas: number;
  garantias_proximas: number;
  total_clientes: number;
  total_veiculos: number;
};

type WorkOrder = {
  id: string;
  numero: number;
  status: string;
  cliente_nome: string;
  veiculo_label?: string;
  placa?: string;
  total: number;
  servicos?: { mecanico_nome?: string; descricao?: string; valor_mao_obra?: number }[];
};

type MechanicSummary = {
  name: string;
  totalLabor: number;
  serviceCount: number;
};

type CashTransaction = {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
};

type Warranty = {
  id: string;
  descricao: string;
  os_numero: number;
  placa: string;
  data_fim: string;
};

type SectionErrors = {
  orders?: string;
  cash?: string;
  warranties?: string;
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeading}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {!!action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{action.label} ↗</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [data, setData] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [cash, setCash] = useState<CashTransaction[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [sectionErrors, setSectionErrors] = useState<SectionErrors>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setSectionErrors({});
    const today = localDateString(new Date());
    const results = await Promise.allSettled([
      api.get<DashboardData>("/dashboard"),
      api.get<WorkOrder[]>("/work-orders"),
      api.get<CashTransaction[]>(`/cash?start=${today}&end=${today}`),
      api.get<Warranty[]>("/warranties?status=proxima"),
    ]);

    const dashboardResult = results[0];
    if (dashboardResult.status === "rejected") {
      throw dashboardResult.reason;
    }
    setData(dashboardResult.value);
    const errors: SectionErrors = {};
    if (results[1].status === "fulfilled") {
      setOrders(results[1].value);
    } else {
      setOrders([]);
      errors.orders = errorText(results[1].reason, "Não foi possível carregar as ordens.");
    }
    if (results[2].status === "fulfilled") {
      setCash(results[2].value);
    } else {
      setCash([]);
      errors.cash = errorText(results[2].reason, "Não foi possível carregar o caixa.");
    }
    if (results[3].status === "fulfilled") {
      setWarranties(results[3].value);
    } else {
      setWarranties([]);
      errors.warranties = errorText(results[3].reason, "Não foi possível carregar as garantias.");
    }
    setSectionErrors(errors);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .catch((error: unknown) => {
          if (!active) return;
          const message = errorText(error, "Não foi possível carregar o painel.");
          if (message.toLowerCase().includes("expirada")) {
            router.replace("/login");
            return;
          }
          setLoadError(message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load, router]),
  );

  const cashTotals = useMemo(
    () =>
      cash.reduce(
        (totals, item) => {
          totals[item.tipo] += Number(item.valor || 0);
          return totals;
        },
        { entrada: 0, saida: 0 },
      ),
    [cash],
  );

  const mechanicRanking = useMemo(() => {
    const totals = new Map<string, MechanicSummary>();
    for (const order of orders) {
      for (const service of order.servicos || []) {
        const name = service.mecanico_nome?.trim();
        if (!name) continue;
        const summary = totals.get(name) || { name, totalLabor: 0, serviceCount: 0 };
        summary.totalLabor += Number(service.valor_mao_obra || 0);
        summary.serviceCount += 1;
        totals.set(name, summary);
      }
    }
    return [...totals.values()]
      .sort((first, second) => second.totalLabor - first.totalLabor)
      .slice(0, 3);
  }, [orders]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (error) {
      const message = errorText(error, "Falha ao atualizar.");
      setLoadError(message);
      if (message.toLowerCase().includes("expirada")) router.replace("/login");
    } finally {
      setRefreshing(false);
    }
  }, [load, router]);

  async function sair() {
    await logout();
    router.replace("/login");
  }

  const recentOrders = orders.slice(0, 5);
  const recentCash = cash.slice(0, 4);
  const todayLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: wide ? spacing.xl : spacing.md,
          paddingTop: insets.top + (wide ? spacing.xl : spacing.md),
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.brandPrimary}
        />
      }
    >
      <View style={styles.page}>
        <View style={[styles.topBar, wide && styles.topBarWide]}>
          {!wide && (
            <View style={styles.wordmark}>
              <Image
                source={require("@/assets/images/cordeiro-logo.png")}
                contentFit="contain"
                style={styles.headerLogo}
                accessibilityLabel="Cordeiro AutoCar"
              />
              <View>
                <Text style={styles.brandName}>CORDEIRO</Text>
                <Text style={styles.brandSubtitle}>AUTO CENTER</Text>
              </View>
            </View>
          )}
          <View style={styles.topActions}>
            <View style={styles.openBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.openBadgeText}>OFICINA ATIVA</Text>
            </View>
            <Pressable
              testID="dashboard-new-os"
              onPress={() => router.push("/os/new")}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>＋ Nova O.S.</Text>
            </Pressable>
            <Pressable
              testID="dashboard-logout"
              onPress={sair}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
            >
              <Text style={styles.logoutButtonText}>Sair</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.pageHeading, wide && styles.pageHeadingWide]}>
          <View style={styles.pageHeadingCopy}>
            <Text style={styles.eyebrow}>COCKPIT OPERACIONAL · GESTÃO EM TEMPO REAL</Text>
            <Text style={styles.pageTitle}>Painel Operacional</Text>
            <Text style={styles.pageSubtitle}>
              {todayLabel} · Visão geral da oficina
              {!!data && ` · ${dateBR(data.periodo.start)} — ${dateBR(data.periodo.end)}`}
            </Text>
          </View>
          <View style={[styles.quickStats, !wide && styles.quickStatsNarrow]}>
            <View style={[styles.quickStat, !wide && styles.quickStatsNarrowItem]}>
              <Text style={styles.quickStatValue}>{data?.total_veiculos ?? "—"}</Text>
              <Text style={styles.quickStatLabel}>Veículos</Text>
            </View>
            <View style={[styles.quickStat, !wide && styles.quickStatsNarrowItem]}>
              <Text style={styles.quickStatValue}>{data?.os_concluidas ?? "—"}</Text>
              <Text style={styles.quickStatLabel}>Concluídas no mês</Text>
            </View>
            <View style={[styles.quickStat, !wide && styles.quickStatsNarrowItem]}>
              <Text style={[styles.quickStatValue, { color: colors.warning }]}>
                {data?.garantias_proximas ?? "—"}
              </Text>
              <Text style={styles.quickStatLabel}>Garantias próximas</Text>
            </View>
          </View>
        </View>

        {!!loadError && (
          <Panel style={styles.errorPanel}>
            <Text style={styles.errorTitle}>Não foi possível atualizar o painel</Text>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </Panel>
        )}

        <View style={styles.actionsGrid}>
          <Pressable
            testID="shortcut-new-os"
            onPress={() => router.push("/os/new")}
            style={({ pressed }) => [styles.featureAction, pressed && styles.pressed]}
          >
            <Text style={styles.featureActionIcon}>＋</Text>
            <Text style={styles.featureActionKicker}>AÇÃO RÁPIDA</Text>
            <Text style={styles.featureActionTitle}>Nova Ordem de Serviço</Text>
            <Text style={styles.featureActionHint}>Abrir atendimento</Text>
          </Pressable>
          <Pressable
            testID="shortcut-new-customer"
            onPress={() => router.push("/clientes/form")}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <Text style={styles.actionIcon}>♙</Text>
            <Text style={styles.actionTitle}>Novo cliente</Text>
            <Text style={styles.actionHint}>Cadastrar pessoa</Text>
          </Pressable>
          <Pressable
            testID="shortcut-new-entrada"
            onPress={() => router.push("/caixa/form?tipo=entrada")}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <Text style={styles.actionIcon}>↙</Text>
            <Text style={styles.actionTitle}>Lançar entrada</Text>
            <Text style={styles.actionHint}>Registrar recebimento</Text>
          </Pressable>
          <Pressable
            testID="shortcut-new-saida"
            onPress={() => router.push("/caixa/form?tipo=saida")}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <Text style={styles.actionIcon}>↗</Text>
            <Text style={styles.actionTitle}>Lançar saída</Text>
            <Text style={styles.actionHint}>Registrar despesa</Text>
          </Pressable>
          <Pressable
            testID="shortcut-new-vehicle"
            onPress={() => router.push("/veiculos/form")}
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
          >
            <Text style={styles.actionIcon}>⌕</Text>
            <Text style={styles.actionTitle}>Novo veículo</Text>
            <Text style={styles.actionHint}>Cadastrar veículo</Text>
          </Pressable>
        </View>

        <View style={[styles.metricsGrid, !wide && styles.metricsGridNarrow]}>
          <MetricCard
            label="Faturamento do mês"
            value={data ? BRL(data.faturamento_bruto) : "—"}
            detail={data ? `${data.os_concluidas} O.S. concluídas` : "Total das ordens no período"}
            icon="↗"
            accent={colors.brandPrimary}
            loading={loading && !data}
          />
          <MetricCard
            label="Ordens abertas"
            value={data ? String(data.os_abertas) : "—"}
            detail={data ? `${data.os_execucao} em execução` : "Em andamento na oficina"}
            icon="▤"
            accent={colors.info}
            loading={loading && !data}
          />
          <MetricCard
            label="Entradas hoje"
            value={sectionErrors.cash ? "Indisponível" : BRL(cashTotals.entrada)}
            detail={sectionErrors.cash || `${cash.filter((item) => item.tipo === "entrada").length} lançamentos`}
            icon="↓"
            accent={colors.success}
            loading={loading}
          />
          <MetricCard
            label="Saídas hoje"
            value={sectionErrors.cash ? "Indisponível" : BRL(cashTotals.saida)}
            detail={sectionErrors.cash || `${cash.filter((item) => item.tipo === "saida").length} lançamentos`}
            icon="↑"
            accent={colors.warning}
            loading={loading}
          />
        </View>

        <View style={[styles.dashboardColumns, wide && styles.dashboardColumnsWide]}>
          <Panel style={[styles.ordersPanel, wide && styles.primaryColumn]}>
            <SectionTitle
              eyebrow="ACOMPANHAMENTO OPERACIONAL"
              title="Ordens de serviço"
              action={{ label: "Ver todas", onPress: () => router.navigate("/(tabs)/os") }}
            />
            {loading && orders.length === 0 ? (
              <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
            ) : recentOrders.length ? (
              <View style={styles.ordersList}>
                {recentOrders.map((order) => {
                  const currentStatusColor = statusColor(order.status);
                  return (
                    <Pressable
                      key={order.id}
                      testID={`dashboard-order-${order.numero}`}
                      onPress={() => router.push(`/os/${order.id}`)}
                      style={({ pressed }) => [
                        styles.orderRow,
                        !wide && styles.orderRowNarrow,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <View style={styles.orderNumber}>
                        <Text style={styles.orderNumberText}>OS</Text>
                        <Text style={styles.orderNumberValue}>#{order.numero}</Text>
                      </View>
                      <View style={[styles.orderInfo, !wide && styles.orderInfoNarrow]}>
                        <Text style={styles.orderTitle} numberOfLines={1}>
                          {order.veiculo_label || order.placa || "Veículo"}
                        </Text>
                        <Text style={styles.orderSubtitle} numberOfLines={1}>
                          {order.cliente_nome}
                          {!!order.servicos?.[0]?.mecanico_nome &&
                            ` · ${order.servicos[0].mecanico_nome}`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          !wide && styles.statusBadgeNarrow,
                          {
                            backgroundColor: `${currentStatusColor}1A`,
                            borderColor: `${currentStatusColor}55`,
                          },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: currentStatusColor }]}>
                          {OS_STATUS_LABEL[order.status] || order.status.replaceAll("_", " ")}
                        </Text>
                      </View>
                      <Text style={[styles.orderTotal, !wide && styles.orderTotalNarrow]}>
                        {BRL(order.total)}
                      </Text>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyPanel
                title={sectionErrors.orders ? "Ordens indisponíveis" : "Nenhuma ordem de serviço"}
                hint={sectionErrors.orders || "As ordens abertas aparecerão aqui."}
              />
            )}
          </Panel>

          <View
            style={[
              styles.secondaryColumn,
              wide && styles.secondaryColumnWide,
              !wide && styles.secondaryColumnNarrow,
            ]}
          >
            <Panel>
              <SectionTitle
                eyebrow="MOVIMENTAÇÃO DE HOJE"
                title="Fluxo de caixa"
                action={{ label: "Abrir caixa", onPress: () => router.navigate("/(tabs)/caixa") }}
              />
              <View style={styles.cashSummary}>
                <View style={styles.cashSummaryItem}>
                  <Text style={styles.cashSummaryLabel}>Entradas</Text>
                  <Text style={[styles.cashSummaryValue, { color: colors.success }]}>
                    {sectionErrors.cash ? "Indisponível" : BRL(cashTotals.entrada)}
                  </Text>
                </View>
                <View style={styles.cashSummaryDivider} />
                <View style={styles.cashSummaryItem}>
                  <Text style={styles.cashSummaryLabel}>Saídas</Text>
                  <Text style={[styles.cashSummaryValue, { color: colors.error }]}>
                    {sectionErrors.cash ? "Indisponível" : BRL(cashTotals.saida)}
                  </Text>
                </View>
              </View>
              <View style={styles.transactions}>
                {recentCash.length ? (
                  recentCash.map((item) => (
                    <View key={item.id} style={styles.transactionRow}>
                      <View
                        style={[
                          styles.transactionIcon,
                          {
                            backgroundColor:
                              item.tipo === "entrada" ? `${colors.success}1A` : `${colors.error}1A`,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: item.tipo === "entrada" ? colors.success : colors.error,
                            fontWeight: "800",
                          }}
                        >
                          {item.tipo === "entrada" ? "↓" : "↑"}
                        </Text>
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle} numberOfLines={1}>
                          {item.descricao}
                        </Text>
                        <Text style={styles.transactionMeta} numberOfLines={1}>
                          {item.categoria} · {dateTimeBR(item.data)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.transactionValue,
                          { color: item.tipo === "entrada" ? colors.success : colors.error },
                        ]}
                      >
                        {item.tipo === "entrada" ? "+" : "−"}
                        {BRL(item.valor)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.emptyInline, !!sectionErrors.cash && { color: colors.error }]}>
                    {sectionErrors.cash || "Nenhuma movimentação registrada hoje."}
                  </Text>
                )}
              </View>
            </Panel>

            <Panel>
              <SectionTitle
                eyebrow="PÓS-VENDA"
                title="Garantias próximas"
                action={{ label: "Ver garantias", onPress: () => router.push("/garantias") }}
              />
              {warranties.length ? (
                warranties.slice(0, 3).map((warranty) => (
                  <View key={warranty.id} style={styles.warrantyRow}>
                    <View style={styles.warrantyIcon}>
                      <Text style={styles.warrantyIconText}>◷</Text>
                    </View>
                    <View style={styles.warrantyInfo}>
                      <Text style={styles.warrantyTitle} numberOfLines={2}>
                        {warranty.descricao}
                      </Text>
                      <Text style={styles.warrantyMeta}>
                        OS #{warranty.os_numero} · {warranty.placa}
                      </Text>
                    </View>
                    <Text style={styles.warrantyDate}>{dateBR(warranty.data_fim)}</Text>
                  </View>
                ))
              ) : (
                <EmptyPanel
                  title={sectionErrors.warranties ? "Garantias indisponíveis" : loading ? "Carregando garantias…" : "Tudo em dia"}
                  hint={sectionErrors.warranties || "Garantias próximas do vencimento serão exibidas aqui."}
                />
              )}
            </Panel>

            <Panel>
              <SectionTitle
                eyebrow="MÃO DE OBRA REGISTRADA"
                title="Atividade por mecânico"
                action={{ label: "Ver equipe", onPress: () => router.push("/mecanicos") }}
              />
              {mechanicRanking.length ? (
                mechanicRanking.map((mechanic, index) => (
                  <View key={mechanic.name} style={styles.mechanicRow}>
                    <View style={[styles.mechanicRank, index === 0 && styles.mechanicRankFirst]}>
                      <Text style={[styles.mechanicRankText, index === 0 && styles.mechanicRankTextFirst]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.mechanicInfo}>
                      <Text style={styles.mechanicName} numberOfLines={1}>{mechanic.name}</Text>
                      <Text style={styles.mechanicMeta}>
                        {mechanic.serviceCount} {mechanic.serviceCount === 1 ? "serviço" : "serviços"}
                      </Text>
                    </View>
                    <Text style={styles.mechanicTotal}>{BRL(mechanic.totalLabor)}</Text>
                  </View>
                ))
              ) : (
                <EmptyPanel
                  title={loading ? "Carregando atividade…" : "Sem serviços atribuídos"}
                  hint="A atividade aparecerá quando houver mão de obra vinculada a um mecânico."
                />
              )}
            </Panel>

            <Panel style={styles.summaryPanel}>
              <SectionTitle eyebrow="RESUMO DO PERÍODO" title="Visão financeira" />
              <SummaryRow label="Resultado" value={data ? BRL(data.resultado) : "—"} positive={(data?.resultado ?? 0) >= 0} />
              <SummaryRow label="Total de clientes" value={data ? String(data.total_clientes) : "—"} />
              <SummaryRow label="Total de veículos" value={data ? String(data.total_veiculos) : "—"} />
            </Panel>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
  loading,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={[styles.metricIcon, { backgroundColor: `${accent}1A` }]}>
          <Text style={[styles.metricIconText, { color: accent }]}>{icon}</Text>
        </View>
      </View>
      <View style={styles.metricValueLine}>
        {loading && <ActivityIndicator size="small" color={accent} />}
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  );
}

function EmptyPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, positive !== undefined && { color: positive ? colors.success : colors.error }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.md },
  page: { width: "100%", maxWidth: 1440, alignSelf: "center", gap: spacing.lg },
  topBar: {
    minHeight: 64,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}99`,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  topBarWide: { minHeight: 76, paddingHorizontal: spacing.lg },
  wordmark: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerLogo: { width: 42, height: 42 },
  brandName: { color: colors.onSurface, fontSize: 15, fontWeight: "900", letterSpacing: 1.4 },
  brandSubtitle: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 2 },
  topActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  openBadge: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.success}55`,
    backgroundColor: `${colors.success}12`,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: spacing.md,
  },
  liveDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.success },
  openBadgeText: { color: colors.success, fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  primaryButton: {
    minHeight: 40,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: { color: colors.onBrandPrimary, fontSize: 12, fontWeight: "900" },
  logoutButton: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.75 },
  pageHeading: { gap: spacing.lg },
  pageHeadingWide: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageHeadingCopy: { flex: 1 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 5 },
  pageTitle: { color: colors.onSurface, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  pageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4, textTransform: "capitalize" },
  quickStats: { flexDirection: "row", gap: spacing.sm },
  quickStatsNarrow: { width: "100%" },
  quickStat: {
    minWidth: 104,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickStatsNarrowItem: { flex: 1, minWidth: 0 },
  quickStatValue: { color: colors.onSurface, fontSize: 19, fontWeight: "900" },
  quickStatLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  featureAction: {
    flexGrow: 1,
    flexBasis: 210,
    minHeight: 116,
    justifyContent: "center",
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  featureActionIcon: { color: colors.onBrandPrimary, fontSize: 26, fontWeight: "500", lineHeight: 30 },
  featureActionKicker: { color: colors.onBrandPrimary, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginTop: 5 },
  featureActionTitle: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "900", marginTop: 3 },
  featureActionHint: { color: `${colors.onBrandPrimary}CC`, fontSize: 11, marginTop: 2 },
  actionCard: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 116,
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actionIcon: { color: colors.onSurface, fontSize: 22, marginBottom: spacing.sm },
  actionTitle: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  actionHint: { color: colors.muted, fontSize: 11, marginTop: 4 },
  metricsGrid: { flexDirection: "row", gap: spacing.sm },
  metricsGridNarrow: { flexWrap: "wrap" },
  metricCard: {
    flex: 1,
    minWidth: 145,
    minHeight: 132,
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  metricTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 4 },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase", flexShrink: 1 },
  metricIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  metricIconText: { fontSize: 18, fontWeight: "800" },
  metricValueLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  metricValue: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: -0.6, flexShrink: 1 },
  metricDetail: { color: colors.muted, fontSize: 11, marginTop: 7 },
  dashboardColumns: { gap: spacing.md },
  dashboardColumnsWide: { flexDirection: "row", alignItems: "flex-start" },
  primaryColumn: { flex: 1 },
  ordersPanel: { minWidth: 0 },
  secondaryColumn: { gap: spacing.md },
  secondaryColumnWide: { width: "34%", minWidth: 300, maxWidth: 400 },
  secondaryColumnNarrow: { width: "100%" },
  panel: {
    backgroundColor: colors.surfaceSecondary,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  sectionHeading: { flex: 1 },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  sectionAction: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800" },
  ordersList: { gap: 2 },
  orderRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}88`,
    paddingVertical: spacing.sm,
  },
  orderRowNarrow: { flexWrap: "wrap", rowGap: 6 },
  rowPressed: { backgroundColor: `${colors.surfaceTertiary}99` },
  orderNumber: { width: 43, height: 42, backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  orderNumberText: { color: colors.muted, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  orderNumberValue: { color: colors.onSurface, fontSize: 11, fontWeight: "800" },
  orderInfo: { flex: 1, minWidth: 80 },
  orderInfoNarrow: { flexBasis: "50%" },
  orderTitle: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  orderSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
  statusBadge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 130 },
  statusBadgeNarrow: { marginLeft: "auto", maxWidth: 118 },
  statusText: { fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  orderTotal: { width: 90, textAlign: "right", color: colors.onSurface, fontSize: 11, fontWeight: "800" },
  orderTotalNarrow: { width: 80, marginLeft: 51, textAlign: "left" },
  chevron: { color: colors.muted, fontSize: 19, marginLeft: 2 },
  cashSummary: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, padding: spacing.sm },
  cashSummaryItem: { flex: 1 },
  cashSummaryDivider: { width: 1, height: 35, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  cashSummaryLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  cashSummaryValue: { fontSize: 16, fontWeight: "900", marginTop: 4 },
  transactions: { marginTop: spacing.sm },
  transactionRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: `${colors.border}88`, paddingVertical: 7 },
  transactionIcon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  transactionInfo: { flex: 1, minWidth: 0 },
  transactionTitle: { color: colors.onSurface, fontSize: 11, fontWeight: "700" },
  transactionMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  transactionValue: { fontSize: 10, fontWeight: "800" },
  emptyInline: { color: colors.muted, fontSize: 11, paddingVertical: spacing.md },
  warrantyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderTopWidth: 1, borderTopColor: `${colors.border}88`, paddingVertical: spacing.sm },
  warrantyIcon: { width: 32, height: 32, borderRadius: radius.sm, backgroundColor: `${colors.warning}1A`, alignItems: "center", justifyContent: "center" },
  warrantyIconText: { color: colors.warning, fontSize: 18, fontWeight: "800" },
  warrantyInfo: { flex: 1 },
  warrantyTitle: { color: colors.onSurface, fontSize: 11, fontWeight: "800" },
  warrantyMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  warrantyDate: { color: colors.warning, fontSize: 9, fontWeight: "800", textAlign: "right" },
  summaryPanel: { gap: spacing.sm },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: `${colors.border}88`, paddingTop: spacing.sm },
  summaryLabel: { color: colors.muted, fontSize: 11 },
  summaryValue: { color: colors.onSurface, fontSize: 11, fontWeight: "800" },
  mechanicRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}88`,
    paddingVertical: spacing.sm,
  },
  mechanicRank: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  mechanicRankFirst: { backgroundColor: `${colors.brandPrimary}22` },
  mechanicRankText: { color: colors.muted, fontSize: 11, fontWeight: "900" },
  mechanicRankTextFirst: { color: colors.brandPrimary },
  mechanicInfo: { flex: 1, minWidth: 0 },
  mechanicName: { color: colors.onSurface, fontSize: 11, fontWeight: "800" },
  mechanicMeta: { color: colors.muted, fontSize: 9, marginTop: 3 },
  mechanicTotal: { color: colors.success, fontSize: 11, fontWeight: "900" },
  emptyPanel: { paddingVertical: spacing.lg, alignItems: "center" },
  emptyTitle: { color: colors.onSurface, fontSize: 12, fontWeight: "800", textAlign: "center" },
  emptyHint: { color: colors.muted, fontSize: 10, textAlign: "center", marginTop: 4 },
  loader: { paddingVertical: spacing.xl },
  errorPanel: { borderColor: `${colors.error}77` },
  errorTitle: { color: colors.error, fontSize: 13, fontWeight: "800" },
  errorText: { color: colors.muted, fontSize: 11, marginTop: 4 },
  retryButton: { alignSelf: "flex-start", marginTop: spacing.sm, paddingVertical: spacing.xs },
  retryText: { color: colors.brandPrimary, fontSize: 11, fontWeight: "800" },
});
