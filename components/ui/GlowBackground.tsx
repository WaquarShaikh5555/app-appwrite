import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { usePulse } from "@/hooks/useEntrance";
import { gradients } from "@/theme/tokens";

/**
 * Ambient page backdrop: a vertical void gradient plus two slow-breathing
 * violet orbs. Purely decorative — never intercepts touches.
 */
export const GlowBackground = () => {
  const { width } = useWindowDimensions();
  const driftA = usePulse(7600);
  const driftB = usePulse(9600);
  const orbSize = Math.max(width * 0.95, 420);

  const orbAStyle = {
    opacity: driftA.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] }),
    transform: [
      { translateY: driftA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) },
      { scale: driftA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
    ],
  };

  const orbBStyle = {
    opacity: driftB.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }),
    transform: [
      { translateY: driftB.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) },
      { scale: driftB.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) },
    ],
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.none]}>
      <LinearGradient colors={gradients.backdrop} style={StyleSheet.absoluteFill} />

      <Animated.View
        style={[
          styles.orb,
          { width: orbSize, height: orbSize, borderRadius: orbSize / 2, top: -orbSize * 0.34, left: -orbSize * 0.28 },
          orbAStyle,
        ]}
      >
        <LinearGradient
          colors={gradients.orbA}
          start={{ x: 0.35, y: 0.3 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.orb,
          {
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            bottom: -orbSize * 0.42,
            right: -orbSize * 0.34,
          },
          orbBStyle,
        ]}
      >
        <LinearGradient
          colors={gradients.orbB}
          start={{ x: 0.65, y: 0.7 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  none: {
    pointerEvents: "none",
  },
  orb: {
    position: "absolute",
    overflow: "hidden",
  },
});
