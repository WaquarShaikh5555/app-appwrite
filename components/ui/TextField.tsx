import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { colors, fonts, radius, space, type } from "@/theme/tokens";

interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
}

/** Dark input with a violet focus ring and inline validation message. */
export const TextField = ({ label, hint, error, style, ...props }: TextFieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textDim}
        selectionColor={colors.primaryBright}
        cursorColor={colors.primaryBright}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    gap: space.sm - 2,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.body,
  },
  inputFocused: {
    borderColor: colors.primaryBright,
    backgroundColor: "rgba(139,92,246,0.10)",
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    ...type.caption,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
});
