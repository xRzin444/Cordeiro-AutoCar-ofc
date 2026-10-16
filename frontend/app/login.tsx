import { useState } from "react";
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, inputStyle } from "@/src/components/ui";
import { login } from "@/src/api/client";
import { colors, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("admin@cordeiro.com.br");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setErro(null); setLoading(true);
    try {
      await login(email.trim(), senha);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErro(e.message || "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1773137149939-8ea2e16d8e02?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTJ8MHwxfHNlYXJjaHwxfHxjYXIlMjBlbmdpbmUlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3OTE3NTA4Mjd8MA&ixlib=rb-4.1.0&q=85" }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(5,5,5,0.3)", "rgba(5,5,5,0.95)", "#050505"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBox}>
            <Text style={styles.brandCord}>CORDEIRO</Text>
            <Text style={styles.brandAuto}>AutoCar</Text>
            <Text style={styles.tagline}>SOLUÇÕES COMPLETAS PARA O SEU CARRO</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>Acesse o painel da oficina</Text>

            <Text style={styles.label}>E-mail</Text>
            <TextInput
              testID="login-email-input"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={inputStyle}
            />
            <Text style={styles.label}>Senha</Text>
            <TextInput
              testID="login-password-input"
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={inputStyle}
            />
            {!!erro && <Text style={styles.err} testID="login-error">{erro}</Text>}
            <Button testID="login-submit-button" label={loading ? "Entrando..." : "Entrar"} onPress={entrar} disabled={loading} style={{ marginTop: spacing.md }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: "space-between" },
  brandBox: { alignItems: "center", gap: 2, marginTop: 24 },
  brandCord: { color: colors.onSurface, fontSize: 36, fontWeight: "900", letterSpacing: 2 },
  brandAuto: { color: colors.brandPrimary, fontSize: 28, fontWeight: "800", fontStyle: "italic", marginTop: -4 },
  tagline: { color: colors.muted, fontSize: 10, letterSpacing: 2, marginTop: 8 },
  form: { gap: spacing.sm, marginTop: 32 },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, marginBottom: spacing.md },
  label: { color: colors.muted, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginTop: spacing.sm },
  err: { color: colors.error, marginTop: spacing.sm },
});
