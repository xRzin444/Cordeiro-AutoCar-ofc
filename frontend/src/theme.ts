import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#050505",
  onSurface: "#FFFFFF",
  surfaceSecondary: "#1A1A1A",
  onSurfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#2C2C2C",
  onSurfaceTertiary: "#FFFFFF",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#000000",
  muted: "#9E9E9E",

  brand: "#E53935",
  onBrand: "#FFFFFF",
  brandPrimary: "#D32F2F",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#B71C1C",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#3E1818",
  onBrandTertiary: "#FFCDD2",

  success: "#4CAF50",
  onSuccess: "#FFFFFF",
  warning: "#FFC107",
  onWarning: "#000000",
  error: "#F44336",
  onError: "#FFFFFF",
  info: "#2196F3",
  onInfo: "#FFFFFF",

  border: "#333333",
  borderStrong: "#4A4A4A",
  divider: "#222222",

  statusOrcamento: "#FF9800",
  statusEmExecucao: "#2196F3",
  statusConcluida: "#4CAF50",
  statusCancelada: "#F44336",
  statusAguardando: "#9E9E9E",
  statusEntregue: "#8BC34A",
};

export type ThemeColors = typeof dark;
export const defaultScheme = "dark" satisfies ColorScheme;
export const themes: { light?: ThemeColors; dark: ThemeColors } = { dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = (system && (themes as any)[system]) ? (system as ColorScheme) : defaultScheme;
  return { scheme, colors: (themes as any)[scheme] ?? themes.dark };
}

export const colors = dark;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export function statusColor(status: string): string {
  switch (status) {
    case "orcamento": return dark.statusOrcamento;
    case "em_execucao": return dark.statusEmExecucao;
    case "concluida": return dark.statusConcluida;
    case "cancelada": return dark.statusCancelada;
    case "entregue": return dark.statusEntregue;
    case "aguardando_aprovacao":
    case "aguardando_pecas":
    case "aguardando_inicio":
    case "aguardando_retirada":
    default: return dark.statusAguardando;
  }
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
