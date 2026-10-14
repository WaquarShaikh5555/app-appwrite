import { useEffect } from "react";
import { Slot } from "expo-router";
import Head from "expo-router/head";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { AuthProvider } from "@/context/auth";
import { OnboardingProvider } from "@/context/onboarding";
import { GlowBackground } from "@/components/ui/GlowBackground";
import { colors } from "@/theme/tokens";

// Keep the native splash up until fonts are ready, so text never reflows.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <GlowBackground />
            {Platform.OS === "web" && (
              <Head>
                <title>Eternalz</title>
                <meta name="theme-color" content="#07060D" />
                <meta
                  name="description"
                  content="Eternalz — a personal toolkit built with Appwrite."
                />
              </Head>
            )}
            <StatusBar style="light" />
            <Slot />
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
