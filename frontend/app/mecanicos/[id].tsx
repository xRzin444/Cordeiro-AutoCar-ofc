import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Button } from "@/src/components/ui";
import { BRL } from "@/src/utils/format";
import { colors, spacing } from "@/src/theme";

export default function MecDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [m, setM] = useState<any>(null);
  useEffect(() => { api.get(`/mechanics/${id}`).then(setM).catch(() => {}); }, [id]);
  if (!m) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, gap: spacing.md }}>
      <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
      <Text style={{ color: colors.onSurface, fontSize: 24, fontWeight: "900" }}>{m.nome}</Text>
      <Text style={{ color: colors.muted, marginTop: -4 }}>{m.especialidade || "Mecânico"}</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Card style={{ flex: 1 }}><Text style={styles.lbl}>Serviços</Text><Text style={styles.val}>{m.qtd_servicos || 0}</Text></Card>
        <Card style={{ flex: 1 }}><Text style={styles.lbl}>Mão de obra</Text><Text style={styles.val}>{BRL(m.total_mao_obra || 0)}</Text></Card>
      </View>
      {m.comissao_calculada != null && (
        <Card><Text style={styles.lbl}>Comissão ({m.percentual_comissao}%)</Text><Text style={styles.val}>{BRL(m.comissao_calculada)}</Text></Card>
      )}
      <Button label="Editar mecânico" variant="ghost" onPress={() => router.push(`/mecanicos/form?id=${m.id}` as any)} />
      <Text style={{ color: colors.brandPrimary, fontWeight: "800", letterSpacing: 1 }}>HISTÓRICO DE SERVIÇOS</Text>
      {(m.servicos || []).map((s: any, i: number) => (
        <Card key={i}>
          <Text style={{ color: colors.onSurface, fontWeight: "700" }}>OS #{s.os_numero} · {s.descricao}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{BRL(s.valor_mao_obra)}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  val: { color: colors.onSurface, fontSize: 20, fontWeight: "900", marginTop: 4 },
});
