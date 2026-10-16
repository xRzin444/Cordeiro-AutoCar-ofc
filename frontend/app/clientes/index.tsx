import { useCallback, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Empty, inputStyle } from "@/src/components/ui";
import { colors, spacing, radius } from "@/src/theme";

export default function Clientes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const r = await api.get<any[]>(`/customers${q ? "?q=" + encodeURIComponent(q) : ""}`);
    setItems(r);
  }, [q]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
          <Text style={styles.title}>CLIENTES</Text>
          <View style={{ width: 60 }} />
        </View>
        <TextInput testID="clientes-search" value={q} onChangeText={setQ} onSubmitEditing={load} placeholder="Nome, telefone, CPF/CNPJ" placeholderTextColor={colors.muted} style={[inputStyle, { marginTop: spacing.sm }]} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120, gap: spacing.sm }}
        ListEmptyComponent={<Empty title="Nenhum cliente" hint="Cadastre o primeiro cliente da oficina." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/clientes/${item.id}` as any)} testID={`cliente-${item.id}`}>
            <Card>
              <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 15 }}>{item.nome}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{item.telefone}{item.cidade ? ` · ${item.cidade}/${item.estado || ""}` : ""}</Text>
              {!item.ativo && <Text style={{ color: colors.warning, fontSize: 11, marginTop: 2 }}>INATIVO</Text>}
            </Card>
          </Pressable>
        )}
      />
      <Pressable testID="clientes-fab" onPress={() => router.push("/clientes/form")} style={styles.fab}>
        <Text style={styles.fabText}>+ CLIENTE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.xl, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.lg, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  fabText: { color: colors.onBrand, fontWeight: "900", letterSpacing: 1 },
});
