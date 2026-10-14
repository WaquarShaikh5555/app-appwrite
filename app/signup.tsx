import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";
import { errorMessage, useAuth } from "@/context/auth";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    if (password.length < 8) {
      setError("Appwrite requires a password of at least 8 characters.");
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
    <Screen title="Sign up" subtitle="Create your Eternalz account.">
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
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button text={busy ? "Creating account…" : "Create account"} onPress={submit} />
      <TouchableOpacity onPress={() => router.replace("/login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
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
