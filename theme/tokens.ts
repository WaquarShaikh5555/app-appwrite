import { StyleSheet } from "react-native";

/**
 * Eternalz design tokens — derived from the brand mark: deep cosmic black,
 * electric violet, lavender mist. Every surface is dark; every accent glows.
 */
export const colors = {
  /** Base void */
  bg: "#07060D",
  /** Raised card / sheet base */
  bgElevated: "#0D0B18",
  /** Glass surfaces */
  surface: "rgba(255,255,255,0.04)",
  surfaceStrong: "rgba(255,255,255,0.07)",
  /** Hairlines, violet-tinted */
  border: "rgba(167,139,250,0.14)",
  borderStrong: "rgba(167,139,250,0.32)",

  text: "#F4F2FF",
  textMuted: "#A79FC9",
  textDim: "#6F6791",

  primary: "#8B5CF6",
  primaryBright: "#A78BFA",
  primaryDeep: "#5B21B6",
  accent: "#C4B5FD",
  accentSoft: "rgba(196,181,253,0.14)",

  success: "#34D399",
  danger: "#F87171",
  warning: "#FBBF24",
} as const;

/** Linear gradient stops (order: start → end). */
export const gradients = {
  /** Page backdrop, top → bottom */
  backdrop: ["#0C0A1B", "#08070F", "#07060D"] as const,
  /** Primary buttons + active accents */
  primary: ["#7C3AED", "#A78BFA"] as const,
  /** Hero card wash */
  hero: ["rgba(139,92,246,0.22)", "rgba(139,92,246,0.03)"] as const,
  /** Standard glass card */
  card: ["rgba(167,139,250,0.09)", "rgba(167,139,250,0.02)"] as const,
  /** Gradient border for emphasis */
  borderLine: ["rgba(196,181,253,0.55)", "rgba(124,58,237,0.18)"] as const,
  /** Ambient orbs */
  orbA: ["rgba(124,58,237,0.40)", "rgba(124,58,237,0.0)"] as const,
  orbB: ["rgba(76,29,149,0.35)", "rgba(76,29,149,0.0)"] as const,
} as const;

export const glow = {
  primary: {
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  soft: {
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const fonts = {
  display: "Poppins_600SemiBold",
  heading: "Poppins_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
} as const;

/**
 * Type scale. Defined with `fontSize` + `lineHeight` pairs so text never jumps
 * between platforms (RN doesn't inherit line height automatically).
 */
export const type = StyleSheet.create({
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.2,
    color: colors.text,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 33,
    color: colors.text,
  },
  h2: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 27,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  bodyStrong: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textDim,
  },
  overline: {
    fontFamily: fonts.heading,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    color: colors.accent,
  },
});
