import { Platform, StyleSheet } from "react-native";

/**
 * Eternalz design tokens.
 *
 * The palette is built on a rule, not a mood: **almost nothing is violet**.
 *
 * Most of the UI is ink (neutral, cool, near-black) with plain white hairlines.
 * Violet is reserved for the brand signal — primary actions, active state, the
 * mark — and an ion-cyan runs alongside it in gradients and data accents, the
 * way a real nebula reads: a bright core falling off into a colder edge.
 *
 * The old scheme tinted every border, card and surface violet, which is what
 * made it look like every other purple-gradient app: when everything is an
 * accent colour, nothing is. Two hues used sparingly read as designed; one hue
 * used everywhere reads as a default.
 */
export const colors = {
  /** Base void — deep indigo-black, not grey */
  bg: "#050411",
  /** Raised card / sheet base */
  bgElevated: "#0A0820",
  /** Glass surfaces — neutral, so they sit on any backdrop */
  surface: "rgba(255,255,255,0.035)",
  surfaceStrong: "rgba(255,255,255,0.06)",
  /** Hairlines: near-neutral. Structure should not be violet. */
  border: "rgba(255,255,255,0.085)",
  borderStrong: "rgba(255,255,255,0.16)",
  /** Violet hairline — emphasis only (rings, focus, active cards) */
  borderAccent: "rgba(156,140,255,0.34)",

  text: "#F5F3FF",
  textMuted: "#A8A2C7",
  textDim: "#6E6890",

  /** Brand signal. Electric indigo-violet, deliberately not the default purple. */
  primary: "#6E5BFF",
  primaryBright: "#9C8CFF",
  primaryDeep: "#3A1FA8",
  accent: "#BCA9FF",
  accentSoft: "rgba(156,140,255,0.12)",

  /** Second hue: ion cyan. Used in gradients, orbit lines and data accents. */
  ion: "#5FE8E0",
  ionBright: "#8FF5EF",
  ionSoft: "rgba(95,232,224,0.12)",

  success: "#4ADE80",
  danger: "#FF6B6B",
  warning: "#FBBF24",
} as const;

/** Linear gradient stops (order: start → end). */
export const gradients = {
  /** Page backdrop, top → bottom */
  backdrop: ["#0A0722", "#060417", "#050411"] as const,
  /** Primary buttons — indigo into brand violet */
  primary: ["#5B45F5", "#8B6DFF"] as const,
  /** Hero card wash: warm core, cold edge */
  hero: ["rgba(110,91,255,0.20)", "rgba(95,232,224,0.05)"] as const,
  /** Standard glass card — a neutral sheen, not a violet wash */
  card: ["rgba(255,255,255,0.055)", "rgba(255,255,255,0.012)"] as const,
  /** Gradient border for emphasis: violet → ion */
  borderLine: ["rgba(156,140,255,0.55)", "rgba(95,232,224,0.28)"] as const,
  /** Ambient backdrop lights (retuned in the new backdrop) */
  orbA: ["rgba(91,69,245,0.34)", "rgba(91,69,245,0.0)"] as const,
  orbB: ["rgba(95,232,224,0.16)", "rgba(95,232,224,0.0)"] as const,
  /** Orbital ring stroke: bright head, fading tail */
  ring: ["rgba(156,140,255,0.55)", "rgba(95,232,224,0.10)", "rgba(156,140,255,0.0)"] as const,
  /** Planet limb at the base of the frame */
  limb: ["rgba(95,232,224,0.22)", "rgba(95,232,224,0.0)"] as const,
} as const;

/**
 * Glow shadows. React Native Web rejects the legacy `shadow*` props in favour
 * of `boxShadow`, so the two platforms get different (equivalent) declarations
 * from one place — screens never deal with the difference.
 */
export const glow = {
  primary:
    Platform.select({
      web: { boxShadow: "0 8px 24px rgba(91,69,245,0.45)" },
      default: {
        shadowColor: "#5B45F5",
        shadowOpacity: 0.45,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      },
    }) ?? {},
  soft:
    Platform.select({
      web: { boxShadow: "0 4px 14px rgba(91,69,245,0.28)" },
      default: {
        shadowColor: "#5B45F5",
        shadowOpacity: 0.28,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      },
    }) ?? {},
  ion:
    Platform.select({
      web: { boxShadow: "0 0 20px rgba(95,232,224,0.30)" },
      default: {
        shadowColor: "#5FE8E0",
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
      },
    }) ?? {},
} as const;

/** Tighter than before on purpose: smaller radii read as engineered. */
export const radius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
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
  /** Hero statement — onboarding, empty states */
  displayXl: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -0.6,
    color: colors.text,
  },
  display: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: colors.text,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: colors.text,
  },
  h2: {
    fontFamily: fonts.heading,
    fontSize: 19,
    lineHeight: 26,
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
    lineHeight: 23,
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
    lineHeight: 19,
    color: colors.textDim,
  },
  /** Wide-tracked micro-label. The app's punctuation mark. */
  overline: {
    fontFamily: fonts.heading,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    color: colors.accent,
  },
  /** Identifiers, invite codes, sizes — anything that should feel mechanical. */
  code: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 1.2,
    color: colors.ionBright,
  },
} as const);
