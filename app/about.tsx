import { Animated, Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  IconChevronRight,
  IconCloud,
  IconInfo,
  IconSparkle,
  IconWand,
} from "@/components/icons";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "@/constants/appwrite";
import { useOnboarding } from "@/context/onboarding";
import { useEntrance } from "@/hooks/useEntrance";
import { colors, space, type } from "@/theme/tokens";

const APP_VERSION = "0.1.0";
const REPO_URL = "https://github.com/WaquarShaikh5555/app-appwrite";
const CONSOLE_URL = "https://cloud.appwrite.io";

export default function AboutScreen() {
  const router = useRouter();
  const { replay } = useOnboarding();
  const entrance = useEntrance(60);

  return (
    <Screen title="About" subtitle={`Eternalz v${APP_VERSION}`}>
      <Animated.View style={[styles.stack, entrance]}>
        <View style={styles.hero}>
          <BrandMark size={96} />
          <Text style={styles.wordmark}>ETERNALZ</Text>
          <Text style={[type.body, styles.centered]}>
            A personal toolkit for everyday things — built to grow one tool at a
            time.
          </Text>
          <View style={styles.chips}>
            <Chip label={`v${APP_VERSION}`} tone="accent" />
            <Chip label="Built with Appwrite" tone="muted" />
          </View>
        </View>

        <GlassCard emphasis>
          <Text style={type.overline}>Credited</Text>
          <Text style={[type.h2, styles.creator]}>Designed & built by Waquar Shaikh</Text>
          <Text style={type.body}>
            Every screen, animation and gradient in this app. If something feels
            rough, that&apos;s on the roadmap — not on you.
          </Text>
        </GlassCard>

        <View style={styles.section}>
          <SectionHeading overline="Under the hood" title="Powered by" />
          <GlassCard>
            <ListRow
              icon={<IconCloud size={18} color={colors.accent} />}
              title="Appwrite"
              subtitle={`Project ${APPWRITE_PROJECT_ID} · ${APPWRITE_ENDPOINT}`}
              onPress={() => Linking.openURL(CONSOLE_URL)}
              right={<IconChevronRight size={18} color={colors.textDim} />}
            />
            <ListRow
              icon={<IconWand size={18} color={colors.accent} />}
              title="Expo & React Native"
              subtitle="One codebase for iOS, Android and web"
              last
            />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <SectionHeading overline="Links" title="Elsewhere" />
          <GlassCard>
            <ListRow
              icon={<IconInfo size={18} color={colors.accent} />}
              title="Source on GitHub"
              subtitle="WaquarShaikh5555/app-appwrite"
              onPress={() => Linking.openURL(REPO_URL)}
              right={<IconChevronRight size={18} color={colors.textDim} />}
              last
            />
          </GlassCard>
        </View>

        <Button
          text="Replay the intro tour"
          variant="subtle"
          icon={<IconSparkle size={18} color={colors.text} />}
          onPress={async () => {
            await replay();
            router.replace("/onboarding");
          }}
        />

        <Text style={[type.caption, styles.footer]}>
          © {new Date().getFullYear()} Waquar Shaikh · Eternalz
        </Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space.xl,
  },
  hero: {
    alignItems: "center",
    gap: space.md,
    paddingTop: space.sm,
  },
  wordmark: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    letterSpacing: 6,
    color: colors.text,
  },
  centered: {
    textAlign: "center",
    maxWidth: 420,
  },
  chips: {
    flexDirection: "row",
    gap: space.sm,
  },
  creator: {
    marginTop: space.sm,
    marginBottom: space.sm - 4,
  },
  section: {
    gap: space.md,
  },
  footer: {
    textAlign: "center",
    paddingBottom: space.md,
  },
});
