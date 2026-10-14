import { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { IconChevronLeft } from "@/components/icons";
import { colors, radius, space, type } from "@/theme/tokens";

interface ScreenProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle | ViewStyle[];
  /**
   * Where the back control goes when there is no history to pop — for screens
   * outside the tab navigator (which have no tab bar and, in an embedded
   * preview, no browser back button either).
   */
  backFallback?: string;
}

/**
 * Page shell: safe-area aware, a fixed glass header, and content constrained to
 * a comfortable reading width on large screens.
 */
export const Screen = ({
  children,
  title,
  subtitle,
  back = true,
  right,
  scroll = true,
  contentStyle,
  backFallback = "/",
}: ScreenProps) => {
  const router = useRouter();
  const hasHeader = Boolean(title) || back;

  const body = (
    <View style={[styles.column, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      {hasHeader && (
        <View style={styles.header}>
          {back ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace(backFallback as never)
              }
              style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
            >
              <IconChevronLeft size={20} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}

          <View style={styles.headerText}>
            {title ? (
              <Text style={type.title} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={type.caption} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.right}>{right}</View>
        </View>
      )}

      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{body}</View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backPressed: {
    backgroundColor: colors.accentSoft,
  },
  backSpacer: {
    width: 40,
  },
  headerText: {
    flex: 1,
    justifyContent: "center",
  },
  right: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  scrollContent: {
    padding: space.xl,
    alignItems: "center",
  },
  fill: {
    flex: 1,
    padding: space.xl,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 560,
    gap: space.lg,
  },
});
