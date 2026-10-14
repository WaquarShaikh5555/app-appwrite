import { useMemo } from "react";
import { Animated, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { usePulse, useSpin } from "@/hooks/useEntrance";
import { gradients } from "@/theme/tokens";

/**
 * The Eternalz backdrop: deep space, built from structure rather than blobs.
 *
 * Four layers, back to front:
 *
 *   1. a vertical ink gradient;
 *   2. two hairline orbital rings that turn almost imperceptibly — the same
 *      orbit that circles the E in the brand mark, so the identity repeats
 *      instead of restating itself;
 *   3. a sparse starfield, deterministic so the server and client agree;
 *   4. a planetary limb rising from the bottom edge, its light cold cyan.
 *
 * Everything sits under 8% opacity except the stars. The previous version used
 * two large violet orbs in opposite corners, which is the default cosmic
 * backdrop every template ships with — and it washed the whole UI violet. This
 * one is quiet enough that content owns the screen.
 */
export const GlowBackground = () => {
  const { width, height } = useWindowDimensions();
  const twinkle = usePulse(6400);
  const spinA = useSpin(150000);
  const spinB = useSpin(210000);

  const ring = Math.max(width * 1.5, 640);
  const limbWidth = Math.max(width * 2.1, 900);

  /**
   * Deterministic stars (LCG, fixed seed) — 46 points that never move between
   * renders, so the layout is stable and SSR matches the client.
   */
  const stars = useMemo(() => {
    let seed = 20261014;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    return Array.from({ length: 46 }, () => ({
      x: rand(),
      y: rand(),
      size: rand() < 0.82 ? 1.4 : 2.2,
      opacity: 0.16 + rand() * 0.42,
    }));
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.none]}>
      <LinearGradient colors={gradients.backdrop} style={StyleSheet.absoluteFill} />

      {/* Orbital ring, upper right */}
      <Animated.View
        style={[
          styles.layer,
          {
            width: ring,
            height: ring,
            top: -ring * 0.62,
            right: -ring * 0.44,
            transform: [{ rotate: spinA }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="ringA" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#9C8CFF" stopOpacity="0.55" />
              <Stop offset="0.55" stopColor="#5FE8E0" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#6E5BFF" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="47.5" stroke="url(#ringA)" strokeWidth="0.28" fill="none" />
          <Circle cx="50" cy="50" r="38" stroke="url(#ringA)" strokeWidth="0.18" fill="none" />
        </Svg>
      </Animated.View>

      {/* Orbital ring, lower left */}
      <Animated.View
        style={[
          styles.layer,
          {
            width: ring * 0.8,
            height: ring * 0.8,
            bottom: -ring * 0.42,
            left: -ring * 0.3,
            transform: [{ rotate: spinB }],
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <SvgLinearGradient id="ringB" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#5FE8E0" stopOpacity="0.30" />
              <Stop offset="1" stopColor="#9C8CFF" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Circle cx="50" cy="50" r="48.4" stroke="url(#ringB)" strokeWidth="0.26" fill="none" />
        </Svg>
      </Animated.View>

      {/* Starfield */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: twinkle.interpolate({
              inputRange: [0, 1],
              outputRange: [0.72, 1],
            }),
          },
        ]}
      >
        {stars.map((star, index) => (
          <View
            key={index}
            style={[
              styles.star,
              {
                left: star.x * width,
                top: star.y * height,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Planetary limb rising from the base */}
      <View
        style={[
          styles.layer,
          {
            width: limbWidth,
            height: limbWidth * 0.5,
            bottom: -limbWidth * 0.42,
            left: (width - limbWidth) / 2,
          },
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 50">
          <Defs>
            <SvgLinearGradient id="limbStroke" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#5FE8E0" stopOpacity="0.40" />
              <Stop offset="1" stopColor="#6E5BFF" stopOpacity="0.06" />
            </SvgLinearGradient>
            <SvgLinearGradient id="limbFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#5FE8E0" stopOpacity="0.055" />
              <Stop offset="1" stopColor="#050411" stopOpacity="0.5" />
            </SvgLinearGradient>
          </Defs>
          <Ellipse cx="50" cy="50" rx="49.8" ry="49.8" fill="url(#limbFill)" />
          <Ellipse
            cx="50"
            cy="50"
            rx="49.6"
            ry="49.6"
            stroke="url(#limbStroke)"
            strokeWidth="0.14"
            fill="none"
          />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  none: {
    pointerEvents: "none",
    overflow: "hidden",
  },
  layer: {
    position: "absolute",
  },
  star: {
    position: "absolute",
    backgroundColor: "#EFEAFF",
  },
});
