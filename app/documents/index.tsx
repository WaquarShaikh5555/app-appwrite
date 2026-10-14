import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { AppwriteException } from "appwrite";
import { GlassCard } from "@/components/ui/GlassCard";
import { GroupCard } from "@/components/vault/GroupCard";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  IconChevronLeft,
  IconFolder,
  IconGear,
  IconInfo,
  IconLink,
  IconLock,
  IconOrbit,
  IconPlus,
  IconUsers,
} from "@/components/icons";
import { useAuth } from "@/context/auth";
import { useEntrance } from "@/hooks/useEntrance";
import { listVaultGroups } from "@/services/vault/groups";
import type { VaultGroup } from "@/types/vault";
import { colors, fonts, radius, space, type } from "@/theme/tokens";

export default function DocumentsHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = useState<VaultGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const entrance = useEntrance(60);
  const listAnim = useEntrance(160);

  const load = useCallback(async () => {
    if (!user) {
      setGroups([]);
      return;
    }
    setError(null);
    try {
      setGroups(await listVaultGroups());
    } catch (err) {
      if (err instanceof AppwriteException && err.code === 404) {
        setError(
          "The vault tables don't exist in the Appwrite project yet. Open " +
            "Setup check for the exact fix.",
        );
      } else {
        setError(err instanceof Error ? err.message : "Could not load your groups.");
      }
      setGroups([]);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh whenever the screen regains focus (after uploads, joins, edits).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /**
   * This screen sits outside the tab navigator, so it owns its own escape
   * route. Without this there is no tab bar and no back control — and in an
   * embedded preview, no browser back button either.
   */
  const exit = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/tools");
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* ── Always-available toolbar ──────────────────────────────────── */}
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Tools"
          onPress={exit}
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
        >
          <IconChevronLeft size={20} color={colors.text} />
        </Pressable>

        <View style={styles.toolbarText}>
          <Text style={type.title} numberOfLines={1}>
            Document Manager
          </Text>
          <Text style={styles.toolbarMeta} numberOfLines={1}>
            {user ? "Invite-only vaults" : "Signed out"}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Setup check"
          onPress={() => router.push("/documents/setup")}
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
        >
          <IconGear size={19} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primaryBright}
          />
        }
      >
        <View style={styles.column}>
          <Animated.View style={[styles.header, entrance]}>
            <View style={styles.headerMark}>
              <IconOrbit size={15} color={colors.ion} />
              <Text style={type.overline}>Private vaults</Text>
            </View>
            <Text style={type.display}>Shared folders, nobody else&apos;s business</Text>
            <Text style={[type.body, styles.headerBody]}>
              Every group is a room with its own key. Access is decided by Appwrite
              on the server — not by what this screen chooses to show you.
            </Text>
          </Animated.View>

          {!user ? (
            <Animated.View style={entrance}>
              <GlassCard emphasis>
                <Text style={type.bodyStrong}>Sign in to open your vaults</Text>
                <Text style={[type.body, styles.spaced]}>
                  Files belong to groups, groups belong to your account, and
                  Appwrite decides who may read what.
                </Text>
                <View style={styles.actions}>
                  <Button
                    text="Log in"
                    onPress={() => router.push("/login")}
                    style={styles.flex}
                  />
                  <Button
                    text="Create account"
                    variant="ghost"
                    onPress={() => router.push("/signup")}
                    style={styles.flex}
                  />
                </View>
              </GlassCard>
            </Animated.View>
          ) : (
            <>
              <Animated.View style={[styles.actions, entrance]}>
                <Button
                  text="New group"
                  icon={<IconPlus size={18} color={colors.text} />}
                  onPress={() => router.push("/documents/new")}
                  style={styles.flex}
                />
                <Button
                  text="Join with code"
                  variant="ghost"
                  icon={<IconLink size={18} color={colors.text} />}
                  onPress={() => router.push("/documents/join")}
                  style={styles.flex}
                />
              </Animated.View>

              {error ? (
                <GlassCard>
                  <View style={styles.row}>
                    <IconInfo size={18} color={colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                  <Button
                    text="Open Setup check"
                    variant="subtle"
                    onPress={() => router.push("/documents/setup")}
                    style={styles.errorAction}
                  />
                </GlassCard>
              ) : null}

              <Animated.View style={[styles.section, listAnim]}>
                <View style={styles.sectionHead}>
                  <Text style={type.overline}>Your groups</Text>
                  {groups && groups.length > 0 ? (
                    <Chip label={`${groups.length}`} tone="muted" />
                  ) : null}
                </View>

                {groups === null ? (
                  <GlassCard>
                    <Text style={type.body}>Loading your groups…</Text>
                  </GlassCard>
                ) : groups.length === 0 ? (
                  <GlassCard>
                    <View style={styles.empty}>
                      <View style={styles.emptyIcon}>
                        <IconFolder size={24} color={colors.accent} />
                      </View>
                      <Text style={[type.h2, styles.center]}>No groups yet</Text>
                      <Text style={[type.body, styles.center]}>
                        Start one for your family, or join an existing group with
                        the invite code somebody shared with you.
                      </Text>
                    </View>
                  </GlassCard>
                ) : (
                  <View style={styles.list}>
                    {groups.map((group) => (
                      <GroupCard
                        key={group.$id}
                        group={group}
                        onPress={() =>
                          router.push({
                            pathname: "/documents/[groupId]",
                            params: { groupId: group.$id },
                          })
                        }
                      />
                    ))}
                  </View>
                )}
              </Animated.View>
            </>
          )}

          {/* Security model, as a spec sheet rather than three paragraphs */}
          <Animated.View style={[styles.section, listAnim]}>
            <Text style={type.overline}>How your files stay private</Text>
            <GlassCard>
              <SpecRow
                index="01"
                icon={<IconLock size={17} color={colors.accent} />}
                title="Access is server-enforced"
                body="Files carry a team permission. Appwrite rejects anyone outside the group, even with the file id."
                last={false}
              />
              <SpecRow
                index="02"
                icon={<IconUsers size={17} color={colors.accent} />}
                title="Invite codes, not stored passwords"
                body="Salted SHA-256, verified server-side. A code gets you in; it never grants read access on its own."
                last={false}
              />
              <SpecRow
                index="03"
                icon={<IconOrbit size={17} color={colors.ion} />}
                title="Editing happens on your device"
                body="Photo and PDF tools run locally. Only the file you save is ever uploaded."
                last
              />
              <Button
                text="Setup check & security details"
                variant="subtle"
                onPress={() => router.push("/documents/setup")}
                style={styles.setupButton}
              />
            </GlassCard>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SpecRow({
  index,
  icon,
  title,
  body,
  last,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  last: boolean;
}) {
  return (
    <View style={[styles.spec, !last && styles.specDivider]}>
      <Text style={styles.specIndex}>{index}</Text>
      <View style={styles.specText}>
        <View style={styles.specTitleRow}>
          {icon}
          <Text style={[type.bodyStrong, styles.specTitle]}>{title}</Text>
        </View>
        <Text style={type.caption}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarText: {
    flex: 1,
    gap: 1,
  },
  toolbarMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textDim,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconPressed: {
    backgroundColor: colors.surfaceStrong,
  },

  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 620,
    gap: space.lg,
  },
  header: {
    gap: space.sm,
    paddingTop: space.xl,
  },
  headerMark: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  headerBody: {
    maxWidth: 520,
  },
  actions: {
    flexDirection: "row",
    gap: space.md,
  },
  flex: { flex: 1 },
  spaced: { marginTop: space.sm },
  section: {
    gap: space.md,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  list: { gap: space.md },
  empty: {
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.borderAccent,
    marginBottom: space.sm,
  },
  center: {
    textAlign: "center",
    maxWidth: 420,
  },
  row: {
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
  errorAction: { marginTop: space.md },

  spec: {
    flexDirection: "row",
    gap: space.lg,
    paddingVertical: space.lg,
  },
  specDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specIndex: {
    fontFamily: fonts.display,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.ion,
    paddingTop: 3,
  },
  specText: {
    flex: 1,
    gap: 3,
  },
  specTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  specTitle: { flex: 1 },
  setupButton: { marginTop: space.md },
});
