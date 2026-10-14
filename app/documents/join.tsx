import { useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { IconCloud, IconInfo } from "@/components/icons";
import { useAuth } from "@/context/auth";
import { useEntrance } from "@/hooks/useEntrance";
import { joinGroupWithCode } from "@/services/vault/groups";
import { normalizeJoinCode } from "@/services/vault/format";
import { colors, fonts, space, type } from "@/theme/tokens";

export default function JoinGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entrance = useEntrance(60);

  if (!user) {
    return (
      <Screen title="Join a group" subtitle="Sign in required">
        <Text style={type.body}>
          Sign in first so the group knows who you are — membership is tied to
          your account.
        </Text>
        <Button text="Log in" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  const join = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await joinGroupWithCode(code);
    setBusy(false);

    if (result.ok && result.groupId) {
      router.replace({
        pathname: "/documents/[groupId]",
        params: { groupId: result.groupId },
      });
      return;
    }
    setError(result.message);
  };

  return (
    <Screen title="Join a group" subtitle="Enter the invite code you were given">
      <Animated.View style={[styles.stack, entrance]}>
        <GlassCard emphasis>
          <View style={styles.form}>
            <TextField
              label="Invite code"
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              placeholder="ABCD-EFGH-IJKL-MNPQ"
              autoCapitalize="characters"
              autoCorrect={false}
              hint="Letters and numbers only — dashes and spaces are fine."
              onSubmitEditing={join}
              returnKeyType="go"
              style={styles.codeInput}
            />
          </View>
        </GlassCard>

        {error ? (
          <GlassCard>
            <View style={styles.errorRow}>
              <IconInfo size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </GlassCard>
        ) : null}

        <Button
          text="Join group"
          size="lg"
          loading={busy}
          disabled={normalizeJoinCode(code).length < 6}
          onPress={join}
        />

        <GlassCard>
          <View style={styles.errorRow}>
            <IconCloud size={18} color={colors.accent} />
            <Text style={[type.caption, styles.flex]}>
              The code is checked by a server-side function, which then adds you
              to the group&apos;s Appwrite team. Only that team can see the
              group&apos;s files — the code itself never becomes a file key.
            </Text>
          </View>
          <Text style={[type.caption, styles.setupHint]}>
            Code not working at all? The join service may not be deployed yet —
            run the Setup check from the Document Manager home.
          </Text>
        </GlassCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  form: { gap: space.lg },
  codeInput: {
    fontSize: 20,
    letterSpacing: 3,
    textAlign: "center",
    fontFamily: fonts.heading,
    paddingVertical: 16,
  },
  errorRow: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "flex-start",
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  flex: { flex: 1 },
  setupHint: {
    marginTop: space.md,
    color: colors.textDim,
  },
});
