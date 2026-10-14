import { useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { errorMessage, useAuth } from "@/context/auth";
import { useEntrance } from "@/hooks/useEntrance";
import { colors, fonts, space, type } from "@/theme/tokens";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entrance = useEntrance(60);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError("Enter an email and a password.");
      return;
    }
    if (password.length < 8) {
      setError("Appwrite requires at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signUp(email.trim(), password, name.trim() || email.split("@")[0]);
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Create account" subtitle="Join Eternalz" back contentStyle={styles.column}>
      <Animated.View style={[styles.stack, entrance]}>
        <View style={styles.markWrap}>
          <BrandMark size={64} />
        </View>

        <GlassCard>
          <View style={styles.form}>
            <TextField
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Waquar"
              autoCapitalize="words"
              textContentType="name"
            />
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
              placeholder="At least 8 characters"
              secureTextEntry
              textContentType="newPassword"
              hint="8 characters minimum"
              onSubmitEditing={submit}
              returnKeyType="go"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              text="Create account"
              onPress={submit}
              loading={busy}
              size="lg"
            />
          </View>
        </GlassCard>

        <Text style={styles.fineprint}>
          Your account is created on the Eternalz Appwrite project. We store your
          name, email and session — nothing else.
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.link}>Already have an account? Log in</Text>
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
  fineprint: {
    ...type.caption,
    textAlign: "center",
  },
  link: {
    ...type.body,
    color: colors.accent,
    textAlign: "center",
    paddingVertical: space.sm,
  },
});
