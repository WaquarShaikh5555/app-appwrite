import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ImageManipulator,
  SaveFormat,
} from "expo-image-manipulator";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import {
  IconCheck,
  IconFlipHorizontal,
  IconFlipVertical,
  IconInfo,
  IconRotateCcw,
  IconRotateCw,
} from "@/components/icons";
import { useAuth } from "@/context/auth";
import { getVaultGroup } from "@/services/vault/groups";
import {
  getVaultFile,
  replaceVaultFileBytes,
  stageVaultFile,
  uploadVaultBytes,
  uriToBytes,
  type StagedFile,
} from "@/services/vault/files";
import { formatBytes } from "@/services/vault/format";
import type { VaultFileRow, VaultGroup } from "@/types/vault";
import { colors, fonts, space, type } from "@/theme/tokens";

/**
 * Photo editor.
 *
 * Everything here runs on the device — the original is never uploaded anywhere
 * for editing, and Appwrite only ever sees the result you choose to save.
 */

type Rotation = 0 | 90 | 180 | 270;
type Flip = "none" | "horizontal" | "vertical";

const SIZES = [
  { label: "Full", width: null },
  { label: "2048", width: 2048 },
  { label: "1440", width: 1440 },
  { label: "1080", width: 1080 },
];

const QUALITIES = [
  { label: "Best", value: 0.95 },
  { label: "Good", value: 0.8 },
  { label: "Small", value: 0.55 },
];

