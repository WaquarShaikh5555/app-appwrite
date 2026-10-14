import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppwriteException } from "appwrite";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { ListRow } from "@/components/ui/ListRow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  IconBolt,
  IconChevronRight,
  IconCloud,
  IconGear,
  IconInfo,
  IconLogOut,
  IconSparkle,
  IconUser,
} from "@/components/icons";
import { client, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_PROJECT_NAME } from "@/constants/appwrite";
import { TOOLS_IN_WORK } from "@/constants/roadmap";
import { useAuth } from "@/context/auth";
import { useOnboarding } from "@/context/onboarding";
import { useEntrance } from "@/hooks/useEntrance";
import { colors, fonts, space, type } from "@/theme/tokens";

type PingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; ms: number }
  | { status: "error"; message: string; code?: number };

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { replay } = useOnboarding();
  const [ping, setPing] = useState<PingState>({ status: "idle" });

  const account = useEntrance(60);
  const connection = useEntrance(180);
  const roadmapAnim = useEntrance(300);
  const appAnim = useEntrance(420);

  const testConnection = useCallback(async () => {
    setPing({ status: "loading" });
    const started = Date.now();
    try {
      await client.ping();
      setPing({ status: "ok", ms: Date.now() - started });
    } catch (err) {
      setPing({
        status: "error",
        message:
          err instanceof AppwriteException
            ? err.message
            : err instanceof Error
              ? err.message
              : "Unknown error",
        code: err instanceof AppwriteException ? err.code : undefined,
      });
    }
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <Animated.View style={[styles.header, account]}>
            <Text style={type.overline}>Control room</Text>
            <Text style={type.display}>Settings</Text>
            <Text style={type.body}>
              Your account, app health, and every new tool we ship.
            </Text>
          </Animated.View>

          {/* ── Account ──────────────────────────────────────────────── */}
          <Animated.View style={[styles.section, account]}>
            <SectionHeading
              overline="Account"
              title={user ? "Signed in" : "Not signed in"}
            />
            <GlassCard>
              {user ? (
                <>
                  <ListRow
                    icon={<IconUser size={18} color={colors.accent} />}
                    title={user.name || "Eternalz member"}
                    subtitle={user.email}
                    onPress={() => router.push("/account")}
                    right={<IconChevronRight size={18} color={colors.textDim} />}
                  />
                  <ListRow
                    icon={<IconLogOut size={18} color={colors.danger} />}
                    title="Log out"
                    subtitle="End this session on this device"
                    danger
                    last
                    onPress={async () => {
                      await signOut();
                    }}
                  />
                </>
              ) : (
                <View style={styles.stack}>
                  <Text style={type.body}>
                    Sign in to sync your tools and keep your data with you on
                    every device.
                  </Text>
                  <View style={styles.actions}>
                    <Button
                      text="Create account"
                      onPress={() => router.push("/signup")}
                      style={styles.flex}
                    />
                    <Button
                      text="Log in"
                      variant="ghost"
                      onPress={() => router.push("/login")}
                      style={styles.flex}
                    />
                  </View>
                </View>
              )}
            </GlassCard>
          </Animated.View>

          {/* ── Connection ───────────────────────────────────────────── */}
          <Animated.View style={[styles.section, connection]}>
            <SectionHeading
              overline="App health"
              title="Appwrite connection"
              right={
                ping.status === "loading" ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : ping.status === "ok" ? (
                  <Chip label={`Pong · ${ping.ms} ms`} tone="success" />
                ) : ping.status === "error" ? (
                  <Chip
                    label={ping.code ? `Error ${ping.code}` : "Unreachable"}
                    tone="danger"
                  />
                ) : (
                  <Chip label="Not tested" tone="muted" />
                )
              }
            />
            <GlassCard>
              <ListRow
                icon={<IconCloud size={18} color={colors.accent} />}
                title="Endpoint"
                subtitle={APPWRITE_ENDPOINT}
              />
              <ListRow
                icon={<IconGear size={18} color={colors.accent} />}
                title="Project"
                subtitle={`${APPWRITE_PROJECT_NAME} · ${APPWRITE_PROJECT_ID}`}
              />
              <ListRow
                icon={<IconBolt size={18} color={colors.accent} />}
                title="Region"
                subtitle="tor — Toronto, Canada"
                last
              />

              {ping.status === "error" ? (
                <View style={styles.pingError}>
                  <Text style={styles.pingErrorText}>{ping.message}</Text>
                  <Text style={[type.caption, styles.pingHint]}>
                    On the web build, add this site as a Web platform in the
                    Appwrite console. If the origin isn&apos;t allowed, the
                    browser blocks the request.
                  </Text>
                </View>
              ) : null}

              <View style={styles.pingAction}>
                <Button
                  text="Test connection"
                  variant="subtle"
                  loading={ping.status === "loading"}
                  onPress={testConnection}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* ── Roadmap ──────────────────────────────────────────────── */}
          <Animated.View style={[styles.section, roadmapAnim]}>
            <SectionHeading
              overline="What's next"
              title="New tools, announced here"
              right={<Chip label={`${TOOLS_IN_WORK} in the works`} tone="accent" />}
            />
            <GlassCard>
              <ListRow
                icon={<IconSparkle size={18} color={colors.accent} />}
                title="Tool roadmap"
                subtitle="Every upcoming tool, with what it will do"
                onPress={() => router.push("/tools")}
                right={<IconChevronRight size={18} color={colors.textDim} />}
                last
              />
            </GlassCard>
          </Animated.View>

          {/* ── App ──────────────────────────────────────────────────── */}
          <Animated.View style={[styles.section, appAnim]}>
            <SectionHeading overline="App" title="About & preferences" />
            <GlassCard>
              <ListRow
                icon={<IconInfo size={18} color={colors.accent} />}
                title="About Eternalz"
                subtitle="Version, credits and links"
                onPress={() => router.push("/about")}
                right={<IconChevronRight size={18} color={colors.textDim} />}
              />
              <ListRow
                icon={<IconSparkle size={18} color={colors.accent} />}
                title="Replay the intro tour"
                subtitle="See the welcome screens again"
                last
                onPress={async () => {
                  await replay();
                  router.replace("/onboarding");
                }}
              />
            </GlassCard>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={type.caption}>
              Designed & built by Waquar Shaikh
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 560,
    gap: space.xl,
  },
  header: {
    gap: space.xs,
    paddingTop: space.xl,
  },
  section: {
    gap: space.md,
  },
  stack: {
    gap: space.lg,
  },
  actions: {
    flexDirection: "row",
    gap: space.md,
  },
  flex: {
    flex: 1,
  },
  pingAction: {
    marginTop: space.md,
  },
  pingError: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: 12,
    backgroundColor: "rgba(248,113,113,0.10)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.28)",
    gap: space.xs,
  },
  pingErrorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.danger,
  },
  pingHint: {
    color: colors.textMuted,
  },
  footer: {
    alignItems: "center",
    paddingTop: space.sm,
  },
});
