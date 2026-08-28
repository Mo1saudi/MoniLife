import { Text, TextInput } from "react-native";

export const CAIRO_FONT = {
  regular: "Cairo_400Regular",
  medium: "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
} as const;

type DefaultStyledComponent = { defaultProps?: { style?: unknown } };

/** Applies Cairo across existing screens while preserving each component's own style array. */
export function applyCairoTypographyDefaults() {
  const text = Text as unknown as DefaultStyledComponent;
  const input = TextInput as unknown as DefaultStyledComponent;
  if (!text.defaultProps?.style) text.defaultProps = { ...text.defaultProps, style: { fontFamily: CAIRO_FONT.regular } };
  if (!input.defaultProps?.style) input.defaultProps = { ...input.defaultProps, style: { fontFamily: CAIRO_FONT.regular } };
}
