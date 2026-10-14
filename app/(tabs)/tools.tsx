import { useState } from "react";
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
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconSparkle, IconWand } from "@/components/icons";
import { ROADMAP, statusLabel, type ToolStatus } from "@/constants/roadmap";
import { useEntrance } from "@/hooks/useEntrance";
import { colors, fonts, radius, space, type } from "@/theme/tokens";

const toneForStatus = (status: ToolStatus) =>
  status === "live"
    ? ("success" as const)
    : status === "soon"
      ? ("accent" as const)
      : ("muted" as const);

export default function ToolsScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const intro = useEntrance(40);

  // Two columns when there's room (web/tablet), one on a phone.
  const columns = width >= 640 ? 2 : 1;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <Animated.View style={[styles.header, intro]}>
            <Text style={type.overline}>Toolbox</Text>
            <Text style={type.display}>Tools</Text>
            <Text style={type.body}>
              Every Eternalz tool lands here. Live ones open when you tap them.
            </Text>
          </Animated.View>

          <Animated.View style={[styles.bannerWrap, intro]}>
            <GlassCard emphasis>
              <View style={styles.bannerRow}>
                <View style={styles.bannerIcon}>
                  <IconWand size={22} color={colors.primaryBright} />
                </View>
                <View style={styles.bannerText}>
                  <Text style={type.bodyStrong}>One tool live, more on the way</Text>
                  <Text style={[type.caption, styles.bannerBody]}>
                    Document Manager has shipped. The rest of the roadmap is being
                    built now — announcements land in Settings.
                  </Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <View style={[styles.grid, { gap: space.md }]}>
            {ROADMAP.map((tool, index) => {
              const open = openId === tool.id;
              const itemStyle = useEntrance(120 + index * 45);
              return (
                <Animated.View
                  key={tool.id}
                  style={[
                    itemStyle,
                    {
                      width:
                        columns === 2
                          ? `calc(50% - ${space.md / 2}px)` as unknown as number
                          : "100%",
                    },
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${tool.name} — ${statusLabel[tool.status]}`}
                    onPress={() => {
                      if (tool.status === "live" && tool.route) {
                        router.push(tool.route as never);
                        return;
                      }
                      setOpenId(open ? null : tool.id);
                    }}
                  >
                    <GlassCard emphasis={open} style={styles.card}>
                      <View style={styles.iconTile}>
                        <tool.icon size={22} color={colors.accent} />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={type.bodyStrong}>{tool.name}</Text>
                        <Text style={type.caption} numberOfLines={open ? undefined : 2}>
                          {tool.description}
                        </Text>
                      </View>
                      <Chip label={statusLabel[tool.status]} tone={toneForStatus(tool.status)} />
                      {open ? (
                        <View style={styles.note}>
                          <IconSparkle size={14} color={colors.primaryBright} />
                          <Text style={[type.caption, styles.noteText]}>
                            Not shipped yet. It will appear right here the day it
                            goes live — announcements land in Settings.
                          </Text>
                        </View>
                      ) : null}
                    </GlassCard>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: space.xl,
    paddingBottom: space.xxxl,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 720,
    gap: space.lg,
  },
  header: {
    gap: space.xs,
    paddingTop: space.xl,
  },
  bannerWrap: {
    marginTop: space.xs,
  },
  bannerRow: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "flex-start",
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  bannerText: {
    flex: 1,
    gap: 3,
  },
  bannerBody: {
    maxWidth: 520,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: space.xs,
  },
  card: {
    gap: space.md,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: {
    gap: 3,
  },
  note: {
    flexDirection: "row",
    gap: space.sm,
    alignItems: "flex-start",
    marginTop: space.xs,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  noteText: {
    flex: 1,
    color: colors.textMuted,
  },
});
