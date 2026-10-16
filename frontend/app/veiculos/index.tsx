import { useCallback, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Empty, inputStyle } from "@/src/components/ui";
import { colors, spacing, radius } from "@/src/theme";

export default function Veiculos() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const r = await api.get<any[]>(`/vehicles${q ? "?q=" + encodeURIComponent(q) : ""}`);
    setItems(r);
  }, [q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
          <Text style={styles.title}>VEÍCULOS</Text>
          <View style={{ width: 60 }} />
        </View>
        <TextInput testID="veic-search" value={q} onChangeText={setQ} onSubmitEditing={load} placeholder="Placa, marca ou modelo" placeholderTextColor={colors.muted} autoCapitalize="characters" style={[inputStyle, { marginTop: spacing.sm }]} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        ListEmptyComponent={<Empty title="Nenhum veículo" hint="Cadastre a frota dos seus clientes." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/veiculos/${item.id}` as any)} testID={`veic-${item.id}`}>
            <Card>
              <Text style={{ color: colors.onSurface, fontWeight: "900", fontSize: 16 }}>{item.placa}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{item.marca} {item.modelo} · {item.ano_modelo || item.ano_fabricacao || "—"}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Proprietário: {item.cliente_nome}</Text>
            </Card>
          </Pressable>
        )}
      />
      <Pressable testID="veic-fab" onPress={() => router.push("/veiculos/form")} style={styles.fab}>
        <Text style={styles.fabText}>+ VEÍCULO</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.xl, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.lg, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  fabText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 1 },
});
