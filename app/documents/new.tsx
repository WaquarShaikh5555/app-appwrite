import { useState } from "react";
import { Animated, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { IconShield, IconSparkle } from "@/components/icons";
import { useAuth } from "@/context/auth";
import { useEntrance } from "@/hooks/useEntrance";
import { createVaultGroup } from "@/services/vault/groups";
import { formatJoinCode } from "@/services/vault/format";
import { colors, fonts, space, type } from "@/theme/tokens";

export default function NewGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ groupId: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const entrance = useEntrance(60);

  if (!user) {
    return (
      <Screen title="New group" subtitle="Sign in required"
      backFallback="/documents">
        <Text style={type.body}>
          Groups belong to your account, so you need to be signed in to create one.
        </Text>
        <Button text="Log in" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { group, code } = await createVaultGroup({
        name,
        description,
        userId: user.$id,
      });
      setCreated({ groupId: group.$id, code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the group.");
    } finally {
      setBusy(false);
    }
  };

  const shareInvite = async () => {
    if (!created) return;
    await Share.share({
      message:
        `You're invited to the “${name.trim()}” folder on Eternalz.\n\n` +
        `Open the app → Tools → Document Manager → Join a group, and enter:\n\n` +
        `${formatJoinCode(created.code)}`,
    }).catch(() => {});
  };

  // ── Code hand-off ────────────────────────────────────────────────────────
  if (created) {
    const formatted = formatJoinCode(created.code);
    return (
      <Screen title="Group created" subtitle={name.trim()}>
        <Animated.View style={[styles.stack, entrance]}>
          <GlassCard emphasis>
            <View style={styles.codeHeader}>
              <IconShield size={20} color={colors.primaryBright} />
              <Text style={type.overline}>Invite code</Text>
            </View>
            <Text selectable style={styles.code}>
              {formatted}
            </Text>
            <Text style={[type.body, styles.codeHint]}>
              Share this with the people you trust. It&apos;s shown{" "}
              <Text style={styles.emphasis}>once</Text> — only its hash is stored,
              so nobody (including us) can read it back. Lost it? Rotate it from
              the group screen.
            </Text>
            <View style={styles.codeActions}>
              <Button
                text={copied ? "Copied" : "Copy code"}
                variant="subtle"
                onPress={async () => {
                  await Clipboard.setStringAsync(formatted);
                  setCopied(true);
                }}
                style={styles.flex}
              />
              <Button text="Share invite" onPress={shareInvite} style={styles.flex} />
            </View>
          </GlassCard>

          <GlassCard>
            <Chip label="How access works" tone="accent" icon={<IconSparkle size={13} color={colors.accent} />} />
            <View style={styles.points}>
              <Text style={type.caption}>
                • Only people who join with this code become members.
              </Text>
              <Text style={type.caption}>
                • Appwrite enforces it server-side: non-members cannot list or
                download a single file, even with the app&apos;s source in hand.
              </Text>
              <Text style={type.caption}>
                • Remove anyone from the group screen and their access ends
                immediately.
              </Text>
            </View>
          </GlassCard>

          <Button
            text="Open the group"
            size="lg"
            onPress={() =>
              router.replace({
                pathname: "/documents/[groupId]",
                params: { groupId: created.groupId },
              })
            }
          />
        </Animated.View>
      </Screen>
    );
  }

  // ── Create form ──────────────────────────────────────────────────────────
  return (
    <Screen title="New group" subtitle="A shared folder for people you trust">
      <Animated.View style={[styles.stack, entrance]}>
        <GlassCard>
          <View style={styles.form}>
            <TextField
              label="Group name"
              value={name}
              onChangeText={setName}
              placeholder="Family documents"
              autoCapitalize="words"
              hint="Something the others will recognise."
            />
            <TextField
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Birth certificates, insurance, ID scans"
            />
          </View>
        </GlassCard>

        <GlassCard>
          <Text style={type.bodyStrong}>Before you create it</Text>
          <View style={styles.points}>
            <Text style={type.caption}>
              A password (invite code) is generated for you. Anyone with the code
              can join, so share it only with the people who should have access.
            </Text>
            <Text style={type.caption}>
              All access is enforced by Appwrite on the server — membership is
              real, not a UI trick.
            </Text>
          </View>
        </GlassCard>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          text="Create group"
          size="lg"
          loading={busy}
          onPress={create}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  form: { gap: space.lg },
  codeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginBottom: space.sm,
  },
  code: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 3,
    color: colors.text,
    textAlign: "center",
    marginVertical: space.sm,
  },
  codeHint: { marginTop: space.sm },
  emphasis: { color: colors.primaryBright, fontFamily: fonts.bodyMedium },
  codeActions: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.lg,
  },
  flex: { flex: 1 },
  points: { gap: space.sm, marginTop: space.sm },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
});
