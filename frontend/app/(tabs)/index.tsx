import { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, apiFetch } from "@/src/api/client";
import { Card } from "@/src/components/ui";
import { BRL, dateBR } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";
import { logout } from "@/src/api/client";

type Dash = {
  periodo: { start: string; end: string };
  faturamento_bruto: number; total_entradas: number; total_saidas: number; resultado: number;
  os_abertas: number; os_execucao: number; os_concluidas: number; garantias_proximas: number;
  total_clientes: number; total_veiculos: number;
};

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Dash | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<Dash>("/dashboard");
      setData(d);
    } catch (e: any) {
      if (String(e.message).includes("expirada")) router.replace("/login");
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function sair() { await logout(); router.replace("/login"); }

  const KPI = ({ label, value, color }: any) => (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, color ? { color } : null]}>{value}</Text>
    </View>
  );

  const Shortcut = ({ label, onPress, testID }: any) => (
    <Pressable onPress={onPress} testID={testID} style={({ pressed }) => [styles.shortcut, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.shortcutText}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandPrimary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Bem-vindo</Text>
          <Text style={styles.brand}>CORDEIRO <Text style={{ color: colors.brandPrimary }}>AutoCar</Text></Text>
          {!!data && <Text style={styles.period}>Período: {dateBR(data.periodo.start)} — {dateBR(data.periodo.end)}</Text>}
        </View>
        <Pressable testID="logout-button" onPress={sair}><Text style={styles.logout}>SAIR</Text></Pressable>
      </View>

      <View style={styles.grid}>
        <KPI label="Faturamento bruto" value={BRL(data?.faturamento_bruto ?? 0)} />
        <KPI label="Entradas" value={BRL(data?.total_entradas ?? 0)} color={colors.success} />
        <KPI label="Saídas" value={BRL(data?.total_saidas ?? 0)} color={colors.error} />
        <KPI label="Resultado" value={BRL(data?.resultado ?? 0)} color={(data?.resultado ?? 0) >= 0 ? colors.success : colors.error} />
      </View>

      <Card style={{ marginHorizontal: spacing.lg, marginTop: spacing.md }}>
        <Text style={styles.sectionTitle}>Operação</Text>
        <View style={styles.row}>
          <View style={styles.statBox}><Text style={styles.statVal}>{data?.os_abertas ?? 0}</Text><Text style={styles.statLbl}>OS abertas</Text></View>
          <View style={styles.statBox}><Text style={styles.statVal}>{data?.os_execucao ?? 0}</Text><Text style={styles.statLbl}>Em execução</Text></View>
          <View style={styles.statBox}><Text style={styles.statVal}>{data?.os_concluidas ?? 0}</Text><Text style={styles.statLbl}>Concluídas</Text></View>
          <View style={styles.statBox}><Text style={[styles.statVal, { color: colors.warning }]}>{data?.garantias_proximas ?? 0}</Text><Text style={styles.statLbl}>Gar. a vencer</Text></View>
        </View>
        <View style={[styles.row, { marginTop: spacing.sm }]}>
          <View style={styles.statBox}><Text style={styles.statVal}>{data?.total_clientes ?? 0}</Text><Text style={styles.statLbl}>Clientes</Text></View>
          <View style={styles.statBox}><Text style={styles.statVal}>{data?.total_veiculos ?? 0}</Text><Text style={styles.statLbl}>Veículos</Text></View>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { marginHorizontal: spacing.lg, marginTop: spacing.lg }]}>Atalhos</Text>
      <View style={styles.shortcuts}>
        <Shortcut label="+ Cliente" testID="shortcut-new-customer" onPress={() => router.push("/clientes/form")} />
        <Shortcut label="+ Veículo" testID="shortcut-new-vehicle" onPress={() => router.push("/veiculos/form")} />
        <Shortcut label="+ Nova OS" testID="shortcut-new-os" onPress={() => router.push("/os/new")} />
        <Shortcut label="+ Entrada" testID="shortcut-new-entrada" onPress={() => router.push("/caixa/form?tipo=entrada")} />
        <Shortcut label="+ Saída" testID="shortcut-new-saida" onPress={() => router.push("/caixa/form?tipo=saida")} />
        <Shortcut label="Mecânicos" testID="shortcut-mecanicos" onPress={() => router.push("/mecanicos")} />
      </View>

      {(data?.total_clientes ?? 0) === 0 && (
        <Card style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Text style={{ color: colors.onSurface, fontWeight: "700", marginBottom: 4 }}>Comece agora</Text>
          <Text style={{ color: colors.muted }}>Cadastre seu primeiro cliente, vincule um veículo e abra uma Ordem de Serviço para ver os indicadores reais da oficina.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  hello: { color: colors.muted, fontSize: 12, letterSpacing: 1 },
  brand: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  period: { color: colors.muted, fontSize: 11, marginTop: 2 },
  logout: { color: colors.brandPrimary, fontWeight: "800", letterSpacing: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: spacing.sm, marginTop: spacing.sm },
  kpi: { width: "48%", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, flexGrow: 1 },
  kpiLabel: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  kpiValue: { color: colors.onSurface, fontSize: 20, fontWeight: "800", marginTop: 4 },
  sectionTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14, letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, padding: spacing.sm, alignItems: "center" },
  statVal: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  statLbl: { color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "center" },
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.lg },
  shortcut: { flexGrow: 1, minWidth: "30%", minHeight: 48, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
  shortcutText: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
});
