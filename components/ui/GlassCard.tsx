import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, space } from "@/theme/tokens";

interface GlassCardProps {
  children: ReactNode;
  /** Draws a luminous gradient ring around the card. */
  emphasis?: boolean;
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * The core surface of the app: a translucent "glass" panel over the backdrop,
 * with an optional gradient ring for hero content.
 */
export const GlassCard = ({
  children,
  emphasis = false,
  padded = true,
  style,
}: GlassCardProps) => {
  if (emphasis) {
    return (
      <LinearGradient
        colors={gradients.borderLine}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.ring, style]}
      >
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, padded && styles.padded, styles.innerEmphasis]}
        >
          {children}
        </LinearGradient>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <LinearGradient
        colors={gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[padded && styles.padded]}>{children}</View>
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
  },
  ring: {
    borderRadius: radius.lg + 1,
    padding: 1,
  },
  inner: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(13,11,24,0.92)",
  },
  innerEmphasis: {
    backgroundColor: "rgba(11,9,20,0.86)",
  },
  padded: {
    padding: space.lg,
  },
});
