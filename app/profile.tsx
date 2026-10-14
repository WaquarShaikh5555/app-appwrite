import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/auth";
import { APPWRITE_PROJECT_NAME } from "@/constants/appwrite";
import { fontStyles } from "@/styles/font";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <Screen title="Profile">
        <Text style={fontStyles.bodyM}>Checking session…</Text>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen title="Profile" subtitle="You are not signed in.">
        <Button text="Log in" onPress={() => router.replace("/login")} />
      </Screen>
    );
  }

  const rows: Array<[string, string]> = [
    ["Name", user.name || "—"],
    ["Email", user.email],
    ["Email verified", user.emailVerification ? "Yes" : "No"],
    ["User ID", user.$id],
    ["Created", new Date(user.$createdAt).toLocaleDateString()],
    ["Project", APPWRITE_PROJECT_NAME],
  ];

  return (
    <Screen title="Profile" subtitle="Your Appwrite account.">
      <View style={styles.card}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value} numberOfLines={2}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      <Button
        text="Log out"
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderColor: "#EDEDF0",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  label: {
    ...fontStyles.bodyMBold,
  },
  value: {
    ...fontStyles.bodyM,
    color: "#2D2D31",
    flexShrink: 1,
    textAlign: "right",
  },
});
