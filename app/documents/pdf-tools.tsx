import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconInfo,
  IconLayers,
  IconRotateCcw,
  IconRotateCw,
  IconTrash,
} from "@/components/icons";
import { useAuth } from "@/context/auth";
import { getVaultGroup } from "@/services/vault/groups";
import {
  getVaultFile,
  listGroupFiles,
  replaceVaultFileBytes,
  stageVaultFile,
  uploadVaultBytes,
} from "@/services/vault/files";
import {
  deletePage,
  describeEdits,
  describePages,
  editedPdfName,
  loadPdf,
  mergePdfInto,
  movePageEarlier,
  movePageLater,
  rotatePage,
  savePdf,
  type PageInfo,
} from "@/services/vault/pdf";
import { formatBytes } from "@/services/vault/format";
import type { VaultFileRow, VaultGroup } from "@/types/vault";
import { colors, fonts, space, type } from "@/theme/tokens";

/**
 * PDF tools — rotate, reorder, remove and merge pages.
 *
 * Runs entirely on the device via pdf-lib. One honest limitation: turning a PDF
 * page into an image needs a rasteriser, which is not bundled here (see
 * docs/VAULT.md for why and what to add).
 */

interface OtherPdf {
  id: string;
  name: string;
  pages?: number;
}

export default function PdfToolsScreen() {
  const router = useRouter();
  const { groupId, fileId } = useLocalSearchParams<{ groupId: string; fileId: string }>();
  const { user } = useAuth();

  const [group, setGroup] = useState<VaultGroup | null>(null);
  const [file, setFile] = useState<VaultFileRow | null>(null);
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [candidates, setCandidates] = useState<OtherPdf[]>([]);

  const [selected, setSelected] = useState<number | null>(null);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergedPages, setMergedPages] = useState(0);
  const [touchCounts, setTouchCounts] = useState({ rotations: 0, deleted: 0, moved: 0 });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [replaceOriginal, setReplaceOriginal] = useState(false);

  useEffect(() => {
    let cleanup: (() => Promise<void>) | undefined;
    (async () => {
      if (!groupId || !fileId) return;
      try {
        const [loadedGroup, loadedFile] = await Promise.all([
          getVaultGroup(groupId),
          getVaultFile(fileId),
        ]);
        setGroup(loadedGroup);
        setFile(loadedFile);

        const staged = await stageVaultFile(loadedFile);
        cleanup = staged.cleanup;

        const pdf = await loadPdf(staged.bytes);
        setDocument(pdf);
        setPages(describePages(pdf));

        // Other PDFs in the group, for merging.
        const siblings = await listGroupFiles(groupId).catch(() => []);
        setCandidates(
          siblings
            .filter((row) => row.kind === "pdf" && row.$id !== loadedFile.$id)
            .map((row) => ({ id: row.$id, name: row.name })),
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? `Could not open this PDF: ${err.message}`
            : "Could not open this PDF.",
        );
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      void cleanup?.();
    };
  }, [groupId, fileId]);

  const refreshPages = (doc: PDFDocument) => {
    setPages(describePages(doc));
    setSelected(null);
  };

  const applyRotate = (index: number, delta: number) => {
    if (!document) return;
    rotatePage(document, index, delta);
    setTouchCounts((counts) => ({ ...counts, rotations: counts.rotations + 1 }));
    refreshPages(document);
  };

  const applyDelete = (index: number) => {
    if (!document) return;
    if (!deletePage(document, index)) {
      setError("A PDF needs at least one page, so the last page can't be removed.");
      return;
    }
    setTouchCounts((counts) => ({ ...counts, deleted: counts.deleted + 1 }));
    refreshPages(document);
  };

  const applyMove = (index: number, direction: "earlier" | "later") => {
    if (!document) return;
    const moved = direction === "earlier" ? movePageEarlier(document, index) : movePageLater(document, index);
    if (!moved) return;
    setTouchCounts((counts) => ({ ...counts, moved: counts.moved + 1 }));
    refreshPages(document);
  };

  const applyMerge = async () => {
    if (!document || !mergeSourceId) return;
    setBusy(true);
    setError(null);
    try {
      const source = candidates.find((candidate) => candidate.id === mergeSourceId);
      if (!source) throw new Error("Pick a PDF to merge in first.");
      const row = await getVaultFile(source.id);
      const staged = await stageVaultFile(row);
      const added = await mergePdfInto(document, staged.bytes);
      await staged.cleanup();
      setMergedPages((total) => total + added);
      setMergeSourceId(null);
      setNotice(`Merged ${added} page${added === 1 ? "" : "s"} from “${source.name}”.`);
      refreshPages(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not merge that PDF.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!document || !group || !file || !user) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await savePdf(document);

      if (replaceOriginal) {
        await replaceVaultFileBytes({
          group,
          row: file,
          bytes,
          mimeType: "application/pdf",
          userId: user.$id,
        });
        setNotice("Saved as a new version of the original.");
      } else {
        await uploadVaultBytes({
          group,
          bytes,
          name: editedPdfName(file.name, "edited"),
          mimeType: "application/pdf",
          userId: user.$id,
          userName: user.name || user.email,
        });
        setNotice("Saved as a new PDF in the group.");
      }
      setTimeout(() => router.back(), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the PDF.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Screen title="PDF tools">
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!document || !file || !group) {
    return (
      <Screen title="PDF tools" subtitle="Unavailable">
        <View style={styles.errorRow}>
          <IconInfo size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error ?? "This PDF could not be opened."}</Text>
        </View>
      </Screen>
    );
  }

  const editLines = describeEdits({ ...touchCounts, mergedPages });
  const hasEdits = editLines.length > 0;

  return (
    <Screen title="PDF tools" subtitle={file.name}>
      <View style={styles.stack}>
        {error ? (
          <GlassCard>
            <View style={styles.errorRow}>
              <IconInfo size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </GlassCard>
        ) : null}

        {notice ? (
          <GlassCard>
            <View style={styles.errorRow}>
              <IconCheck size={18} color={colors.success} />
              <Text style={[styles.errorText, styles.successText]}>{notice}</Text>
            </View>
          </GlassCard>
        ) : null}

        {/* Summary */}
        <GlassCard emphasis>
          <View style={styles.summaryRow}>
            <Chip
              label={`${pages.length} page${pages.length === 1 ? "" : "s"}`}
              tone="accent"
            />
            <Chip label={formatBytes(file.size)} tone="muted" />
          </View>
          {hasEdits ? (
            <View style={styles.editList}>
              {editLines.map((line) => (
                <Text key={line} style={type.caption}>
                  • {line}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={[type.caption, styles.editHint]}>
              Nothing changed yet. Tap a page to rotate, reorder or remove it.
            </Text>
          )}
        </GlassCard>

        {/* Page list */}
        <View style={styles.pageList}>
          {pages.map((page) => (
            <GlassCard key={`page-${page.index}`} padded={false} style={styles.pageCard}>
              <View style={styles.pageRow}>
                <View style={styles.pageNumber}>
                  <Text style={styles.pageNumberText}>{page.index + 1}</Text>
                </View>

                <View style={styles.pageInfo}>
                  <Text style={type.bodyStrong} numberOfLines={1}>
                    {page.width}×{page.height} pt
                  </Text>
                  <Text style={type.caption}>
                    {page.rotation ? `Rotated ${page.rotation}°` : "Upright"}
                  </Text>
                </View>

                <View style={styles.pageActions}>
                  <Button
                    text="⟲"
                    variant="ghost"
                    onPress={() => applyRotate(page.index, -90)}
                    style={styles.tinyButton}
                  />
                  <Button
                    text="⟳"
                    variant="ghost"
                    onPress={() => applyRotate(page.index, 90)}
                    style={styles.tinyButton}
                  />
                  <Button
                    text="↑"
                    variant="ghost"
                    onPress={() => applyMove(page.index, "earlier")}
                    style={styles.tinyButton}
                  />
                  <Button
                    text="↓"
                    variant="ghost"
                    onPress={() => applyMove(page.index, "later")}
                    style={styles.tinyButton}
                  />
                  <Button
                    text="✕"
                    variant="ghost"
                    onPress={() => applyDelete(page.index)}
                    style={styles.tinyButton}
                  />
                </View>
              </View>
            </GlassCard>
          ))}
        </View>

        {/* Merge */}
        <GlassCard>
          <View style={styles.mergeHeader}>
            <IconLayers size={18} color={colors.accent} />
            <Text style={type.bodyStrong}>Merge another PDF</Text>
          </View>
          {candidates.length === 0 ? (
            <Text style={[type.caption, styles.editHint]}>
              Upload another PDF to this group and it will show up here.
            </Text>
          ) : (
            <>
              <View style={styles.candidateList}>
                {candidates.map((candidate) => (
                  <Button
                    key={candidate.id}
                    text={candidate.name}
                    variant={mergeSourceId === candidate.id ? "primary" : "ghost"}
                    onPress={() => setMergeSourceId(candidate.id)}
                  />
                ))}
              </View>
              <Button
                text="Append its pages"
                variant="subtle"
                loading={busy}
                disabled={!mergeSourceId}
                onPress={applyMerge}
                style={styles.mergeAction}
              />
            </>
          )}
        </GlassCard>

        {/* Save target */}
        <GlassCard>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={type.bodyStrong}>Replace the original</Text>
              <Text style={type.caption}>
                Off keeps the original and adds an edited copy. Safer.
              </Text>
            </View>
            <Switch
              value={replaceOriginal}
              onValueChange={setReplaceOriginal}
              trackColor={{ true: colors.danger, false: "rgba(255,255,255,0.15)" }}
              thumbColor={colors.text}
            />
          </View>
        </GlassCard>

        <Button
          text={busy ? "Working…" : "Save PDF"}
          size="lg"
          loading={busy}
          disabled={!hasEdits}
          onPress={save}
        />

        {/* The honest limitation, stated where it matters */}
        <GlassCard>
          <View style={styles.errorRow}>
            <IconInfo size={18} color={colors.textDim} />
            <Text style={[type.caption, styles.flex]}>
              Editing runs on this device with pdf-lib: rotate, reorder, remove
              and merge. Turning pages into images (or editing page content) needs
              a PDF renderer, which isn&apos;t bundled — the app would need a
              native module and a development build. See docs/VAULT.md.
            </Text>
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  flex: { flex: 1 },
  summaryRow: {
    flexDirection: "row",
    gap: space.sm,
  },
  editList: {
    marginTop: space.md,
    gap: 2,
  },
  editHint: {
    marginTop: space.md,
  },
  pageList: { gap: space.sm },
  pageCard: {
    padding: space.md,
  },
  pageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  pageNumber: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageNumberText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primaryBright,
  },
  pageInfo: { flex: 1, gap: 2 },
  pageActions: {
    flexDirection: "row",
    gap: 4,
  },
  tinyButton: {
    minHeight: 36,
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mergeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  candidateList: {
    gap: space.sm,
    marginTop: space.md,
  },
  mergeAction: { marginTop: space.md },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
  },
  switchText: { flex: 1, gap: 2 },
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
});
