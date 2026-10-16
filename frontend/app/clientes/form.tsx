import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, Switch, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Button, inputStyle } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme";

export default function ClienteForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [f, setF] = useState<any>({ nome: "", telefone: "", ativo: true });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (id) api.get(`/customers/${id}`).then(setF).catch(() => {}); }, [id]);

  async function save() {
    setErr(null); setSaving(true);
    try {
      if (!f.nome?.trim()) throw new Error("Informe o nome do cliente");
      if (!f.telefone?.trim()) throw new Error("Informe o telefone");
      if (id) await api.put(`/customers/${id}`, f);
      else await api.post("/customers", f);
      router.back();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  const F = (k: string, lbl: string, opts: any = {}) => (
    <View style={{ gap: 4 }}>
      <Text style={styles.lbl}>{lbl}</Text>
      <TextInput testID={`cli-${k}`} value={f[k] ?? ""} onChangeText={(v) => setF({ ...f, [k]: v })} placeholderTextColor={colors.muted} style={inputStyle} {...opts} />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, paddingBottom: 60, gap: spacing.sm }}>
        <Text style={styles.title}>{id ? "EDITAR CLIENTE" : "NOVO CLIENTE"}</Text>
        <Text style={styles.sec}>IDENTIFICAÇÃO</Text>
        {F("nome", "Nome / Razão social")}
        {F("cpf_cnpj", "CPF ou CNPJ")}
        <Text style={styles.sec}>CONTATO</Text>
        {F("telefone", "Telefone principal", { keyboardType: "phone-pad" })}
        {F("telefone_secundario", "Telefone secundário", { keyboardType: "phone-pad" })}
        {F("whatsapp", "WhatsApp", { keyboardType: "phone-pad" })}
        {F("email", "E-mail", { keyboardType: "email-address", autoCapitalize: "none" })}
        <Text style={styles.sec}>ENDEREÇO</Text>
        {F("cep", "CEP")}
        {F("rua", "Rua")}
        {F("numero", "Número")}
        {F("complemento", "Complemento")}
        {F("bairro", "Bairro")}
        {F("cidade", "Cidade")}
        {F("estado", "Estado")}
        <Text style={styles.sec}>OBSERVAÇÕES</Text>
        {F("observacoes", "Anotações gerais", { multiline: true, numberOfLines: 3 })}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md }}>
          <Switch value={!!f.ativo} onValueChange={(v) => setF({ ...f, ativo: v })} />
          <Text style={{ color: colors.onSurface }}>Cliente ativo</Text>
        </View>
        {!!err && <Text style={{ color: colors.error }}>{err}</Text>}
        <Button testID="cli-save" label={saving ? "Salvando..." : "Salvar cliente"} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  sec: { color: colors.brandPrimary, marginTop: spacing.md, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
});
