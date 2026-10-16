import { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Empty, StatusChip } from "@/src/components/ui";
import { dateBR } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";

const F = [
  { k: "", lbl: "Todas" }, { k: "vigente", lbl: "Vigente" },
  { k: "proxima", lbl: "Próxima" }, { k: "vencida", lbl: "Vencida" },
];

export default function Garantias() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const load = useCallback(async () => {
    const r = await api.get<any[]>(`/warranties${status ? "?status=" + status : ""}`);
    setItems(r);
  }, [status]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const chipStatus = (s: string) => s === "vigente" ? "concluida" : s === "proxima" ? "orcamento" : s === "vencida" ? "cancelada" : "aguardando_aprovacao";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
          <Text style={styles.title}>GARANTIAS</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: spacing.sm }}>
          {F.map(f => (
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
        ListEmptyComponent={<Empty title="Nenhuma garantia" hint="As garantias são criadas ao concluir uma OS com prazo informado." />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.onSurface, fontWeight: "800" }}>{item.descricao}</Text>
              <StatusChip status={chipStatus(item.situacao)} label={item.situacao} />
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>OS #{item.os_numero} · {item.placa}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Prazo: {item.prazo_dias} dias · Vence em {dateBR(item.data_fim)}</Text>
          </Card>
        )}
      />
    </View>
  );
}
const styles = StyleSheet.create({ title: { color: colors.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: 1 } });
