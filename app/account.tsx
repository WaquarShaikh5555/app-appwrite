import { Animated, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { IconLogOut, IconShield, IconUser } from "@/components/icons";
import { APPWRITE_PROJECT_NAME } from "@/constants/appwrite";
import { useAuth } from "@/context/auth";
import { useEntrance } from "@/hooks/useEntrance";
import { colors, space, type } from "@/theme/tokens";

export default function AccountScreen() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const entrance = useEntrance(60);

  if (loading) {
    return (
      <Screen title="Account">
        <Text style={type.body}>Checking your session…</Text>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen title="Account" subtitle="Not signed in">
        <View style={styles.empty}>
          <BrandMark size={64} />
          <Text style={[type.h2, styles.centered]}>You&apos;re not signed in</Text>
          <Text style={[type.body, styles.centered]}>
            Log in to see your account details.
          </Text>
          <View style={styles.emptyActions}>
            <Button text="Log in" onPress={() => router.replace("/login")} />
            <Button
              text="Create account"
              variant="ghost"
              onPress={() => router.replace("/signup")}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const created = new Date(user.$createdAt);
  const rows: Array<{ label: string; value: string }> = [
    { label: "Name", value: user.name || "—" },
    { label: "Email", value: user.email },
    { label: "Email verified", value: user.emailVerification ? "Yes" : "Not yet" },
    { label: "User ID", value: user.$id },
    {
      label: "Member since",
      value: created.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    },
    { label: "Project", value: APPWRITE_PROJECT_NAME },
  ];

  return (
    <Screen title="Account" subtitle="Your Eternalz profile">
      <Animated.View style={[styles.stack, entrance]}>
        <GlassCard>
          <View style={styles.identity}>
            <BrandMark size={52} />
            <View style={styles.identityText}>
              <Text style={type.bodyStrong} numberOfLines={1}>
                {user.name || "Eternalz member"}
              </Text>
              <Text style={type.caption} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <Chip
              label={user.emailVerification ? "Verified" : "Unverified"}
              tone={user.emailVerification ? "success" : "muted"}
            />
          </View>
        </GlassCard>

        <View style={styles.section}>
          <SectionHeading overline="Details" title="Account information" />
          <GlassCard>
            {rows.map((row, index) => (
              <ListRow
                key={row.label}
                icon={
                  index === 0 ? (
                    <IconUser size={18} color={colors.accent} />
                  ) : (
                    <IconShield size={18} color={colors.accent} />
                  )
                }
                title={row.label}
                subtitle={row.value}
                last={index === rows.length - 1}
              />
            ))}
          </GlassCard>
        </View>

        <Button
          text="Log out"
          variant="ghost"
          icon={<IconLogOut size={18} color={colors.text} />}
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: space.xl,
  },
  empty: {
    alignItems: "center",
    gap: space.md,
    paddingTop: space.xl,
  },
  centered: {
    textAlign: "center",
  },
  emptyActions: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.sm,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: space.md,
  },
});
