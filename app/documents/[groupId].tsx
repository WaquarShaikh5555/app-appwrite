import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Share } from "react-native";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { FileCard } from "@/components/vault/FileCard";
import {
  IconCloud,
  IconDownload,
  IconFilePdf,
  IconInfo,
  IconLink,
  IconLock,
  IconRotateCw,
  IconTrash,
  IconUpload,
  IconUsers,
} from "@/components/icons";
import { useAuth } from "@/context/auth";
import { useEntrance } from "@/hooks/useEntrance";
import {
  deleteVaultGroup,
  getVaultGroup,
  listGroupMembers,
  removeMember,
  rotateJoinCode,
} from "@/services/vault/groups";
import {
  deleteVaultFile,
  downloadVaultFile,
  listGroupFiles,
  pickVaultFiles,
  uploadVaultBytes,
  uploadVaultFile,
} from "@/services/vault/files";
import { buildPhotoPdf } from "@/services/vault/photo-pdf";
import { photosPdfName } from "@/services/vault/pdf";
import { formatJoinCode, formatBytes } from "@/services/vault/format";
import type { VaultFileRow, VaultGroup, VaultMember } from "@/types/vault";
import { colors, fonts, radius, space, type } from "@/theme/tokens";

type Busy = { kind: "upload"; percent: number } | { kind: "file"; id: string } | { kind: "none" };

