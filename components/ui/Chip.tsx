import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, space } from "@/theme/tokens";

type Tone = "accent" | "muted" | "success" | "warning" | "danger";

interface ChipProps {
  label: string;
  tone?: Tone;
  icon?: ReactNode;
}

const toneStyles: Record<Tone, { bg: string; fg: string; border: string }> = {
  accent: { bg: "rgba(139,92,246,0.16)", fg: colors.accent, border: "rgba(167,139,250,0.35)" },
  muted: { bg: "rgba(255,255,255,0.05)", fg: colors.textDim, border: colors.border },
  success: { bg: "rgba(52,211,153,0.14)", fg: colors.success, border: "rgba(52,211,153,0.32)" },
  warning: { bg: "rgba(251,191,36,0.14)", fg: colors.warning, border: "rgba(251,191,36,0.32)" },
  danger: { bg: "rgba(248,113,113,0.14)", fg: colors.danger, border: "rgba(248,113,113,0.32)" },
};

export const Chip = ({ label, tone = "accent", icon }: ChipProps) => {
  const t = toneStyles[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg, borderColor: t.border }]}>
      {icon}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
});
