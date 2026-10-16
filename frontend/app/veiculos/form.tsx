import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Button, inputStyle } from "@/src/components/ui";
import { colors, spacing, radius } from "@/src/theme";

export default function VeiculoForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, cliente_id } = useLocalSearchParams<{ id?: string; cliente_id?: string }>();
  const [f, setF] = useState<any>({ ativo: true, cliente_id: cliente_id ?? "" });
  const [clientes, setClientes] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [force, setForce] = useState(false);

  useEffect(() => {
    api.get("/customers").then(setClientes).catch(() => {});
    if (id) api.get(`/vehicles/${id}`).then(setF).catch(() => {});
  }, [id]);

  async function save() {
    setErr(null); setSaving(true);
    try {
      if (!f.cliente_id) throw new Error("Selecione o proprietário");
      if (!f.placa) throw new Error("Informe a placa");
      if (!f.marca || !f.modelo) throw new Error("Informe marca e modelo");
      if (id) await api.put(`/vehicles/${id}`, f);
      else await api.post(`/vehicles${force ? "?force=true" : ""}`, f);
      router.back();
    } catch (e: any) {
      if (String(e.message).includes("Já existe veículo") && !force) { setForce(true); setErr(e.message + " Toque em Salvar novamente para confirmar."); }
      else setErr(e.message);
    } finally { setSaving(false); }
  }

  const F = (k: string, lbl: string, opts: any = {}) => (
    <View style={{ gap: 4 }}>
      <Text style={styles.lbl}>{lbl}</Text>
      <TextInput testID={`veic-${k}`} value={String(f[k] ?? "")} onChangeText={(v) => setF({ ...f, [k]: v })} placeholderTextColor={colors.muted} style={inputStyle} {...opts} />
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, paddingBottom: 60, gap: spacing.sm }}>
        <Text style={styles.title}>{id ? "EDITAR VEÍCULO" : "NOVO VEÍCULO"}</Text>
        <Text style={styles.sec}>PROPRIETÁRIO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {clientes.map((c: any) => (
            <Pressable key={c.id} onPress={() => setF({ ...f, cliente_id: c.id })} style={{ flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: f.cliente_id === c.id ? colors.brandPrimary : colors.border, backgroundColor: f.cliente_id === c.id ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
              <Text style={{ color: f.cliente_id === c.id ? colors.brandPrimary : colors.onSurface, fontWeight: "700", fontSize: 12 }}>{c.nome}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.sec}>IDENTIFICAÇÃO</Text>
        {F("placa", "Placa", { autoCapitalize: "characters" })}
        {F("marca", "Marca")}
        {F("modelo", "Modelo")}
        {F("versao", "Versão")}
        {F("ano_fabricacao", "Ano fabricação", { keyboardType: "number-pad" })}
        {F("ano_modelo", "Ano modelo", { keyboardType: "number-pad" })}
        {F("cor", "Cor")}
        {F("combustivel", "Combustível")}
        {F("km_atual", "KM atual", { keyboardType: "number-pad" })}
        {F("chassi", "Chassi")}
        {F("renavam", "RENAVAM")}
        {F("observacoes", "Observações", { multiline: true, numberOfLines: 3 })}
        {!!err && <Text style={{ color: colors.warning }}>{err}</Text>}
        <Button testID="veic-save" label={saving ? "Salvando..." : "Salvar veículo"} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  sec: { color: colors.brandPrimary, marginTop: spacing.md, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
});
