import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  IconDownload,
  IconFile,
  IconFileImage,
  IconFilePdf,
  IconFileSheet,
  IconFileSlides,
  IconRotateCw,
  IconTrash,
} from "@/components/icons";
import { Chip } from "@/components/ui/Chip";
import type { VaultFileRow } from "@/types/vault";
import { thumbnailUrlFor } from "@/services/vault/files";
import { formatBytes, formatDate } from "@/services/vault/format";
import { colors, fonts, radius, space, type } from "@/theme/tokens";

interface FileCardProps {
  file: VaultFileRow;
  busy?: boolean;
  onOpen?: () => void;
  onEdit?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

const kindIcon = (kind: VaultFileRow["kind"]) => {
  switch (kind) {
    case "image":
      return IconFileImage;
    case "pdf":
      return IconFilePdf;
    case "sheet":
      return IconFileSheet;
    case "slides":
      return IconFileSlides;
    default:
      return IconFile;
  }
};

const kindTone = (kind: VaultFileRow["kind"]) =>
  kind === "pdf" ? "danger" : kind === "image" ? "accent" : "muted";

export const FileCard = ({
  file,
  busy = false,
  onOpen,
  onEdit,
  onDownload,
  onDelete,
}: FileCardProps) => {
  const [thumbFailed, setThumbFailed] = useState(false);
  const Icon = kindIcon(file.kind);
  const thumbnail = thumbFailed ? null : thumbnailUrlFor(file, { width: 200, quality: 55 });
  const canEdit = file.kind === "image" || file.kind === "pdf";

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={["rgba(167,139,250,0.08)", "rgba(167,139,250,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${file.name}`}
        onPress={onOpen}
        style={styles.main}
      >
        <View style={styles.thumb}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={styles.thumbImage}
              onError={() => setThumbFailed(true)}
              resizeMode="cover"
            />
          ) : (
            <Icon size={22} color={colors.accent} />
          )}
        </View>

        <View style={styles.info}>
          <Text style={type.bodyStrong} numberOfLines={2}>
            {file.name}
          </Text>
          <Text style={type.caption} numberOfLines={1}>
            {formatBytes(file.size)} · {formatDate(file.$createdAt)}
          </Text>
          <Text style={[type.caption, styles.uploader]} numberOfLines={1}>
            {file.uploadedByName || "Unknown"}
          </Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Chip label={file.kind} tone={kindTone(file.kind)} />

        <View style={styles.buttons}>
          {canEdit && onEdit ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${file.name} in the editor`}
              onPress={onEdit}
              disabled={busy}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <IconRotateCw size={17} color={colors.primaryBright} />
            </Pressable>
          ) : null}

          {onDownload ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Download ${file.name}`}
              onPress={onDownload}
              disabled={busy}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <IconDownload size={17} color={colors.text} />
            </Pressable>
          ) : null}

          {onDelete ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${file.name}`}
              onPress={onDelete}
              disabled={busy}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <IconTrash size={17} color={colors.danger} />
            </Pressable>
          ) : null}

          {busy ? (
            <View style={styles.iconButton}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(13,11,24,0.66)",
    overflow: "hidden",
    padding: space.md,
    gap: space.md,
  },
  main: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  uploader: {
    color: colors.textDim,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  buttons: {
    flexDirection: "row",
    gap: space.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
});
