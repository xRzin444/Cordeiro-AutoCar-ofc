import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, StatusChip, Empty, inputStyle } from "@/src/components/ui";
import { BRL, dateBR, OS_STATUS_LABEL } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";

const FILTERS = [
  { k: "", lbl: "Todas" },
  { k: "orcamento", lbl: "Orçamento" },
  { k: "em_execucao", lbl: "Execução" },
  { k: "aguardando_retirada", lbl: "Aguard. retirada" },
  { k: "concluida", lbl: "Concluída" },
  { k: "entregue", lbl: "Entregue" },
];

export default function OSList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    const r = await api.get<any[]>(`/work-orders${params.toString() ? "?" + params.toString() : ""}`);
    setItems(r);
  }, [q, status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.surface }}>
        <Text style={styles.title}>ORDENS DE SERVIÇO</Text>
        <TextInput
          testID="os-search-input"
          value={q} onChangeText={setQ} onSubmitEditing={load}
          placeholder="Buscar por nº ou placa"
          placeholderTextColor={colors.muted}
          style={[inputStyle, { marginTop: spacing.sm }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: spacing.sm }} style={{ marginTop: 4 }}>
          {FILTERS.map(f => (
            <Pressable key={f.k || "all"} onPress={() => setStatus(f.k)}
              style={{ flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: status === f.k ? colors.brandPrimary : colors.border, backgroundColor: status === f.k ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
              <Text style={{ color: status === f.k ? colors.brandPrimary : colors.muted, fontWeight: "700", fontSize: 12 }}>{f.lbl.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        ListEmptyComponent={<Empty title="Nenhuma OS encontrada" hint="Toque em + Nova OS para começar." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/os/${item.id}`)} testID={`os-card-${item.numero}`}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.onSurface, fontWeight: "900", fontSize: 16 }}>OS #{item.numero}</Text>
                <StatusChip status={item.status} label={OS_STATUS_LABEL[item.status] || item.status} />
              </View>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{item.cliente_nome} · {item.placa || "—"}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{item.veiculo_label}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm }}>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{dateBR(item.abertura)}</Text>
                <Text style={{ color: colors.onSurface, fontWeight: "800" }}>{BRL(item.total)}</Text>
              </View>
              <Text style={{ color: item.status_pagamento === "pago" ? colors.success : item.status_pagamento === "parcial" ? colors.warning : colors.muted, fontSize: 11, marginTop: 2 }}>
                Pago: {BRL(item.total_pago)} · Saldo: {BRL(item.saldo)} · {item.status_pagamento.toUpperCase()}
              </Text>
            </Card>
          </Pressable>
        )}
      />

      <Pressable testID="os-fab" onPress={() => router.push("/os/new")} style={[styles.fab, { bottom: 80 }]}>
        <Text style={styles.fabText}>+ NOVA OS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  fab: { position: "absolute", right: spacing.lg, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.lg, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  fabText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 1 },
});
