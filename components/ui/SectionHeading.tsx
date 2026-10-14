import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { space, type } from "@/theme/tokens";

interface SectionHeadingProps {
  overline?: string;
  title: string;
  right?: ReactNode;
}

export const SectionHeading = ({ overline, title, right }: SectionHeadingProps) => (
  <View style={styles.wrap}>
    <View style={styles.text}>
      {overline ? <Text style={type.overline}>{overline}</Text> : null}
      <Text style={type.h2}>{title}</Text>
    </View>
    {right}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: space.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
