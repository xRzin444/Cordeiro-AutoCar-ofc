import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Button } from "@/src/components/ui";
import { BRL, dateBR, OS_STATUS_LABEL } from "@/src/utils/format";
import { colors, spacing } from "@/src/theme";

export default function ClienteDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [c, setC] = useState<any>(null);

  useEffect(() => { api.get(`/customers/${id}`).then(setC).catch(() => {}); }, [id]);

  if (!c) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, gap: spacing.md }}>
      <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
      <Text style={styles.title}>{c.nome}</Text>
      <Card>
        <Text style={styles.lbl}>Telefone</Text><Text style={styles.val}>{c.telefone}</Text>
        {!!c.whatsapp && (<><Text style={styles.lbl}>WhatsApp</Text><Text style={styles.val}>{c.whatsapp}</Text></>)}
        {!!c.email && (<><Text style={styles.lbl}>E-mail</Text><Text style={styles.val}>{c.email}</Text></>)}
        {!!c.cidade && (<><Text style={styles.lbl}>Cidade/UF</Text><Text style={styles.val}>{c.cidade}/{c.estado || ""}</Text></>)}
      </Card>
      <Button label="Editar cliente" variant="ghost" onPress={() => router.push(`/clientes/form?id=${c.id}` as any)} />
      <Text style={styles.section}>VEÍCULOS ({c.veiculos?.length || 0})</Text>
      {(c.veiculos || []).map((v: any) => (
        <Pressable key={v.id} onPress={() => router.push(`/veiculos/${v.id}` as any)}>
          <Card>
            <Text style={styles.val}>{v.placa} · {v.marca} {v.modelo}</Text>
            <Text style={styles.muted}>{v.ano_modelo || v.ano_fabricacao || ""} · {v.cor || ""}</Text>
          </Card>
        </Pressable>
      ))}
      <Button label="+ Vincular veículo" onPress={() => router.push(`/veiculos/form?cliente_id=${c.id}` as any)} />
      <Text style={styles.section}>ORDENS DE SERVIÇO ({c.ordens?.length || 0})</Text>
      {(c.ordens || []).map((o: any) => (
        <Pressable key={o.id} onPress={() => router.push(`/os/${o.id}` as any)}>
          <Card>
            <Text style={styles.val}>OS #{o.numero} · {BRL(o.total)}</Text>
            <Text style={styles.muted}>{OS_STATUS_LABEL[o.status]} · {dateBR(o.abertura)}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  section: { color: colors.brandPrimary, fontWeight: "800", letterSpacing: 1, marginTop: spacing.md },
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 4 },
  val: { color: colors.onSurface, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
