import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { login } from "@/src/api/client";
import { colors, radius, spacing } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pinInput = useRef<TextInput>(null);
  const [pin, setPin] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    if (!/^\d{4}$/.test(pin) || loading) return;

    setErro(null);
    setLoading(true);
    try {
      await login(pin);
      router.replace("/(tabs)");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
      setPin("");
      pinInput.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#101319", "#0B0E14", "#101319"]}
        locations={[0, 0.52, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.ambientGlow, { pointerEvents: "none" }]} />
      <View style={[styles.topRule, { pointerEvents: "none" }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.content}>
            <View style={styles.statusLine}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>SISTEMA OPERACIONAL</Text>
              <View style={styles.statusDivider} />
              <Text style={styles.statusCode}>ACESSO RESTRITO</Text>
            </View>

            <View style={styles.brandSection}>
              <View style={styles.logoFrame}>
                <Image
                  source={require("../assets/images/cordeiro-logo.png")}
                  contentFit="contain"
                  accessibilityLabel="Logo Cordeiro AutoCar"
                  style={styles.logo}
                />
              </View>
              <View style={styles.brandRule} />
              <Text style={styles.brandCaption}>CENTRO DE OPERAÇÕES DA OFICINA</Text>
            </View>

            <View style={styles.loginCard}>
              <View style={styles.cardAccent} />
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Text style={styles.cardIconText}>↗</Text>
                </View>
                <View style={styles.cardTitleGroup}>
                  <Text style={styles.eyebrow}>AUTENTICAÇÃO DE ACESSO</Text>
                  <Text style={styles.title}>Bem-vindo de volta</Text>
                  <Text style={styles.subtitle}>Entre com seu PIN de administrador.</Text>
                </View>
              </View>

              <View style={[styles.pinPanel, focused && styles.pinPanelFocused]}>
                <View style={styles.pinLabelRow}>
                  <Text style={styles.pinLabel}>PIN DE ACESSO</Text>
                  <Text style={styles.pinLength}>{pin.length}/4</Text>
                </View>
                <View style={styles.pinIndicators} pointerEvents="none">
                  {[0, 1, 2, 3].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.pinIndicator,
                        index < pin.length && styles.pinIndicatorFilled,
                        focused && index === pin.length && styles.pinIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
                <TextInput
                  ref={pinInput}
                  testID="login-pin-input"
                  accessibilityLabel="PIN de acesso, quatro dígitos"
                  value={pin}
                  onChangeText={(value) => {
                    setErro(null);
                    setPin(value.replace(/\D/g, "").slice(0, 4));
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onSubmitEditing={entrar}
                  placeholder="Digite os 4 dígitos"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  secureTextEntry
                  maxLength={4}
                  autoComplete="off"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="done"
                  style={styles.pinInput}
                />
              </View>

              {!!erro && (
                <View accessibilityRole="alert" style={styles.errorBox}>
                  <Text style={styles.errorMark}>!</Text>
                  <Text testID="login-error" style={styles.errorText}>
                    {erro}
                  </Text>
                </View>
              )}

              <Pressable
                testID="login-submit-button"
                accessibilityRole="button"
                accessibilityState={{ disabled: loading || pin.length !== 4 }}
                onPress={entrar}
                disabled={loading || pin.length !== 4}
                style={({ pressed }) => [
                  styles.submitButton,
                  (loading || pin.length !== 4) && styles.submitButtonDisabled,
                  pressed && styles.submitButtonPressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onBrandPrimary} />
                ) : (
                  <>
                    <Text style={styles.submitText}>Acessar painel</Text>
                    <Text style={styles.submitArrow}>→</Text>
                  </>
                )}
              </Pressable>

              <View style={styles.securityNote}>
                <Text style={styles.securityIcon}>◇</Text>
                <Text style={styles.securityText}>Acesso protegido · Somente equipe autorizada</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>CORDEIRO AUTO CENTER</Text>
              <View style={styles.footerDot} />
              <Text style={styles.footerText}>GESTÃO INTELIGENTE</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, overflow: "hidden" },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  ambientGlow: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    top: "5%",
    alignSelf: "center",
    backgroundColor: "rgba(229, 57, 53, 0.045)",
    transform: [{ scaleX: 1.4 }],
  },
  topRule: {
    position: "absolute",
    left: "10%",
    right: "10%",
    top: 0,
    height: 1,
    backgroundColor: "rgba(255, 84, 76, 0.35)",
  },
  content: { width: "100%", maxWidth: 440, alignSelf: "center" },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.xl,
  },
  statusDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.success },
  statusText: { color: colors.success, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  statusDivider: { width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 4 },
  statusCode: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  brandSection: { alignItems: "center", marginBottom: spacing.xl },
  logoFrame: {
    width: "100%",
    height: 124,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(171, 137, 133, 0.18)",
    backgroundColor: "rgba(11, 14, 20, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  logo: { width: "100%", height: "100%" },
  brandRule: { width: 42, height: 2, backgroundColor: colors.brandPrimary, marginTop: spacing.md },
  brandCaption: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginTop: spacing.sm,
  },
  loginCard: {
    overflow: "hidden",
    backgroundColor: "#14171D",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: spacing.lg,
    width: 52,
    height: 2,
    backgroundColor: colors.brandPrimary,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: "rgba(255, 84, 76, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 84, 76, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { color: colors.brandPrimary, fontSize: 22, fontWeight: "800" },
  cardTitleGroup: { flex: 1 },
  eyebrow: { color: colors.brandPrimary, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: colors.onSurface, fontSize: 21, fontWeight: "800", letterSpacing: -0.4, marginTop: 3 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  pinPanel: {
    borderRadius: radius.md,
    backgroundColor: "#0D1016",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pinPanelFocused: { borderColor: "rgba(255, 84, 76, 0.65)" },
  pinLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pinLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  pinLength: { color: colors.muted, fontSize: 10, fontWeight: "700", fontVariant: ["tabular-nums"] },
  pinIndicators: { flexDirection: "row", justifyContent: "center", gap: spacing.md, marginTop: spacing.md },
  pinIndicator: {
    width: 11,
    height: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "transparent",
  },
  pinIndicatorFilled: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  pinIndicatorActive: { borderColor: colors.brandPrimary },
  pinInput: {
    minHeight: 48,
    marginTop: spacing.xs,
    color: colors.onSurface,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.25)",
    backgroundColor: "rgba(255, 180, 171, 0.08)",
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  errorMark: { color: colors.error, fontSize: 14, fontWeight: "900" },
  errorText: { flex: 1, color: colors.error, fontSize: 12 },
  submitButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  submitButtonDisabled: { backgroundColor: "#5C292C" },
  submitButtonPressed: { opacity: 0.82 },
  submitText: { color: colors.onBrandPrimary, fontSize: 14, fontWeight: "900", letterSpacing: 0.2 },
  submitArrow: { color: colors.onBrandPrimary, fontSize: 18, fontWeight: "800" },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.md,
  },
  securityIcon: { color: colors.success, fontSize: 13 },
  securityText: { color: colors.muted, fontSize: 10 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: spacing.xl },
  footerText: { color: "#6F737D", fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  footerDot: { width: 3, height: 3, borderRadius: radius.pill, backgroundColor: colors.brandPrimary },
});
