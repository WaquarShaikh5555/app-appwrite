import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IconChevronRight, IconFolder, IconLock } from "@/components/icons";
import { Chip } from "@/components/ui/Chip";
import type { VaultGroup } from "@/types/vault";
import { formatDate } from "@/services/vault/format";
import { colors, radius, space, type } from "@/theme/tokens";

interface GroupCardProps {
  group: VaultGroup;
  fileCount?: number;
  onPress: () => void;
}

export const GroupCard = ({ group, fileCount, onPress }: GroupCardProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Open ${group.name}`}
    onPress={onPress}
    style={({ pressed }) => pressed && styles.pressed}
  >
    <View style={styles.card}>
      <LinearGradient
        colors={["rgba(139,92,246,0.10)", "rgba(139,92,246,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.tile}>
        <IconFolder size={22} color={colors.primaryBright} />
      </View>

      <View style={styles.info}>
        <Text style={type.bodyStrong} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={type.caption} numberOfLines={2}>
          {group.description || "No description"}
        </Text>
        <View style={styles.meta}>
          <IconLock size={12} color={colors.textDim} />
          <Text style={[type.caption, styles.metaText]}>
            Invite only · created {formatDate(group.$createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        {typeof fileCount === "number" ? (
          <Chip label={`${fileCount} file${fileCount === 1 ? "" : "s"}`} tone="muted" />
        ) : null}
        <IconChevronRight size={18} color={colors.textDim} />
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(13,11,24,0.66)",
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    color: colors.textDim,
  },
  right: {
    alignItems: "flex-end",
    gap: space.sm,
  },
});
