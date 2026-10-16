import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Empty } from "@/src/components/ui";
import { BRL, dateTimeBR } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";

export default function Caixa() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    const r = await api.get<any[]>("/cash");
    setItems(r);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const entradas = items.filter(i => i.tipo === "entrada").reduce((a, b) => a + Number(b.valor || 0), 0);
  const saidas = items.filter(i => i.tipo === "saida").reduce((a, b) => a + Number(b.valor || 0), 0);
  const saldo = entradas - saidas;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
        <Text style={styles.title}>FLUXO DE CAIXA</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <View style={[styles.sum, { borderColor: colors.success }]}>
            <Text style={styles.sumLbl}>Entradas</Text>
            <Text style={[styles.sumVal, { color: colors.success }]}>{BRL(entradas)}</Text>
          </View>
          <View style={[styles.sum, { borderColor: colors.error }]}>
            <Text style={styles.sumLbl}>Saídas</Text>
            <Text style={[styles.sumVal, { color: colors.error }]}>{BRL(saidas)}</Text>
          </View>
          <View style={[styles.sum, { borderColor: colors.border }]}>
            <Text style={styles.sumLbl}>Saldo</Text>
            <Text style={[styles.sumVal, { color: saldo >= 0 ? colors.success : colors.error }]}>{BRL(saldo)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable testID="caixa-add-entrada" onPress={() => router.push("/caixa/form?tipo=entrada")} style={[styles.btn, { backgroundColor: colors.success }]}>
            <Text style={styles.btnText}>+ ENTRADA</Text>
          </Pressable>
          <Pressable testID="caixa-add-saida" onPress={() => router.push("/caixa/form?tipo=saida")} style={[styles.btn, { backgroundColor: colors.error }]}>
            <Text style={styles.btnText}>+ SAÍDA</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        ListEmptyComponent={<Empty title="Nenhum lançamento" hint="Registre entradas pelos pagamentos de OS ou cadastre manualmente." />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: colors.onSurface, fontWeight: "700", flex: 1, paddingRight: 8 }}>{item.descricao}</Text>
              <Text style={{ color: item.tipo === "entrada" ? colors.success : colors.error, fontWeight: "900" }}>
                {item.tipo === "entrada" ? "+" : "-"} {BRL(item.valor)}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>{item.categoria} · {dateTimeBR(item.data)}</Text>
            {!!item.motivo && <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Motivo: {item.motivo}</Text>}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  sum: { flex: 1, borderWidth: 1, backgroundColor: colors.surfaceSecondary, padding: spacing.sm, borderRadius: radius.md },
  sumLbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  sumVal: { fontSize: 16, fontWeight: "900", marginTop: 2 },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#FFF", fontWeight: "900", letterSpacing: 1 },
});
