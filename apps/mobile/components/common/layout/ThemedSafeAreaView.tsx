import { useAppTheme } from "@/contexts/ThemeContext";
import { lightPalette } from "@/constants/palette";
import type { ComponentProps } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = ComponentProps<typeof SafeAreaView>;

export default function ThemedSafeAreaView({ style, ...props }: Props) {
  const { isDark } = useAppTheme();

  return (
    <SafeAreaView
      {...props}
      style={[
        { flex: 1, backgroundColor: isDark ? "#0B0B0A" : lightPalette.canvas },
        style,
      ]}
    />
  );
}
