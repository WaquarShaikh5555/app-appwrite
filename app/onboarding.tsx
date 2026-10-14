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
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { IconArrowRight } from "@/components/icons";
import { useOnboarding } from "@/context/onboarding";
import { useEntrance, usePulse, useSpin } from "@/hooks/useEntrance";
import { colors, fonts, radius, space, type } from "@/theme/tokens";

interface Slide {
  overline: string;
  title: string;
  body: string;
  /** A short factual kicker under the hairline. */
  note: string;
}

const SLIDES: Slide[] = [
  {
    overline: "Welcome",
    title: "This is Eternalz",
    body: "A private toolkit for everyday life. Every tool in here is built from scratch for this app — and it all runs on Eternalz's own Appwrite backend. No third-party services standing in the middle.",
    note: "Our app, our tools, our backend.",
  },
  {
    overline: "Built by",
    title: "Made by Waquar Shaikh",
    body: "Designed and developed end to end — every screen, every state, every animation. Eternalz is a foundation built to grow, not a demo that stops here.",
    note: "Designed and built in Pune, India.",
  },
  {
    overline: "Roadmap",
    title: "Useful tools, shipped one at a time",
    body: "Tasks, notes, expenses, habits and more are on the way. Document Manager is already live and in use — each new tool appears in the Tools tab the day it ships.",
    note: "Document Manager · live now",
  },
  {
    overline: "Getting started",
    title: "Settings is your control room",
    body: "Your account, backend health and announcements for every new tool live in Settings. That is where to look whenever you wonder what changed.",
    note: "Four tools on the roadmap, one already shipped.",
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
  const body = useEntrance(160);
  const breathe = usePulse(5200);
  const spin = useSpin(120000);
  const isLast = index === SLIDES.length - 1;
  const counter = `${String(index + 1).padStart(2, "0")} / ${String(SLIDES.length).padStart(2, "0")}`;

  const finish = async () => {
    await complete();
    router.replace("/");
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    setIndex(index + 1);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>ETERNALZ</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip the tour"
          onPress={finish}
          hitSlop={14}
        >
          <Text style={styles.skip}>Skip tour</Text>
        </Pressable>
      </View>

      {/* ── Mark inside its orbit ─────────────────────────────────────── */}
      <Animated.View style={[styles.markRow, mark]}>
        <View style={styles.markWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs>
                <SvgLinearGradient id="orbit" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#BCA9FF" stopOpacity="0.85" />
                  <Stop offset="0.5" stopColor="#5FE8E0" stopOpacity="0.40" />
                  <Stop offset="1" stopColor="#6E5BFF" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>
              <Circle cx="50" cy="50" r="47" stroke="url(#orbit)" strokeWidth="0.7" fill="none" />
            </Svg>
          </Animated.View>
          <Animated.View
            style={{
              opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
            }}
          >
            <BrandMark size={68} />
          </Animated.View>
        </View>

        <View style={styles.markMeta}>
          <Text style={type.overline}>{counter}</Text>
          <Text style={styles.markName}>The personal toolkit</Text>
        </View>
      </Animated.View>

      {/* ── Slides ────────────────────────────────────────────────────── */}
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
          const landed = Math.round(event.nativeEvent.contentOffset.x / width);
          setIndex(landed);
        }}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Animated.View style={[styles.slideInner, i === 0 ? body : null]}>
              <View style={styles.slideHead}>
                <Text style={styles.slideIndex}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={styles.slideHeadRule} />
                <Text style={type.overline}>{slide.overline}</Text>
              </View>

              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideBody}>{slide.body}</Text>

              <View style={styles.rule} />
              <Text style={styles.note}>{slide.note}</Text>
            </Animated.View>
          </View>
        ))}
      </Animated.ScrollView>

      {/* ── Progress rule + action ────────────────────────────────────── */}
      <View style={styles.footer}>
        <View style={styles.tracks}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={styles.track}>
              <View
                style={[
                  styles.trackFill,
                  { opacity: i === index ? 1 : i < index ? 0.45 : 0 },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerHint}>
            {isLast ? "You're all set." : "Swipe or tap to continue"}
          </Text>
          <Button
            text={isLast ? "Enter Eternalz" : "Next"}
            icon={<IconArrowRight size={17} color={colors.text} />}
            onPress={next}
            style={styles.nextButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    minHeight: 44,
  },
  wordmark: {
    fontFamily: fonts.display,
    fontSize: 13,
    letterSpacing: 5,
    color: colors.text,
  },
  skip: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    letterSpacing: 0.2,
    color: colors.textDim,
  },

  markRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  markWrap: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  markMeta: {
    flex: 1,
    gap: 3,
  },
  markName: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },

  pager: {
    flexGrow: 0,
    marginTop: space.xl,
  },
  slide: {
    paddingHorizontal: space.xl,
    justifyContent: "center",
  },
  slideInner: {
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  slideHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  slideIndex: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.ion,
  },
  slideHeadRule: {
    width: 22,
    height: 1,
    backgroundColor: colors.border,
  },
  slideTitle: {
    ...type.displayXl,
    marginTop: space.lg,
  },
  slideBody: {
    ...type.body,
    marginTop: space.md,
    maxWidth: 480,
    fontSize: 15.5,
    lineHeight: 25,
  },
  rule: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: space.xl,
  },
  note: {
    ...type.caption,
    marginTop: space.md,
    letterSpacing: 0.5,
  },

  footer: {
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
    gap: space.lg,
  },
  tracks: {
    flexDirection: "row",
    gap: 6,
  },
  track: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  trackFill: {
    flex: 1,
    borderRadius: 1,
    backgroundColor: colors.primaryBright,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.lg,
  },
  footerHint: {
    ...type.caption,
    flex: 1,
  },
  nextButton: {
    minWidth: 132,
  },
});
