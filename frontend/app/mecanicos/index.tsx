import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Empty } from "@/src/components/ui";
import { BRL } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";

export default function Mecanicos() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const load = useCallback(async () => setItems(await api.get<any[]>("/mechanics")), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
        <Text style={styles.title}>MECÂNICOS</Text>
        <View style={{ width: 60 }} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        ListEmptyComponent={<Empty title="Nenhum mecânico cadastrado" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/mecanicos/${item.id}` as any)} testID={`mec-${item.id}`}>
            <Card>
              <Text style={{ color: colors.onSurface, fontWeight: "800" }}>{item.nome}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{item.especialidade || "—"} · {item.telefone || ""}</Text>
            </Card>
          </Pressable>
        )}
      />
      <Pressable testID="mec-fab" onPress={() => router.push("/mecanicos/form")} style={styles.fab}>
        <Text style={styles.fabText}>+ MECÂNICO</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.xl, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.lg, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  fabText: { color: colors.onBrand, fontWeight: "900" },
});
