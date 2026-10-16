import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Button, inputStyle } from "@/src/components/ui";
import { colors, spacing, radius } from "@/src/theme";

const MODELOS = [
  { k: "none", lbl: "Sem comissão" }, { k: "comissao", lbl: "Comissão %" },
  { k: "fixo", lbl: "Valor fixo" }, { k: "misto", lbl: "Misto" },
];

export default function MecForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [f, setF] = useState<any>({ ativo: true, modelo_remuneracao: "none", percentual_comissao: 0, valor_fixo: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (id) api.get(`/mechanics/${id}`).then(setF).catch(() => {}); }, [id]);

  async function save() {
    setErr(null); setSaving(true);
    try {
      if (!f.nome?.trim()) throw new Error("Informe o nome");
      const payload = { ...f, percentual_comissao: Number(f.percentual_comissao || 0), valor_fixo: Number(f.valor_fixo || 0) };
      if (id) await api.put(`/mechanics/${id}`, payload);
      else await api.post("/mechanics", payload);
      router.back();
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }
  const F = (k: string, lbl: string, opts: any = {}) => (
    <View style={{ gap: 4 }}>
      <Text style={styles.lbl}>{lbl}</Text>
      <TextInput testID={`mec-${k}`} value={String(f[k] ?? "")} onChangeText={(v) => setF({ ...f, [k]: v })} placeholderTextColor={colors.muted} style={inputStyle} {...opts} />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, paddingBottom: 60, gap: spacing.sm }}>
        <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "900" }}>{id ? "EDITAR MECÂNICO" : "NOVO MECÂNICO"}</Text>
        {F("nome", "Nome completo")}
        {F("cpf", "CPF")}
        {F("telefone", "Telefone", { keyboardType: "phone-pad" })}
        {F("email", "E-mail", { keyboardType: "email-address", autoCapitalize: "none" })}
        {F("especialidade", "Especialidade")}
        <Text style={styles.sec}>REMUNERAÇÃO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {MODELOS.map(m => (
            <Pressable key={m.k} onPress={() => setF({ ...f, modelo_remuneracao: m.k })} style={{ flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: f.modelo_remuneracao === m.k ? colors.brandPrimary : colors.border, backgroundColor: f.modelo_remuneracao === m.k ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
              <Text style={{ color: f.modelo_remuneracao === m.k ? colors.brandPrimary : colors.onSurface, fontWeight: "700", fontSize: 12 }}>{m.lbl}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {(f.modelo_remuneracao === "comissao" || f.modelo_remuneracao === "misto") && F("percentual_comissao", "Percentual de comissão (%)", { keyboardType: "decimal-pad" })}
        {(f.modelo_remuneracao === "fixo" || f.modelo_remuneracao === "misto") && F("valor_fixo", "Valor fixo por serviço (R$)", { keyboardType: "decimal-pad" })}
        {F("observacoes", "Observações", { multiline: true, numberOfLines: 3 })}
        {!!err && <Text style={{ color: colors.error }}>{err}</Text>}
        <Button testID="mec-save" label={saving ? "Salvando..." : "Salvar"} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  sec: { color: colors.brandPrimary, marginTop: spacing.md, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
});
