import { Platform, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { IconGear, IconGrid, IconHome } from "@/components/icons";
import { colors, fonts } from "@/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: styles.label,
        tabBarStyle: [
          styles.bar,
          Platform.OS === "web" ? styles.barWeb : styles.barNative,
        ],
        tabBarBackground:
          Platform.OS === "web"
            ? undefined
            : () => (
                <BlurView
                  intensity={40}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
              ),
        // Let the ambient backdrop show through the scene container.
        sceneStyle: { backgroundColor: "transparent" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <IconHome size={22} color={color} strokeWidth={focused ? 2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: ({ color, focused }) => (
            <IconGrid size={22} color={color} strokeWidth={focused ? 2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <IconGear size={22} color={color} strokeWidth={focused ? 2 : 1.7} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 68,
    paddingTop: 9,
    paddingBottom: 11,
  },
  barWeb: {
    backgroundColor: "rgba(10,8,18,0.97)",
  },
  barNative: {
    backgroundColor: "transparent",
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});
