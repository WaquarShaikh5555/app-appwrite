import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { errorMessage, useAuth } from "@/context/auth";
import { useEntrance } from "@/hooks/useEntrance";
import { Animated } from "react-native";
import { colors, fonts, space, type } from "@/theme/tokens";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entrance = useEntrance(60);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Log in" subtitle="Welcome back" back contentStyle={styles.column}>
      <Animated.View style={[styles.stack, entrance]}>
        <View style={styles.markWrap}>
          <BrandMark size={64} />
        </View>

        <GlassCard>
          <View style={styles.form}>
            <TextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              textContentType="password"
              onSubmitEditing={submit}
              returnKeyType="go"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              text="Log in"
              onPress={submit}
              loading={busy}
              size="lg"
            />
          </View>
        </GlassCard>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/signup")}
        >
          <Text style={styles.link}>No account yet? Create one</Text>
        </TouchableOpacity>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  column: {
    paddingTop: space.xl,
  },
  stack: {
    gap: space.lg,
  },
  markWrap: {
    alignItems: "center",
    marginBottom: space.xs,
  },
  form: {
    gap: space.lg,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  link: {
    ...type.body,
    color: colors.accent,
    textAlign: "center",
    paddingVertical: space.sm,
  },
});
