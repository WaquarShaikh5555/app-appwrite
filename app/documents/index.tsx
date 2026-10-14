import { useCallback, useEffect, useState } from "react";
import {
  Animated,
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
  IconFolder,
  IconInfo,
  IconLink,
  IconLock,
  IconPlus,
  IconShield,
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
          "The vault tables don't exist in this Appwrite project yet. Open " +
            "Setup check below for the exact fix.",
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

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.column}>
          <Animated.View style={[styles.header, entrance]}>
            <Text style={type.overline}>Toolbox</Text>
            <Text style={type.display}>Document Manager</Text>
            <Text style={type.body}>
              Private folders for families, teams and friends. Invite-only, and
              enforced by Appwrite on the server — not by this screen.
            </Text>
          </Animated.View>

          {!user ? (
            <Animated.View style={entrance}>
              <GlassCard emphasis>
                <Text style={type.bodyStrong}>Sign in to use the vault</Text>
                <Text style={[type.body, styles.spaced]}>
                  Files belong to groups, groups belong to your account, and
                  Appwrite decides who may read what. Sign in to continue.
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
                  <View style={styles.errorRow}>
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
                        <IconFolder size={26} color={colors.accent} />
                      </View>
                      <Text style={[type.h2, styles.center]}>No groups yet</Text>
                      <Text style={[type.body, styles.center]}>
                        Create one for your family, or join an existing group with
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

          {/* How it works — the security story, stated plainly */}
          <Animated.View style={[styles.section, listAnim]}>
            <Text style={type.overline}>How your files stay private</Text>
            <GlassCard>
              <View style={styles.point}>
                <IconLock size={18} color={colors.accent} />
                <View style={styles.pointText}>
                  <Text style={type.bodyStrong}>Access is server-enforced</Text>
                  <Text style={type.caption}>
                    Every file is stored with read access granted only to its
                    group&apos;s team. Appwrite rejects requests from anyone
                    else, even if they have the app and the file id.
                  </Text>
                </View>
              </View>
              <View style={styles.point}>
                <IconUsers size={18} color={colors.accent} />
                <View style={styles.pointText}>
                  <Text style={type.bodyStrong}>Invite codes, not stored passwords</Text>
                  <Text style={type.caption}>
                    A group&apos;s code is hashed (salted SHA-256) at creation and
                    shown once. Verifying it happens on the server, which then
                    grants membership.
                  </Text>
                </View>
              </View>
              <View style={styles.point}>
                <IconShield size={18} color={colors.accent} />
                <View style={styles.pointText}>
                  <Text style={type.bodyStrong}>Edits happen on your device</Text>
                  <Text style={type.caption}>
                    Photo and PDF editing never leaves your phone or browser. The
                    only thing that goes to Appwrite is the file you save.
                  </Text>
                </View>
              </View>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    gap: space.xs,
    paddingTop: space.xl,
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
  list: {
    gap: space.md,
  },
  empty: {
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.sm,
  },
  center: {
    textAlign: "center",
    maxWidth: 420,
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
  errorAction: {
    marginTop: space.md,
  },
  point: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "flex-start",
    marginBottom: space.lg,
  },
  pointText: {
    flex: 1,
    gap: 2,
  },
  setupButton: {
    marginTop: space.xs,
  },
});
