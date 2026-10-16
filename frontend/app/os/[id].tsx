import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Card, Button, StatusChip, inputStyle } from "@/src/components/ui";
import { BRL, dateTimeBR, OS_STATUS_LABEL, OS_STATUS_LIST, PAY_METHODS } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";

export default function OSDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [o, setO] = useState<any>(null);
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState("pix");
  const [err, setErr] = useState<string | null>(null);

  async function reload() { setO(await api.get(`/work-orders/${id}`)); }
  useEffect(() => { reload().catch(() => {}); }, [id]);

  async function changeStatus(st: string) {
    try {
      const r = await api.put(`/work-orders/${id}`, { ...o, status: st });
      setO(r);
    } catch (e: any) { setErr(e.message); }
  }
  async function pagar() {
    setErr(null);
    try {
      const v = Number(valor);
      if (!v || v <= 0) throw new Error("Informe o valor do pagamento");
      await api.post(`/work-orders/${id}/payments`, { valor: v, forma });
      setValor(""); await reload();
    } catch (e: any) { setErr(e.message); }
  }

  if (!o) return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, paddingBottom: 80, gap: spacing.md }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.onSurface, fontSize: 24, fontWeight: "900" }}>OS #{o.numero}</Text>
          <StatusChip status={o.status} label={OS_STATUS_LABEL[o.status]} />
        </View>
        <Text style={{ color: colors.muted }}>{o.cliente_nome} · {o.placa} · {o.veiculo_label}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Aberta em {dateTimeBR(o.abertura)}</Text>

        <Text style={styles.sec}>STATUS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {OS_STATUS_LIST.map(st => (
            <Pressable key={st} onPress={() => changeStatus(st)} testID={`os-status-${st}`}
              style={{ flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: o.status === st ? colors.brandPrimary : colors.border, backgroundColor: o.status === st ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
              <Text style={{ color: o.status === st ? colors.brandPrimary : colors.onSurface, fontWeight: "700", fontSize: 11 }}>{OS_STATUS_LABEL[st].toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sec}>SERVIÇOS</Text>
        {(o.servicos || []).map((s: any, i: number) => (
          <Card key={i}>
            <Text style={{ color: colors.onSurface, fontWeight: "800" }}>{s.descricao}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Mecânico: {s.mecanico_nome || "—"} · Garantia: {s.garantia_dias || 0} dias</Text>
            <Text style={{ color: colors.brandPrimary, fontWeight: "800", marginTop: 4 }}>{BRL(s.valor_mao_obra)}</Text>
          </Card>
        ))}
        <Text style={styles.sec}>PEÇAS</Text>
        {(o.pecas || []).map((p: any, i: number) => (
          <Card key={i}>
            <Text style={{ color: colors.onSurface, fontWeight: "800" }}>{p.descricao}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{p.quantidade} × {BRL(p.preco_unitario)} · Garantia {p.garantia_dias || 0}d</Text>
            <Text style={{ color: colors.brandPrimary, fontWeight: "800", marginTop: 4 }}>{BRL(Number(p.quantidade || 0) * Number(p.preco_unitario || 0))}</Text>
          </Card>
        ))}

        <Card>
          <Text style={styles.lbl}>Mão de obra</Text><Text style={styles.val}>{BRL(o.total_mao_obra)}</Text>
          <Text style={styles.lbl}>Peças</Text><Text style={styles.val}>{BRL(o.total_pecas)}</Text>
          <Text style={styles.lbl}>Desconto / Acréscimo</Text><Text style={styles.val}>- {BRL(o.total_desconto)} / + {BRL(o.total_acrescimo)}</Text>
          <Text style={styles.lbl}>TOTAL</Text><Text style={[styles.val, { color: colors.brandPrimary, fontSize: 24 }]}>{BRL(o.total)}</Text>
          <Text style={styles.lbl}>Pago</Text><Text style={[styles.val, { color: colors.success }]}>{BRL(o.total_pago)}</Text>
          <Text style={styles.lbl}>Saldo</Text><Text style={[styles.val, { color: o.saldo > 0 ? colors.warning : colors.success }]}>{BRL(o.saldo)} · {o.status_pagamento.toUpperCase()}</Text>
        </Card>

        <Text style={styles.sec}>REGISTRAR PAGAMENTO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PAY_METHODS.map(pm => (
            <Pressable key={pm.value} onPress={() => setForma(pm.value)}
              style={{ flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: forma === pm.value ? colors.brandPrimary : colors.border, backgroundColor: forma === pm.value ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
              <Text style={{ color: forma === pm.value ? colors.brandPrimary : colors.onSurface, fontWeight: "700", fontSize: 12 }}>{pm.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput testID="os-pay-value" placeholder="Valor pago R$" placeholderTextColor={colors.muted} value={valor} onChangeText={setValor} keyboardType="decimal-pad" style={inputStyle} />
        {!!err && <Text style={{ color: colors.error }}>{err}</Text>}
        <Button testID="os-pay-submit" label="Registrar pagamento" onPress={pagar} />

        {!!(o.historico?.length) && (
          <>
            <Text style={styles.sec}>HISTÓRICO</Text>
            {o.historico.map((h: any, i: number) => (
              <Text key={i} style={{ color: colors.muted, fontSize: 12 }}>• {dateTimeBR(h.em)} — {h.evento} ({h.por})</Text>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sec: { color: colors.brandPrimary, marginTop: spacing.sm, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 },
  val: { color: colors.onSurface, fontWeight: "800", marginTop: 2 },
});
