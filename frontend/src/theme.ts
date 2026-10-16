import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#101319",
  onSurface: "#E1E2EB",
  surfaceSecondary: "#191C22",
  onSurfaceSecondary: "#E1E2EB",
  surfaceTertiary: "#272A30",
  onSurfaceTertiary: "#E1E2EB",
  surfaceInverse: "#E1E2EB",
  onSurfaceInverse: "#2D3037",
  muted: "#AB8985",

  brand: "#E53935",
  onBrand: "#5C0005",
  brandPrimary: "#FF544C",
  onBrandPrimary: "#5C0005",
  brandSecondary: "#BB171C",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#FF5353",
  onBrandTertiary: "#5C0009",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#101319",
  error: "#FFB4AB",
  onError: "#690005",
  info: "#38BDF8",
  onInfo: "#0B0E14",

  border: "#32353B",
  borderStrong: "#5B403D",
  divider: "#272A30",

  statusOrcamento: "#F59E0B",
  statusEmExecucao: "#38BDF8",
  statusConcluida: "#10B981",
  statusCancelada: "#FFB4AB",
  statusAguardando: "#B9C8DE",
  statusEntregue: "#10B981",
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
