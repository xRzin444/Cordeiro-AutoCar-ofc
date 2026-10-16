import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Button } from "@/src/components/ui";
import { BRL, dateBR, OS_STATUS_LABEL } from "@/src/utils/format";
import { colors, spacing } from "@/src/theme";

export default function VeiculoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<any>(null);
  useEffect(() => { api.get(`/vehicles/${id}`).then(setV).catch(() => {}); }, [id]);
  if (!v) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, gap: spacing.md }}>
      <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
      <Text style={{ color: colors.onSurface, fontSize: 26, fontWeight: "900" }}>{v.placa}</Text>
      <Text style={{ color: colors.muted, marginTop: -8 }}>{v.marca} {v.modelo} {v.versao || ""} · {v.ano_modelo || v.ano_fabricacao || ""}</Text>
      <Card>
        <Text style={styles.lbl}>Proprietário</Text><Text style={styles.val}>{v.cliente?.nome || "—"}</Text>
        <Text style={styles.lbl}>Telefone</Text><Text style={styles.val}>{v.cliente?.telefone || "—"}</Text>
        {!!v.km_atual && <><Text style={styles.lbl}>KM atual</Text><Text style={styles.val}>{v.km_atual}</Text></>}
        {!!v.cor && <><Text style={styles.lbl}>Cor</Text><Text style={styles.val}>{v.cor}</Text></>}
        {!!v.combustivel && <><Text style={styles.lbl}>Combustível</Text><Text style={styles.val}>{v.combustivel}</Text></>}
      </Card>
      <Button label="Editar veículo" variant="ghost" onPress={() => router.push(`/veiculos/form?id=${v.id}` as any)} />
      <Text style={{ color: colors.brandPrimary, fontWeight: "800", letterSpacing: 1 }}>HISTÓRICO ({v.ordens?.length || 0})</Text>
      {(v.ordens || []).map((o: any) => (
        <Pressable key={o.id} onPress={() => router.push(`/os/${o.id}` as any)}>
          <Card>
            <Text style={styles.val}>OS #{o.numero} · {BRL(o.total ?? 0)}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{OS_STATUS_LABEL[o.status]} · {dateBR(o.abertura)}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 },
  val: { color: colors.onSurface, fontWeight: "700" },
});
