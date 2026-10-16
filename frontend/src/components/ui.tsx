import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { colors, spacing, radius, statusColor } from "../theme";

export function Screen({ children, style }: any) {
  return <View style={[s.screen, style]}>{children}</View>;
}

export function Card({ children, style, testID }: any) {
  return <View testID={testID} style={[s.card, style]}>{children}</View>;
}

export function Button({ label, onPress, variant = "primary", disabled, testID, style }: {
  label: string; onPress: () => void; variant?: "primary"|"ghost"|"danger"; disabled?: boolean; testID?: string; style?: any;
}) {
  const bg = variant === "primary" ? colors.brandPrimary : variant === "danger" ? colors.error : "transparent";
  const bd = variant === "ghost" ? colors.border : bg;
  const fg = variant === "ghost" ? colors.onSurface : colors.onBrand;
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: bd, opacity: disabled || pressed ? 0.7 : 1 }, style]}>
      <Text style={[s.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusChip({ status, label }: { status: string; label: string }) {
  const bg = statusColor(status);
  return (
    <View style={[s.chip, { backgroundColor: bg + "22", borderColor: bg }]}>
      <Text style={[s.chipText, { color: bg }]}>{label}</Text>
    </View>
  );
}

export function Loading() {
  return <View style={{ padding: spacing.xl, alignItems: "center" }}><ActivityIndicator color={colors.brandPrimary} /></View>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ padding: spacing.xl, alignItems: "center", gap: spacing.sm }}>
      <Text style={{ color: colors.onSurface, fontSize: 16, fontWeight: "700" }}>{title}</Text>
      {!!hint && <Text style={{ color: colors.muted, textAlign: "center" }}>{hint}</Text>}
    </View>
  );
}

export function Field({ label, children }: any) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</Text>
      {children}
    </View>
  );
}

export const inputStyle = {
  backgroundColor: colors.surfaceTertiary,
  color: colors.onSurface,
  borderRadius: radius.md,
  paddingHorizontal: spacing.md,
  paddingVertical: 12,
  borderWidth: 1,
  borderColor: colors.border,
  fontSize: 15,
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  btn: { minHeight: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.lg, borderWidth: 1 },
  btnText: { fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1, alignSelf: "flex-start" },
  chipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
});
