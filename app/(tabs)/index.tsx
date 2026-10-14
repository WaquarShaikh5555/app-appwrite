import { useMemo } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, useRouter } from "expo-router";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconChevronRight, IconSparkle } from "@/components/icons";
import { useAuth } from "@/context/auth";
import { useOnboarding } from "@/context/onboarding";
import { ROADMAP, TOOLS_IN_WORK } from "@/constants/roadmap";
import { useEntrance, usePulse } from "@/hooks/useEntrance";
import { colors, fonts, glow, radius, space, type } from "@/theme/tokens";

const APP_VERSION = "0.1.0";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { seen, loading: onboardingLoading } = useOnboarding();

  const hero = useEntrance(60);
  const stats = useEntrance(180);
  const roadmapAnim = useEntrance(300);
  const accountAnim = useEntrance(420);
  const breathe = usePulse(4200);

  const featured = useMemo(
    () => ROADMAP.filter((tool) => tool.featured).slice(0, 3),
    [],
  );

  // First run: show the intro tour before anything else.
  if (onboardingLoading) return <View style={styles.blank} />;
  if (!seen) return <Redirect href="/onboarding" />;

  const liveCount = 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          {/* ── Masthead ─────────────────────────────────────────────── */}
          <Animated.View style={[styles.masthead, hero]}>
            <Animated.View
              style={[
                styles.markGlow,
                {
                  opacity: breathe.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.55, 0.95],
                  }),
                  transform: [
                    {
                      scale: breathe.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.06],
                      }),
                    },
                  ],
                },
              ]}
            >
              <BrandMark size={82} />
            </Animated.View>
            <Text style={styles.wordmark}>ETERNALZ</Text>
            <Text style={styles.tagline}>
              Personal toolkit · built by Waquar Shaikh
            </Text>
          </Animated.View>

          {/* ── Hero card ────────────────────────────────────────────── */}
          <Animated.View style={hero}>
            <GlassCard emphasis>
              <View style={styles.heroTop}>
                <Chip
                  label="Live · connected to Appwrite"
                  tone="success"
                  icon={<View style={styles.liveDot} />}
                />
              </View>
              <Text style={styles.heroTitle}>
                {user ? `Welcome back, ${user.name || "friend"}` : "Welcome to Eternalz"}
              </Text>
              <Text style={[type.body, styles.heroBody]}>
                A calm, dark home for the tools you actually use. Everything here
                runs on Eternalz's own Appwrite backend — our tools, our project, no third parties.
              </Text>
            </GlassCard>
          </Animated.View>

          {/* ── Stats ────────────────────────────────────────────────── */}
          <Animated.View style={[styles.statsRow, stats]}>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{liveCount}</Text>
              <Text style={type.caption}>Tools live</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{TOOLS_IN_WORK}</Text>
              <Text style={type.caption}>In the works</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statValue, styles.statValueAccent]}>
                {user ? "Signed in" : "Guest"}
              </Text>
              <Text style={type.caption}>Account</Text>
            </GlassCard>
          </Animated.View>

          {/* ── Roadmap ──────────────────────────────────────────────── */}
          <Animated.View style={[styles.section, roadmapAnim]}>
            <SectionHeading
              overline="Next up"
              title="Useful tools, yet to come"
              right={
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/tools")}
                >
                  <Text style={styles.link}>See all</Text>
                </Pressable>
              }
            />
            <View style={styles.toolList}>
              {featured.map((tool) => (
                <Pressable
                  key={tool.id}
                  accessibilityRole="button"
                  onPress={() => router.push("/tools")}
                >
                  <GlassCard style={styles.toolCard}>
                    <View style={styles.toolRow}>
                      <View style={styles.toolIcon}>
                        <tool.icon size={20} color={colors.accent} />
                      </View>
                      <View style={styles.toolText}>
                        <Text style={type.bodyStrong}>{tool.name}</Text>
                        <Text style={type.caption} numberOfLines={2}>
                          {tool.description}
                        </Text>
                      </View>
                      <IconChevronRight size={18} color={colors.textDim} />
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </Animated.View>

          {/* ── Account ──────────────────────────────────────────────── */}
          <Animated.View style={[styles.section, accountAnim]}>
            <SectionHeading overline="Account" title="Your profile" />
            <GlassCard>
              {user ? (
                <>
                  <Text style={type.bodyStrong}>{user.name || "Signed in"}</Text>
                  <Text style={[type.caption, styles.spaced]}>{user.email}</Text>
                  <View style={styles.actions}>
                    <Button
                      text="Account details"
                      variant="subtle"
                      onPress={() => router.push("/account")}
                      style={styles.flex}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={type.body}>
                    Create an account to keep your tools and data in sync across
                    devices.
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
                </>
              )}
            </GlassCard>
          </Animated.View>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <Animated.View style={[styles.footer, accountAnim]}>
            <IconSparkle size={14} color={colors.textDim} />
            <Text style={type.caption}>
              Eternalz v{APP_VERSION} · crafted with Appwrite & Expo
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  blank: { flex: 1 },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 560,
    gap: space.lg,
  },
  masthead: {
    alignItems: "center",
    gap: space.sm,
    paddingTop: space.xl,
    paddingBottom: space.sm,
  },
  markGlow: {
    borderRadius: radius.xl,
    ...glow.primary,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: 7,
    color: colors.text,
    ...Platform.select({
      web: { textShadow: "0 0 18px rgba(139,92,246,0.75)" },
      default: {
        textShadowColor: "rgba(139,92,246,0.75)",
        textShadowRadius: 18,
      },
    }),
  },
  tagline: {
    ...type.caption,
    letterSpacing: 0.3,
  },
  heroTop: {
    flexDirection: "row",
    marginBottom: space.md,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  heroTitle: {
    ...type.h1,
    marginBottom: space.sm - 2,
  },
  heroBody: {
    maxWidth: 460,
  },
  statsRow: {
    flexDirection: "row",
    gap: space.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    gap: 2,
    alignItems: "center",
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  statValueAccent: {
    fontSize: 15,
    color: colors.accent,
  },
  section: {
    gap: space.md,
  },
  toolList: {
    gap: space.md,
  },
  toolCard: {
    paddingVertical: space.sm + 4,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolText: {
    flex: 1,
    gap: 2,
  },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
  spaced: {
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.lg,
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingTop: space.lg,
  },
});
