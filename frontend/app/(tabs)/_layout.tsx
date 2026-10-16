import { Tabs, usePathname, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, radius, spacing } from "@/src/theme";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18, color: focused ? colors.brandPrimary : colors.muted }}>{label}</Text>
    </View>
  );
}

const navigationItems = [
  { label: "Visão geral", icon: "◈", href: "/", match: "/" },
  { label: "Ordens de serviço", icon: "▤", href: "/os", match: "/os" },
  { label: "Caixa", icon: "$", href: "/caixa", match: "/caixa" },
  { label: "Mais opções", icon: "⋯", href: "/mais", match: "/mais" },
] as const;

function DesktopSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarBrand}>
        <Image
          source={require("@/assets/images/cordeiro-logo.png")}
          contentFit="contain"
          style={styles.sidebarLogo}
          accessibilityLabel="Cordeiro AutoCar"
        />
      </View>

      <Text style={styles.sidebarSection}>MENU PRINCIPAL</Text>
      <View style={styles.sidebarItems}>
        {navigationItems.map((item) => {
          const focused = pathname === item.match;
          return (
            <Pressable
              key={item.href}
              onPress={() => router.navigate(item.href)}
              style={({ pressed }) => [
                styles.sidebarItem,
                focused && styles.sidebarItemFocused,
                pressed && styles.sidebarItemPressed,
              ]}
            >
              <Text style={[styles.sidebarIcon, focused && styles.sidebarTextFocused]}>{item.icon}</Text>
              <Text style={[styles.sidebarLabel, focused && styles.sidebarTextFocused]}>{item.label}</Text>
              {focused && <View style={styles.sidebarActiveMark} />}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sidebarFooter}>
        <View style={styles.sidebarStatusDot} />
        <View>
          <Text style={styles.sidebarFooterTitle}>SISTEMA OPERACIONAL</Text>
          <Text style={styles.sidebarFooterText}>Acesso administrativo</Text>
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const desktop = Platform.OS === "web" && width >= 1024;

  return (
    <View style={[styles.layout, desktop && styles.layoutDesktop]}>
      {desktop && <DesktopSidebar pathname={pathname} />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: desktop
            ? { display: "none" }
            : {
                backgroundColor: colors.surfaceSecondary,
                borderTopColor: colors.border,
                borderTopWidth: 1,
              },
          tabBarActiveTintColor: colors.brandPrimary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "INÍCIO", tabBarIcon: ({ focused }) => <TabIcon label="◉" focused={focused} /> }} />
        <Tabs.Screen name="os" options={{ title: "OS", tabBarIcon: ({ focused }) => <TabIcon label="▤" focused={focused} /> }} />
        <Tabs.Screen name="caixa" options={{ title: "CAIXA", tabBarIcon: ({ focused }) => <TabIcon label="$" focused={focused} /> }} />
        <Tabs.Screen name="mais" options={{ title: "MAIS", tabBarIcon: ({ focused }) => <TabIcon label="⋯" focused={focused} /> }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, backgroundColor: colors.surface },
  layoutDesktop: { flexDirection: "row" },
  sidebar: {
    width: 260,
    flexShrink: 0,
    backgroundColor: "#101112",
    borderRightWidth: 1,
    borderRightColor: `${colors.border}99`,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sidebarBrand: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}99`,
    marginBottom: spacing.lg,
  },
  sidebarLogo: { width: 206, height: 66 },
  sidebarSection: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  sidebarItems: { gap: 5 },
  sidebarItem: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  sidebarItemFocused: {
    backgroundColor: `${colors.brandPrimary}1A`,
    borderWidth: 1,
    borderColor: `${colors.brandPrimary}44`,
  },
  sidebarItemPressed: { opacity: 0.75 },
  sidebarIcon: { width: 20, color: colors.muted, fontSize: 17, fontWeight: "800", textAlign: "center" },
  sidebarLabel: { flex: 1, color: colors.muted, fontSize: 12, fontWeight: "700" },
  sidebarTextFocused: { color: colors.brandPrimary },
  sidebarActiveMark: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brandPrimary,
  },
  sidebarFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: "auto",
    borderTopWidth: 1,
    borderTopColor: `${colors.border}99`,
    paddingTop: spacing.md,
  },
  sidebarStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  sidebarFooterTitle: { color: colors.onSurface, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  sidebarFooterText: { color: colors.muted, fontSize: 10, marginTop: 3 },
});
