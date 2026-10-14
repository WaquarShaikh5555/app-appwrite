import { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { fontStyles } from "@/styles/font";

interface ScreenProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Shared page shell: back link, title, and a centred column of content. */
export const Screen = ({ title, subtitle, children }: ScreenProps) => {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.column}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        >
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={fontStyles.titleL}>{title}</Text>
        {subtitle ? <Text style={fontStyles.bodyM}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAFAFB",
  },
  content: {
    padding: 20,
    alignItems: "center",
  },
  column: {
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  back: {
    ...fontStyles.bodyM,
    color: "#FD366E",
    marginBottom: 8,
  },
  body: {
    gap: 16,
    marginTop: 8,
  },
});
