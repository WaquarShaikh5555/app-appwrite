import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/auth";
import { fontStyles } from "@/styles/font";

/** Thin bar at the top of the home screen showing auth state. */
export const AccountBar = () => {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <View style={styles.bar}>
        <Text style={fontStyles.bodyM}>Checking session…</Text>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      {user ? (
        <>
          <TouchableOpacity onPress={() => router.push("/profile")}>
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.action}>Log out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={fontStyles.bodyM}>Not signed in</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={styles.action}>Sign up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.action}>Log in</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDF0",
  },
  actions: {
    flexDirection: "row",
    gap: 16,
  },
  email: {
    ...fontStyles.bodyM,
    color: "#2D2D31",
    flexShrink: 1,
  },
  action: {
    ...fontStyles.bodyM,
    color: "#FD366E",
    fontWeight: "600",
  },
});