export default function ImageEditorScreen() {
  const router = useRouter();
  const { groupId, fileId } = useLocalSearchParams<{ groupId: string; fileId: string }>();
  const { user } = useAuth();

  const [group, setGroup] = useState<VaultGroup | null>(null);
  const [file, setFile] = useState<VaultFileRow | null>(null);
  const [staged, setStaged] = useState<StagedFile | null>(null);
  const [preview, setPreview] = useState<{ uri: string; width: number; height: number } | null>(null);

  const [rotation, setRotation] = useState<Rotation>(0);
  const [flip, setFlip] = useState<Flip>("none");
  const [maxWidth, setMaxWidth] = useState<number | null>(null);
  const [quality, setQuality] = useState(0.8);
  const [asPng, setAsPng] = useState(false);
  const [replaceOriginal, setReplaceOriginal] = useState(false);

  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Load the file once.
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
        const stagedFile = await stageVaultFile(loadedFile);
        cleanup = stagedFile.cleanup;
        setStaged(stagedFile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open this image.");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      void cleanup?.();
    };
  }, [groupId, fileId]);

  const hasEdits = rotation !== 0 || flip !== "none" || maxWidth !== null;

  /** Apply the current edit chain and show the result. */
  const apply = useCallback(async () => {
    if (!staged) return;
    setWorking(true);
    setError(null);
    try {
      const context = ImageManipulator.manipulate(staged.uri);
      if (rotation !== 0) context.rotate(rotation);
      if (flip !== "none") context.flip(flip);
      if (maxWidth) context.resize({ width: maxWidth });

      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({
        compress: quality,
        format: asPng ? SaveFormat.PNG : SaveFormat.JPEG,
      });
      setPreview({ uri: result.uri, width: result.width, height: result.height });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not apply those edits: ${err.message}`
          : "Could not apply those edits.",
      );
    } finally {
      setWorking(false);
    }
  }, [staged, rotation, flip, maxWidth, quality, asPng]);

  const reset = () => {
    setRotation(0);
    setFlip("none");
    setMaxWidth(null);
    setQuality(0.8);
    setAsPng(false);
    setPreview(null);
    setError(null);
  };

  const save = async () => {
    if (!group || !file || !user || !preview) return;
    setSaving(true);
    setError(null);
    try {
      // `preview` is already the rendered result — read exactly those bytes.
      const editedBytes = await uriToBytes(preview.uri);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const extension = asPng ? "png" : "jpg";
      const mimeType = asPng ? "image/png" : "image/jpeg";

      if (replaceOriginal) {
        await replaceVaultFileBytes({
          group,
          row: file,
          bytes: editedBytes,
          mimeType,
          userId: user.$id,
        });
        setSaved("Saved as a new version of the original.");
      } else {
        await uploadVaultBytes({
          group,
          bytes: editedBytes,
          name: `${baseName}-edited.${extension}`,
          mimeType,
          userId: user.$id,
          userName: user.name || user.email,
        });
        setSaved("Saved as a new file in the group.");
      }

      setTimeout(() => router.back(), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the edit.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen title="Photo editor">
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!file || !group || !staged) {
    return (
      <Screen title="Photo editor" subtitle="Unavailable">
        <View style={styles.errorRow}>
          <IconInfo size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error ?? "This file could not be opened."}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Photo editor" subtitle={file.name}>
      <View style={styles.stack}>
        {/* Preview */}
        <GlassCard padded={false} style={styles.previewCard}>
          <Image
            source={{ uri: preview?.uri ?? staged.uri }}
            style={styles.preview}
            resizeMode="contain"
          />
          <View style={styles.previewMeta}>
            <Chip
              label={
                preview
                  ? `${preview.width}×${preview.height}`
                  : "Original"
              }
              tone={preview ? "success" : "muted"}
            />
            {preview ? <Chip label="Preview" tone="accent" /> : null}
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

        {saved ? (
          <GlassCard>
            <View style={styles.errorRow}>
              <IconCheck size={18} color={colors.success} />
              <Text style={[styles.errorText, styles.successText]}>{saved}</Text>
            </View>
          </GlassCard>
        ) : null}

        {/* Rotate / flip */}
        <GlassCard>
          <Text style={type.overline}>Orientation</Text>
          <View style={styles.controlRow}>
            <Button
              text="Rotate left"
              variant="subtle"
              icon={<IconRotateCcw size={17} color={colors.text} />}
              onPress={() => setRotation(((rotation + 270) % 360) as Rotation)}
              style={styles.flex}
            />
            <Button
              text="Rotate right"
              variant="subtle"
              icon={<IconRotateCw size={17} color={colors.text} />}
              onPress={() => setRotation(((rotation + 90) % 360) as Rotation)}
              style={styles.flex}
            />
          </View>
          <View style={[styles.controlRow, styles.rowSpacing]}>
            <Button
              text="Mirror"
              variant={flip === "horizontal" ? "primary" : "ghost"}
              icon={<IconFlipHorizontal size={17} color={colors.text} />}
              onPress={() => setFlip(flip === "horizontal" ? "none" : "horizontal")}
              style={styles.flex}
            />
            <Button
              text="Flip"
              variant={flip === "vertical" ? "primary" : "ghost"}
              icon={<IconFlipVertical size={17} color={colors.text} />}
              onPress={() => setFlip(flip === "vertical" ? "none" : "vertical")}
              style={styles.flex}
            />
          </View>
          {rotation !== 0 || flip !== "none" ? (
            <Text style={[type.caption, styles.summary]}>
              {rotation !== 0 ? `Rotated ${rotation}°` : ""}
              {rotation !== 0 && flip !== "none" ? " · " : ""}
              {flip !== "none" ? `mirrored ${flip}` : ""}
            </Text>
          ) : null}
        </GlassCard>

        {/* Resize */}
        <GlassCard>
          <Text style={type.overline}>Size</Text>
          <Text style={[type.caption, styles.hint]}>
            Caps the longest edge — handy before sharing a 12 MP photo.
          </Text>
          <View style={styles.chipRow}>
            {SIZES.map((size) => (
              <View key={size.label} style={styles.chipWrap}>
                <Button
                  text={size.label === "Full" ? "Original" : `${size.label}px`}
                  variant={maxWidth === size.width ? "primary" : "ghost"}
                  onPress={() => setMaxWidth(size.width)}
                />
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Quality */}
        <GlassCard>
          <Text style={type.overline}>Quality</Text>
          <View style={styles.chipRow}>
            {QUALITIES.map((option) => (
              <View key={option.label} style={styles.chipWrap}>
                <Button
                  text={`${option.label} (${Math.round(option.value * 100)}%)`}
                  variant={quality === option.value ? "primary" : "ghost"}
                  onPress={() => setQuality(option.value)}
                />
              </View>
            ))}
          </View>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text style={type.bodyStrong}>Keep transparency (PNG)</Text>
              <Text style={type.caption}>
                Off saves as JPEG — much smaller for photos.
              </Text>
            </View>
            <Switch
              value={asPng}
              onValueChange={setAsPng}
              trackColor={{ true: colors.primary, false: "rgba(255,255,255,0.15)" }}
              thumbColor={colors.text}
            />
          </View>
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

        {/* Actions */}
        <View style={styles.footer}>
          <Button
            text="Reset"
            variant="ghost"
            onPress={reset}
            style={styles.flex}
          />
          <Button
            text={preview ? "Re-apply" : "Apply edits"}
            variant="subtle"
            loading={working}
            disabled={!hasEdits && !preview}
            onPress={apply}
            style={styles.flex}
          />
        </View>
        <Button
          text={saving ? "Saving…" : "Save to group"}
          size="lg"
          loading={saving}
          disabled={!preview}
          onPress={save}
        />
        {!preview ? (
          <Text style={[type.caption, styles.center]}>
            Apply your edits first, then save. Editing happens on this device —
            the file is only uploaded when you save.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space.lg },
  previewCard: {
    overflow: "hidden",
    alignItems: "center",
  },
  preview: {
    width: "100%",
    height: 260,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  previewMeta: {
    flexDirection: "row",
    gap: space.sm,
    padding: space.md,
  },
  controlRow: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.md,
  },
  rowSpacing: { marginTop: space.md },
  flex: { flex: 1 },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.md,
  },
  chipWrap: { flexGrow: 1 },
  summary: {
    marginTop: space.md,
    color: colors.accent,
  },
  hint: { marginTop: space.xs },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    marginTop: space.lg,
  },
  switchText: { flex: 1, gap: 2 },
  footer: {
    flexDirection: "row",
    gap: space.md,
  },
  center: { textAlign: "center" },
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
