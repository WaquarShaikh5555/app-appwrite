import { ReactNode, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts, glow, gradients, radius, space } from "@/theme/tokens";

type Variant = "primary" | "ghost" | "subtle";
type Size = "md" | "lg";

interface ButtonProps {
  text: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export const Button = ({
  text,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const inactive = disabled || loading;

  const springTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 0,
      useNativeDriver: Platform.OS !== "web",
    }).start();

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        icon ?? null
      )}
      <Text style={[styles.label, size === "lg" && styles.labelLg]}>{text}</Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => springTo(0.97)}
      onPressOut={() => springTo(1)}
    >
      <Animated.View
        style={[styles.wrapper, { transform: [{ scale }] }, inactive && styles.inactive, style]}
      >
        {variant === "primary" ? (
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, size === "lg" && styles.baseLg, glow.primary]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.base,
              size === "lg" && styles.baseLg,
              variant === "ghost" ? styles.ghost : styles.subtle,
            ]}
          >
            {content}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.pill,
  },
  base: {
    borderRadius: radius.pill,
    paddingVertical: 13,
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  baseLg: {
    paddingVertical: 16,
    minHeight: 56,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  subtle: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  labelLg: {
    fontSize: 16,
  },
  inactive: {
    opacity: 0.5,
  },
});
