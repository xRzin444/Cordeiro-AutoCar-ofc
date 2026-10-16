import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { colors } from "@/src/theme";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18, color: focused ? colors.brandPrimary : colors.muted }}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
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
  );
}
