import { useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Button, inputStyle } from "@/src/components/ui";
import { CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, PAY_METHODS } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";

export default function CaixaForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tipo = "entrada" } = useLocalSearchParams<{ tipo?: "entrada" | "saida" }>();
  const cats = tipo === "saida" ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;
  const [f, setF] = useState<any>({ tipo, categoria: cats[0], forma_pagamento: "pix" });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setErr(null); setSaving(true);
    try {
      if (!f.descricao?.trim()) throw new Error("Informe a descrição");
      if (!f.valor || Number(f.valor) <= 0) throw new Error("Informe um valor válido");
      if (tipo === "saida" && !(f.motivo?.trim() || f.observacoes?.trim())) throw new Error("Para saídas, informe o motivo");
      await api.post("/cash", { ...f, valor: Number(f.valor) });
      router.back();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, paddingBottom: 60, gap: spacing.sm }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
        <Text style={{ color: colors.onSurface, fontSize: 22, fontWeight: "900" }}>
          {tipo === "entrada" ? "NOVA ENTRADA" : "NOVA SAÍDA"}
        </Text>

        <Text style={styles.lbl}>Descrição</Text>
        <TextInput testID="cash-desc" value={f.descricao || ""} onChangeText={v => setF({ ...f, descricao: v })} placeholderTextColor={colors.muted} style={inputStyle} />

        <Text style={styles.lbl}>Valor R$</Text>
        <TextInput testID="cash-valor" value={String(f.valor || "")} onChangeText={v => setF({ ...f, valor: v })} keyboardType="decimal-pad" placeholderTextColor={colors.muted} style={inputStyle} />

        <Text style={styles.lbl}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {cats.map(c => (
            <Pressable key={c} onPress={() => setF({ ...f, categoria: c })}
              style={{ flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: f.categoria === c ? colors.brandPrimary : colors.border, backgroundColor: f.categoria === c ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
              <Text style={{ color: f.categoria === c ? colors.brandPrimary : colors.onSurface, fontWeight: "700", fontSize: 11 }}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.lbl}>Forma de pagamento</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {PAY_METHODS.map(pm => (
            <Pressable key={pm.value} onPress={() => setF({ ...f, forma_pagamento: pm.value })}
              style={{ flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: f.forma_pagamento === pm.value ? colors.brandPrimary : colors.border, backgroundColor: f.forma_pagamento === pm.value ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
              <Text style={{ color: f.forma_pagamento === pm.value ? colors.brandPrimary : colors.onSurface, fontWeight: "700", fontSize: 12 }}>{pm.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tipo === "saida" && (
          <>
            <Text style={styles.lbl}>Fornecedor</Text>
            <TextInput value={f.fornecedor || ""} onChangeText={v => setF({ ...f, fornecedor: v })} placeholderTextColor={colors.muted} style={inputStyle} />
            <Text style={styles.lbl}>Nº do documento</Text>
            <TextInput value={f.documento || ""} onChangeText={v => setF({ ...f, documento: v })} placeholderTextColor={colors.muted} style={inputStyle} />
            <Text style={styles.lbl}>Motivo (obrigatório)</Text>
            <TextInput testID="cash-motivo" value={f.motivo || ""} onChangeText={v => setF({ ...f, motivo: v })} multiline numberOfLines={3} placeholder="Ex: Compra de pastilhas para OS #105" placeholderTextColor={colors.muted} style={inputStyle} />
          </>
        )}
        <Text style={styles.lbl}>Observações</Text>
        <TextInput value={f.observacoes || ""} onChangeText={v => setF({ ...f, observacoes: v })} multiline numberOfLines={2} placeholderTextColor={colors.muted} style={inputStyle} />

        {!!err && <Text style={{ color: colors.error }}>{err}</Text>}
        <Button testID="cash-save" label={saving ? "Salvando..." : "Registrar"} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginTop: spacing.sm } });
