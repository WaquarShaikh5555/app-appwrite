import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { errorMessage, useAuth } from "@/context/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
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
    <Screen title="Log in" subtitle="Sign in to your Eternalz account.">
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
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button text={busy ? "Logging in…" : "Log in"} onPress={submit} />
      <TouchableOpacity onPress={() => router.replace("/signup")}>
        <Text style={styles.link}>No account yet? Sign up</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: "#D92D20",
    fontSize: 13,
  },
  link: {
    color: "#FD366E",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 4,
  },
});
