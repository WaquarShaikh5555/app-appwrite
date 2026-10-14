import { useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  IconBolt,
  IconGear,
  IconSparkle,
  IconWand,
} from "@/components/icons";
import { useOnboarding } from "@/context/onboarding";
import { useEntrance, usePulse } from "@/hooks/useEntrance";
import { colors, fonts, glow, radius, space, type } from "@/theme/tokens";

interface Slide {
  overline: string;
  title: string;
  body: string;
  icon: typeof IconSparkle;
}

const SLIDES: Slide[] = [
  {
    overline: "Welcome",
    title: "This is Eternalz",
    body: "A calm, dark home for the tools you actually use — running on your own Appwrite project, so your data stays yours.",
    icon: IconSparkle,
  },
  {
    overline: "Built by",
    title: "Made by Waquar Shaikh",
    body: "Designed and developed end to end — every screen, every animation, every detail. This app is the foundation for what comes next.",
    icon: IconWand,
  },
  {
    overline: "Roadmap",
    title: "Useful tools, yet to come",
    body: "Tasks, notes, expenses, habits and more are on the way. Each one appears in the Tools tab the moment it ships.",
    icon: IconBolt,
  },
  {
    overline: "Getting started",
    title: "Settings is your control room",
    body: "Your account, connection health, and announcements for every new tool live in Settings. Start there whenever you wonder what changed.",
    icon: IconGear,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { complete } = useOnboarding();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [index, setIndex] = useState(0);

  const mark = useEntrance(40);
  const breathe = usePulse(5200);
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await complete();
    router.replace("/");
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    const target = (index + 1) * width;
    scrollRef.current?.scrollTo({ x: target, animated: true });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* Skip */}
      <View style={styles.topBar}>
        <View style={styles.topSpacer} />
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      {/* Brand */}
      <Animated.View style={[styles.brand, mark]}>
        <Animated.View
          style={[
            styles.markGlow,
            {
              opacity: breathe.interpolate({
                inputRange: [0, 1],
                outputRange: [0.55, 1],
              }),
              transform: [
                {
                  scale: breathe.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.07],
                  }),
                },
              ],
            },
          ]}
        >
          <BrandMark size={76} />
        </Animated.View>
        <Text style={styles.wordmark}>ETERNALZ</Text>
      </Animated.View>

      {/* Pager */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / width,
          );
          setIndex(nextIndex);
        }}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => {
          const Icon = slide.icon;
          return (
            <View key={slide.title} style={[styles.slide, { width }]}>
              <GlassCard emphasis style={styles.slideCard}>
                <View style={styles.slideIcon}>
                  <Icon size={26} color={colors.primaryBright} />
                </View>
                <Text style={type.overline}>{slide.overline}</Text>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={[type.body, styles.slideBody]}>{slide.body}</Text>

                {i === SLIDES.length - 1 ? (
                  <View style={styles.slideActions}>
                    <Button text="Enter Eternalz" onPress={finish} />
                  </View>
                ) : null}
              </GlassCard>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Dots + next */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            return (
              <Animated.View
                key={slide.title}
                style={[
                  styles.dot,
                  {
                    width: scrollX.interpolate({
                      inputRange,
                      outputRange: [8, 24, 8],
                      extrapolate: "clamp",
                    }),
                    opacity: scrollX.interpolate({
                      inputRange,
                      outputRange: [0.35, 1, 0.35],
                      extrapolate: "clamp",
                    }),
                  },
                ]}
              />
            );
          })}
        </View>

        {isLast ? (
          <Button text="Enter Eternalz" variant="ghost" onPress={finish} />
        ) : (
          <Button text="Next" onPress={next} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    minHeight: 44,
  },
  topSpacer: {
    width: 44,
  },
  skip: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  brand: {
    alignItems: "center",
    gap: space.sm,
    paddingTop: space.lg,
  },
  markGlow: {
    borderRadius: radius.xl,
    ...glow.primary,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 6,
    color: colors.text,
  },
  pager: {
    flexGrow: 0,
    marginTop: space.lg,
  },
  slide: {
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    justifyContent: "center",
  },
  slideCard: {
    gap: space.sm,
    padding: space.xl,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  slideIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: space.sm,
  },
  slideTitle: {
    ...type.h1,
    fontSize: 24,
    lineHeight: 31,
  },
  slideBody: {
    maxWidth: 460,
  },
  slideActions: {
    marginTop: space.lg,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    gap: space.lg,
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryBright,
  },
});
