import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { Button, Card, inputStyle } from "@/src/components/ui";
import { BRL } from "@/src/utils/format";
import { colors, spacing, radius } from "@/src/theme";

export default function NovaOS() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cliente_id: preCliente } = useLocalSearchParams<{ cliente_id?: string }>();
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [mecs, setMecs] = useState<any[]>([]);
  const [f, setF] = useState<any>({ cliente_id: preCliente || "", veiculo_id: "", status: "orcamento", servicos: [], pecas: [], desconto: "0", acrescimo: "0" });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/customers").then(setClientes).catch(() => {});
    api.get("/mechanics").then(setMecs).catch(() => {});
  }, []);
  useEffect(() => {
    if (f.cliente_id) api.get(`/vehicles?cliente_id=${f.cliente_id}`).then(setVeiculos).catch(() => setVeiculos([]));
    else setVeiculos([]);
  }, [f.cliente_id]);

  function addSrv() { setF({ ...f, servicos: [...f.servicos, { descricao: "", valor_mao_obra: "0", mecanico_id: "", garantia_dias: 90 }] }); }
  function addPeca() { setF({ ...f, pecas: [...f.pecas, { descricao: "", quantidade: "1", preco_unitario: "0", garantia_dias: 90 }] }); }
  function setSrv(i: number, k: string, v: any) { const a = [...f.servicos]; a[i] = { ...a[i], [k]: v }; setF({ ...f, servicos: a }); }
  function setPeca(i: number, k: string, v: any) { const a = [...f.pecas]; a[i] = { ...a[i], [k]: v }; setF({ ...f, pecas: a }); }
  function rmSrv(i: number) { setF({ ...f, servicos: f.servicos.filter((_: any, idx: number) => idx !== i) }); }
  function rmPeca(i: number) { setF({ ...f, pecas: f.pecas.filter((_: any, idx: number) => idx !== i) }); }

  const totalMO = f.servicos.reduce((a: number, s: any) => a + Number(s.valor_mao_obra || 0), 0);
  const totalPecas = f.pecas.reduce((a: number, p: any) => a + Number(p.quantidade || 0) * Number(p.preco_unitario || 0), 0);
  const total = totalMO + totalPecas - Number(f.desconto || 0) + Number(f.acrescimo || 0);

  async function save() {
    setErr(null); setSaving(true);
    try {
      if (!f.cliente_id) throw new Error("Selecione o cliente");
      if (!f.veiculo_id) throw new Error("Selecione o veículo");
      const payload = {
        ...f,
        km_entrada: Number(f.km_entrada || 0),
        desconto: Number(f.desconto || 0), acrescimo: Number(f.acrescimo || 0),
        servicos: f.servicos.map((s: any) => ({ ...s, valor_mao_obra: Number(s.valor_mao_obra || 0), garantia_dias: Number(s.garantia_dias || 0) })),
        pecas: f.pecas.map((p: any) => ({ ...p, quantidade: Number(p.quantidade || 0), preco_unitario: Number(p.preco_unitario || 0), custo_unitario: Number(p.custo_unitario || 0), garantia_dias: Number(p.garantia_dias || 0) })),
      };
      const r = await api.post<any>("/work-orders", payload);
      router.replace(`/os/${r.id}` as any);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  const Chip = ({ sel, onPress, label }: any) => (
    <Pressable onPress={onPress} style={{ flexShrink: 0, paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: sel ? colors.brandPrimary : colors.border, backgroundColor: sel ? colors.brandPrimary + "22" : "transparent", justifyContent: "center" }}>
      <Text style={{ color: sel ? colors.brandPrimary : colors.onSurface, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg, paddingBottom: 80, gap: spacing.sm }}>
        <Pressable onPress={() => router.back()}><Text style={{ color: colors.brandPrimary, fontWeight: "800" }}>‹ Voltar</Text></Pressable>
        <Text style={styles.title}>NOVA ORDEM DE SERVIÇO</Text>

        <Text style={styles.sec}>CLIENTE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {clientes.map(c => <Chip key={c.id} sel={f.cliente_id === c.id} onPress={() => setF({ ...f, cliente_id: c.id, veiculo_id: "" })} label={c.nome} />)}
        </ScrollView>
        <Text style={styles.sec}>VEÍCULO</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {veiculos.map(v => <Chip key={v.id} sel={f.veiculo_id === v.id} onPress={() => setF({ ...f, veiculo_id: v.id })} label={`${v.placa} ${v.modelo}`} />)}
        </ScrollView>

        <Text style={styles.lbl}>KM de entrada</Text>
        <TextInput testID="os-km" value={String(f.km_entrada || "")} onChangeText={(v) => setF({ ...f, km_entrada: v })} keyboardType="number-pad" placeholderTextColor={colors.muted} style={inputStyle} />
        <Text style={styles.lbl}>Relato do cliente</Text>
        <TextInput value={f.relato_cliente || ""} onChangeText={(v) => setF({ ...f, relato_cliente: v })} multiline numberOfLines={3} placeholderTextColor={colors.muted} style={inputStyle} />
        <Text style={styles.lbl}>Diagnóstico</Text>
        <TextInput value={f.diagnostico || ""} onChangeText={(v) => setF({ ...f, diagnostico: v })} multiline numberOfLines={3} placeholderTextColor={colors.muted} style={inputStyle} />

        <Text style={styles.sec}>SERVIÇOS ({f.servicos.length})</Text>
        {f.servicos.map((s: any, i: number) => (
          <Card key={i} style={{ gap: 6 }}>
            <TextInput placeholder="Descrição do serviço" placeholderTextColor={colors.muted} value={s.descricao} onChangeText={v => setSrv(i, "descricao", v)} style={inputStyle} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {mecs.map(m => <Chip key={m.id} sel={s.mecanico_id === m.id} onPress={() => setSrv(i, "mecanico_id", m.id)} label={m.nome} />)}
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput placeholder="Mão de obra R$" placeholderTextColor={colors.muted} value={String(s.valor_mao_obra)} onChangeText={v => setSrv(i, "valor_mao_obra", v)} keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} />
              <TextInput placeholder="Garantia (dias)" placeholderTextColor={colors.muted} value={String(s.garantia_dias)} onChangeText={v => setSrv(i, "garantia_dias", v)} keyboardType="number-pad" style={[inputStyle, { flex: 1 }]} />
            </View>
            <Pressable onPress={() => rmSrv(i)}><Text style={{ color: colors.error, fontWeight: "700" }}>Remover</Text></Pressable>
          </Card>
        ))}
        <Button testID="os-add-service" label="+ Serviço" variant="ghost" onPress={addSrv} />

        <Text style={styles.sec}>PEÇAS ({f.pecas.length})</Text>
        {f.pecas.map((p: any, i: number) => (
          <Card key={i} style={{ gap: 6 }}>
            <TextInput placeholder="Descrição da peça" placeholderTextColor={colors.muted} value={p.descricao} onChangeText={v => setPeca(i, "descricao", v)} style={inputStyle} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput placeholder="Qtd" placeholderTextColor={colors.muted} value={String(p.quantidade)} onChangeText={v => setPeca(i, "quantidade", v)} keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} />
              <TextInput placeholder="Preço unit." placeholderTextColor={colors.muted} value={String(p.preco_unitario)} onChangeText={v => setPeca(i, "preco_unitario", v)} keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} />
              <TextInput placeholder="Garantia (d)" placeholderTextColor={colors.muted} value={String(p.garantia_dias)} onChangeText={v => setPeca(i, "garantia_dias", v)} keyboardType="number-pad" style={[inputStyle, { flex: 1 }]} />
            </View>
            <Pressable onPress={() => rmPeca(i)}><Text style={{ color: colors.error, fontWeight: "700" }}>Remover</Text></Pressable>
          </Card>
        ))}
        <Button testID="os-add-part" label="+ Peça" variant="ghost" onPress={addPeca} />

        <Text style={styles.sec}>AJUSTES</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput placeholder="Desconto R$" placeholderTextColor={colors.muted} value={String(f.desconto)} onChangeText={v => setF({ ...f, desconto: v })} keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} />
          <TextInput placeholder="Acréscimo R$" placeholderTextColor={colors.muted} value={String(f.acrescimo)} onChangeText={v => setF({ ...f, acrescimo: v })} keyboardType="decimal-pad" style={[inputStyle, { flex: 1 }]} />
        </View>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.lbl}>Total mão de obra</Text><Text style={styles.val}>{BRL(totalMO)}</Text>
          <Text style={styles.lbl}>Total peças</Text><Text style={styles.val}>{BRL(totalPecas)}</Text>
          <Text style={styles.lbl}>Total OS</Text><Text style={[styles.val, { color: colors.brandPrimary, fontSize: 22 }]}>{BRL(total)}</Text>
        </Card>

        {!!err && <Text style={{ color: colors.error }}>{err}</Text>}
        <Button testID="os-save" label={saving ? "Salvando..." : "Criar OS"} onPress={save} disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  sec: { color: colors.brandPrimary, marginTop: spacing.md, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  lbl: { color: colors.muted, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 6 },
  val: { color: colors.onSurface, fontWeight: "800", marginTop: 2 },
});