export default function GroupScreen() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();

  const [group, setGroup] = useState<VaultGroup | null>(null);
  const [files, setFiles] = useState<VaultFileRow[]>([]);
  const [members, setMembers] = useState<VaultMember[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>({ kind: "none" });
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [confirmGroupDelete, setConfirmGroupDelete] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const entrance = useEntrance(60);

  const load = useCallback(async () => {
    if (!groupId) return;
    try {
      const loaded = await getVaultGroup(groupId);
      setGroup(loaded);
      const [fileList, memberList] = await Promise.all([
        listGroupFiles(groupId).catch(() => []),
        listGroupMembers(loaded.teamId),
      ]);
      setFiles(fileList);
      setMembers(memberList);
    } catch (error) {
      setNotice({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not open this group. Are you still a member?",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

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

  const isOwner = Boolean(user && group && user.$id === group.ownerId);

  const upload = async () => {
    if (!group || !user) return;
    try {
      const assets = await pickVaultFiles();
      if (assets.length === 0) return;

      let index = 0;
      for (const asset of assets) {
        index += 1;
        setBusy({ kind: "upload", percent: 0 });
        await uploadVaultFile({
          group,
          asset,
          userId: user.$id,
          userName: user.name || user.email,
          onProgress: (percent) => setBusy({ kind: "upload", percent }),
        });
      }
      setNotice({
        tone: "ok",
        text: `Uploaded ${assets.length} file${assets.length === 1 ? "" : "s"}.`,
      });
      await load();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      setBusy({ kind: "none" });
    }
  };

  /**
   * Pick photos, build a PDF on the device, upload the result.
   *
   * The photos themselves are never uploaded — only the assembled PDF is.
   */
  const photosToPdf = async () => {
    if (!group || !user) return;
    try {
      const assets = await pickVaultFiles({ imagesOnly: true });
      if (assets.length === 0) return;

      setBusy({ kind: "upload", percent: 0 });
      const bytes = await buildPhotoPdf({
        assets,
        onProgress: ({ done, total }) =>
          setBusy({ kind: "upload", percent: Math.round((done / total) * 90) }),
      });

      setBusy({ kind: "upload", percent: 95 });
      await uploadVaultBytes({
        group,
        bytes,
        name: photosPdfName(),
        mimeType: "application/pdf",
        userId: user.$id,
        userName: user.name || user.email,
      });

      setNotice({
        tone: "ok",
        text: `Made a PDF from ${assets.length} photo${
          assets.length === 1 ? "" : "s"
        }.`,
      });
      await load();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not build the PDF.",
      });
    } finally {
      setBusy({ kind: "none" });
    }
  };

  const runFileAction = async (row: VaultFileRow, action: () => Promise<void>) => {
    setBusy({ kind: "file", id: row.$id });
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "That didn't work.",
      });
    } finally {
      setBusy({ kind: "none" });
    }
  };

  if (loading) {
    return (
      <Screen title="Loading…">
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!group) {
    return (
      <Screen title="Group" subtitle="Unavailable">
        <View style={styles.errorRow}>
          <IconInfo size={18} color={colors.danger} />
          <Text style={styles.errorText}>
            {notice?.text ?? "This group isn't available on your account."}
          </Text>
        </View>
        <Button text="Back to Document Manager" onPress={() => router.replace("/documents")} />
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />
        }
      >
        <View style={styles.column}>
          <Animated.View style={[styles.header, entrance]}>
            <View style={styles.headerTop}>
              <BackButton onPress={() => router.replace("/documents")} />
              <View style={styles.headerText}>
                <Text style={type.h1} numberOfLines={1}>
                  {group.name}
                </Text>
                <View style={styles.headerMeta}>
                  <IconLock size={12} color={colors.textDim} />
                  <Text style={[type.caption, styles.metaText]}>
                    Invite only · {members.length} member
                    {members.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              {isOwner ? <Chip label="Owner" tone="accent" /> : null}
            </View>
            {group.description ? (
              <Text style={[type.body, styles.description]}>{group.description}</Text>
            ) : null}
          </Animated.View>

          {notice ? (
            <Animated.View style={entrance}>
              <GlassCard>
                <View style={styles.errorRow}>
                  <IconInfo
                    size={18}
                    color={notice.tone === "ok" ? colors.success : colors.danger}
                  />
                  <Text
                    style={[
                      styles.errorText,
                      notice.tone === "ok" && styles.successText,
                    ]}
                  >
                    {notice.text}
                  </Text>
                </View>
              </GlassCard>
            </Animated.View>
          ) : null}

          {/* ── Actions ─────────────────────────────────────────────── */}
          <Animated.View style={[styles.actions, entrance]}>
            <Button
              text={
                busy.kind === "upload" ? `Uploading ${busy.percent}%` : "Upload files"
              }
              icon={<IconUpload size={18} color={colors.text} />}
              loading={busy.kind === "upload"}
              onPress={upload}
              style={styles.flex}
            />
            <Button
              text="Members"
              variant="ghost"
              icon={<IconUsers size={18} color={colors.text} />}
              onPress={() => setMembersOpen((open) => !open)}
              style={styles.flex}
            />
          </Animated.View>

          <Animated.View style={[styles.actions, entrance]}>
            <Button
              text="Photos → PDF"
              variant="subtle"
              icon={<IconFilePdf size={18} color={colors.text} />}
              disabled={busy.kind !== "none"}
              onPress={photosToPdf}
              style={styles.flex}
            />
          </Animated.View>

          {/* ── Members ─────────────────────────────────────────────── */}
          {membersOpen ? (
            <GlassCard>
              <Text style={type.bodyStrong}>Members</Text>
              <View style={styles.memberList}>
                {members.length === 0 ? (
                  <Text style={type.caption}>No members to show.</Text>
                ) : (
                  members.map((member) => (
                    <View key={member.membershipId} style={styles.memberRow}>
                      <View style={styles.memberText}>
                        <Text style={type.bodyStrong} numberOfLines={1}>
                          {member.userName}
                          {member.isSelf ? " (you)" : ""}
                        </Text>
                        <Text style={type.caption} numberOfLines={1}>
                          {member.userEmail}
                        </Text>
                      </View>
                      {member.isOwner ? <Chip label="Owner" tone="accent" /> : null}
                      {isOwner && !member.isSelf ? (
                        <Button
                          text="Remove"
                          variant="ghost"
                          onPress={() =>
                            runFileAction(
                              { $id: member.membershipId } as VaultFileRow,
                              async () => {
                                await removeMember({
                                  teamId: group.teamId,
                                  membershipId: member.membershipId,
                                });
                                setNotice({
                                  tone: "ok",
                                  text: `${member.userName} no longer has access.`,
                                });
                                await load();
                              },
                            )
                          }
                        />
                      ) : null}
                      {member.isSelf && !isOwner ? (
                        <Button
                          text="Leave"
                          variant="ghost"
                          onPress={() =>
                            runFileAction(
                              { $id: member.membershipId } as VaultFileRow,
                              async () => {
                                await removeMember({
                                  teamId: group.teamId,
                                  membershipId: member.membershipId,
                                });
                                router.replace("/documents");
                              },
                            )
                          }
                        />
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            </GlassCard>
          ) : null}

          {/* ── Invite code ─────────────────────────────────────────── */}
          {isOwner ? (
            <GlassCard>
              <View style={styles.inviteHeader}>
                <IconLink size={18} color={colors.accent} />
                <Text style={type.bodyStrong}>Invite people</Text>
              </View>

              {newCode ? (
                <>
                  <Text selectable style={styles.code}>
                    {formatJoinCode(newCode)}
                  </Text>
                  <Text style={[type.caption, styles.inviteHint]}>
                    Shown once — share it now. Everyone with the old code has been
                    locked out.
                  </Text>
                  <View style={styles.inviteActions}>
                    <Button
                      text="Copy"
                      variant="subtle"
                      onPress={() => Clipboard.setStringAsync(formatJoinCode(newCode))}
                      style={styles.flex}
                    />
                    <Button
                      text="Share"
                      onPress={() =>
                        Share.share({
                          message:
                            `Join the “${group.name}” folder on Eternalz.\n\n` +
                            `Tools → Document Manager → Join a group:\n\n${formatJoinCode(newCode)}`,
                        }).catch(() => {})
                      }
                      style={styles.flex}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={[type.caption, styles.inviteHint]}>
                    The invite code is stored only as a hash, so it can&apos;t be
                    shown again. Rotate it to get a fresh one — that also revokes
                    the previous code.
                  </Text>
                  <View style={styles.inviteActions}>
                    <Button
                      text="Rotate invite code"
                      variant="subtle"
                      icon={<IconRotateCw size={17} color={colors.text} />}
                      onPress={() =>
                        runFileAction({ $id: "rotate" } as VaultFileRow, async () => {
                          const code = await rotateJoinCode(group);
                          setNewCode(code);
                          setNotice({
                            tone: "ok",
                            text: "New invite code issued. The old one no longer works.",
                          });
                        })
                      }
                      style={styles.flex}
                    />
                  </View>
                </>
              )}
            </GlassCard>
          ) : null}

          {/* ── Files ───────────────────────────────────────────────── */}
          <Animated.View style={[styles.section, entrance]}>
            <View style={styles.sectionHead}>
              <Text style={type.overline}>Documents</Text>
              {files.length > 0 ? <Chip label={`${files.length}`} tone="muted" /> : null}
            </View>

            {files.length === 0 ? (
              <GlassCard>
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <IconCloud size={26} color={colors.accent} />
                  </View>
                  <Text style={[type.h2, styles.center]}>Nothing here yet</Text>
                  <Text style={[type.body, styles.center]}>
                    Upload PDFs, photos, spreadsheets or documents. Tap a photo or
                    PDF afterwards to edit it without leaving the app.
                  </Text>
                  <Button
                    text="Upload files"
                    icon={<IconUpload size={18} color={colors.text} />}
                    onPress={upload}
                    style={styles.emptyAction}
                  />
                </View>
              </GlassCard>
            ) : (
              <View style={styles.fileList}>
                {files.map((file) =>
                  pendingDelete === file.$id ? (
                    <GlassCard key={file.$id} emphasis>
                      <Text style={type.bodyStrong}>Delete “{file.name}”?</Text>
                      <Text style={[type.caption, styles.deleteHint]}>
                        This removes the file for everyone in the group. It cannot
                        be undone.
                      </Text>
                      <View style={styles.confirmRow}>
                        <Button
                          text="Keep it"
                          variant="ghost"
                          onPress={() => setPendingDelete(null)}
                          style={styles.flex}
                        />
                        <Button
                          text="Delete"
                          onPress={() =>
                            runFileAction(file, async () => {
                              await deleteVaultFile(file);
                              setPendingDelete(null);
                              setNotice({ tone: "ok", text: `Deleted ${file.name}.` });
                              await load();
                            })
                          }
                          style={styles.flex}
                        />
                      </View>
                    </GlassCard>
                  ) : (
                    <FileCard
                      key={file.$id}
                      file={file}
                      busy={busy.kind === "file" && busy.id === file.$id}
                      onOpen={() => {
                        if (file.kind === "image") {
                          router.push({
                            pathname: "/documents/image-editor",
                            params: { groupId: group.$id, fileId: file.$id },
                          });
                        } else if (file.kind === "pdf") {
                          router.push({
                            pathname: "/documents/pdf-tools",
                            params: { groupId: group.$id, fileId: file.$id },
                          });
                        } else {
                          runFileAction(file, async () => {
                            await downloadVaultFile(file);
                          });
                        }
                      }}
                      onEdit={() =>
                        router.push({
                          pathname:
                            file.kind === "image"
                              ? "/documents/image-editor"
                              : "/documents/pdf-tools",
                          params: { groupId: group.$id, fileId: file.$id },
                        })
                      }
                      onDownload={() =>
                        runFileAction(file, async () => {
                          await downloadVaultFile(file);
                        })
                      }
                      onDelete={() => setPendingDelete(file.$id)}
                    />
                  ),
                )}
              </View>
            )}
          </Animated.View>

          {/* ── Danger zone ─────────────────────────────────────────── */}
          {isOwner ? (
            <Animated.View style={[styles.section, entrance]}>
              <Text style={type.overline}>Manage</Text>
              <GlassCard>
                {confirmGroupDelete ? (
                  <>
                    <Text style={type.bodyStrong}>
                      Delete “{group.name}” and everything in it?
                    </Text>
                    <Text style={[type.caption, styles.deleteHint]}>
                      {files.length} file{files.length === 1 ? "" : "s"} (
                      {formatBytes(files.reduce((sum, f) => sum + (f.size ?? 0), 0))})
                      will be removed for every member, and their access will end
                      immediately.
                    </Text>
                    <View style={styles.confirmRow}>
                      <Button
                        text="Cancel"
                        variant="ghost"
                        onPress={() => setConfirmGroupDelete(false)}
                        style={styles.flex}
                      />
                      <Button
                        text="Delete group"
                        onPress={async () => {
                          setBusy({ kind: "file", id: "group" });
                          await deleteVaultGroup(group);
                          router.replace("/documents");
                        }}
                        style={styles.flex}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={type.bodyStrong}>Delete this group</Text>
                    <Text style={[type.caption, styles.deleteHint]}>
                      Removes every file and ends access for all members. Only the
                      owner can do this.
                    </Text>
                    <Button
                      text="Delete group"
                      variant="ghost"
                      icon={<IconTrash size={17} color={colors.danger} />}
                      onPress={() => setConfirmGroupDelete(true)}
                      style={styles.deleteButton}
                    />
                  </>
                )}
              </GlassCard>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Small local shell so this screen keeps its own header layout. */
function Screen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.standalone}>
        <View style={styles.standaloneHead}>
          <BackButton onPress={() => router.replace("/documents")} />
          <View style={styles.headerText}>
            <Text style={type.title}>{title}</Text>
            {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.standaloneBody}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      text="←"
      variant="ghost"
      onPress={onPress}
      style={styles.backButton}
    />
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
    gap: space.sm,
    paddingTop: space.lg,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: { color: colors.textDim },
  description: { marginTop: space.xs },
  backButton: {
    paddingHorizontal: 14,
    minHeight: 42,
    minWidth: 42,
  },
  flex: { flex: 1 },
  actions: {
    flexDirection: "row",
    gap: space.md,
  },
  section: { gap: space.md },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fileList: { gap: space.md },
  memberList: {
    marginTop: space.md,
    gap: space.md,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  memberText: { flex: 1, gap: 2 },
  inviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  inviteHint: {
    marginTop: space.sm,
  },
  inviteActions: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.lg,
  },
  code: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 3,
    color: colors.text,
    textAlign: "center",
    marginTop: space.md,
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
  emptyAction: { marginTop: space.md },
  center: { textAlign: "center", maxWidth: 420 },
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
  successText: { color: colors.success },
  deleteHint: { marginTop: space.sm, marginBottom: space.lg },
  deleteButton: { marginTop: space.lg },
  confirmRow: {
    flexDirection: "row",
    gap: space.md,
  },
  standalone: {
    flex: 1,
    padding: space.xl,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
  },
  standaloneHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  standaloneBody: {
    marginTop: space.xl,
    gap: space.lg,
  },
});
