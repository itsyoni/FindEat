import Text from "@/components/common/AppText";
import SettingsHeader from "@/components/settings/SettingsHeader";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { LegalDocument } from "@findeat/legal";
import { Linking, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowSquareOutIcon } from "phosphor-react-native";

type LegalDocumentScreenProps = {
  document: LegalDocument;
  onlineUrl: string;
  screenTitle: string;
  viewOnlineLabel: string;
};

function LegalText({
  value,
  color,
}: {
  value: string;
  color: string;
}) {
  const email = value.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];

  if (email) {
    return (
      <TouchableOpacity onPress={() => void Linking.openURL(`mailto:${email}`)}>
        <Text
          selectable
          style={{ color: "#D99100", fontSize: 15, lineHeight: 23, marginBottom: 7 }}
        >
          {value}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Text
      selectable
      style={{ color, fontSize: 15, lineHeight: 23, marginBottom: 7 }}
    >
      {value}
    </Text>
  );
}

export default function LegalDocumentScreen({
  document,
  onlineUrl,
  screenTitle,
  viewOnlineLabel,
}: LegalDocumentScreenProps) {
  const { isDark } = useAppTheme();
  const colors = {
    background: isDark ? "#0B0B0A" : "#FBFAF8",
    surface: isDark ? "#111" : "#FAF9F6",
    border: isDark ? "#282828" : "#E7E1D8",
    text: isDark ? "#FAF9F6" : "#171717",
    muted: isDark ? "#D1D5DB" : "#4B5563",
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <SettingsHeader title={screenTitle} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 24,
            padding: 20,
          }}
        >
          <Text weight="bold" style={{ color: colors.text, fontSize: 28 }}>
            {document.title}
          </Text>
          <Text weight="medium" style={{ color: "#D99100", marginTop: 7 }}>
            Effective date: {document.effectiveDate}
          </Text>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => void Linking.openURL(onlineUrl)}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              marginTop: 14,
              marginBottom: 20,
              paddingHorizontal: 12,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: isDark ? "#24201A" : "#FFF4D6",
            }}
          >
            <ArrowSquareOutIcon size={17} color="#B77900" weight="bold" />
            <Text weight="bold" style={{ color: "#B77900", fontSize: 13 }}>
              {viewOnlineLabel}
            </Text>
          </TouchableOpacity>

          <View style={{ marginBottom: 24 }}>
            {document.introduction.map((paragraph) => (
              <LegalText key={paragraph} value={paragraph} color={colors.muted} />
            ))}
          </View>

          {document.sections.map((section) => (
            <View key={section.title} style={{ marginBottom: 24 }}>
              <Text
                weight="bold"
                style={{
                  color: colors.text,
                  fontSize: 19,
                  lineHeight: 25,
                  marginBottom: 9,
                }}
              >
                {section.title}
              </Text>
              {section.paragraphs?.map((paragraph) => (
                <LegalText
                  key={paragraph}
                  value={paragraph}
                  color={colors.muted}
                />
              ))}
              {section.bullets?.map((bullet) => (
                <View
                  key={bullet}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    marginTop: 5,
                    paddingRight: 6,
                  }}
                >
                  <Text
                    style={{
                      color: "#F4B942",
                      fontSize: 18,
                      marginRight: 9,
                      lineHeight: 22,
                    }}
                  >
                    •
                  </Text>
                  <Text
                    selectable
                    style={{
                      flex: 1,
                      color: colors.muted,
                      fontSize: 15,
                      lineHeight: 22,
                    }}
                  >
                    {bullet}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
