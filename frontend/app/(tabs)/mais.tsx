import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius } from "@/src/theme";
import { logout } from "@/src/api/client";

const ITEMS = [
  { label: "Clientes", path: "/clientes", testID: "menu-clientes" },
  { label: "Veículos", path: "/veiculos", testID: "menu-veiculos" },
  { label: "Mecânicos", path: "/mecanicos", testID: "menu-mecanicos" },
  { label: "Garantias", path: "/garantias", testID: "menu-garantias" },
];

export default function Mais() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  async function sair() { await logout(); router.replace("/login"); }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
      <Text style={styles.title}>MAIS</Text>
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        {ITEMS.map(it => (
          <Pressable key={it.path} testID={it.testID} onPress={() => router.push(it.path as any)} style={styles.row}>
            <Text style={styles.rowText}>{it.label}</Text>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        ))}
      </View>
      <Pressable testID="mais-logout" onPress={sair} style={[styles.row, { marginTop: spacing.xl, borderColor: colors.error }]}>
        <Text style={[styles.rowText, { color: colors.error }]}>Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  row: { minHeight: 56, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowText: { color: colors.onSurface, fontWeight: "700", fontSize: 15 },
  chev: { color: colors.muted, fontSize: 24 },
});
