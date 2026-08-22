import Text from "@/components/common/AppText";
import { useCoachMarks, type CoachMarkKey } from "@/contexts/CoachMarkContext";
import { useFocusEffect } from "expo-router";
import { LightbulbFilamentIcon } from "phosphor-react-native";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { StyleProp, ViewStyle } from "react-native";
import { TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

export default function ContextualCoachMark({
  markKey,
  style,
}: {
  markKey: CoachMarkKey;
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation("onboarding");
  const { activeKey, request, dismiss } = useCoachMarks();

  useFocusEffect(
    useCallback(() => {
      request(markKey);
    }, [markKey, request]),
  );

  if (activeKey !== markKey) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(160)}
      className="absolute left-5 right-5 z-500 flex-row items-center rounded-2xl bg-[#2B2A28]/95 p-3.5 shadow-lg"
      style={style}
      accessibilityRole="alert"
    >
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F7D786]/20">
        <LightbulbFilamentIcon size={22} color="#F7D786" weight="duotone" />
      </View>
      <Text className="mx-3 flex-1 leading-5 text-[#FAF9F6]">
        {t(`coachMarks.${markKey}`)}
      </Text>
      <TouchableOpacity
        onPress={() => void dismiss(markKey)}
        className="min-h-10 justify-center px-2"
        accessibilityRole="button"
        accessibilityLabel={t("coachMarks.dismiss")}
      >
        <Text weight="bold" className="text-[#F7D786]">{t("coachMarks.dismiss")}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
