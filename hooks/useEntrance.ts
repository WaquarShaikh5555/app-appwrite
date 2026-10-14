import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";

/**
 * Staggered mount animation: fades in and lifts into place.
 *
 * Uses the core `Animated` API on purpose — it needs no babel plugin and
 * behaves identically on web and native. `useNativeDriver` is disabled on web,
 * where the native driver isn't available (enabling it there logs warnings).
 */
export function useEntrance(delay = 0, distance = 14) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 520,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [progress, delay]);

  return {
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
    ],
  };
}

/** Slow, looping breathing animation — for ambient glows. */
export function usePulse(duration = 5200) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, duration]);

  return pulse;
}
