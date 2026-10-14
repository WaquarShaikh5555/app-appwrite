import { StyleSheet, TextInput, TextInputProps, View, Text } from "react-native";
import { fontStyles } from "@/styles/font";

interface TextFieldProps extends TextInputProps {
  label: string;
}

export const TextField = ({ label, ...props }: TextFieldProps) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      placeholderTextColor="#9A9AA1"
      style={styles.input}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    ...fontStyles.bodyMBold,
  },
  input: {
    backgroundColor: "#FFF",
    borderColor: "#EDEDF0",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#2D2D31",
    fontFamily: "Inter_400Regular",
  },
});
