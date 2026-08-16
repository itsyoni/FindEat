import Text from "@/components/common/AppText";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { NativeSyntheticEvent, TextLayoutEventData, TextStyle } from "react-native";
import { TouchableOpacity, View } from "react-native";

type Props = {
  text: string;
  isRtl: boolean;
  tone?: "surface" | "overlay";
  textClassName?: string;
  textStyle?: TextStyle;
  authorName?: string | null;
  onAuthorPress?: () => void;
  onExpansionChange?: (expanded: boolean, fullTextHeight: number) => void;
};

export default function ExpandablePostCaption({
  text,
  isRtl,
  tone = "surface",
  textClassName,
  textStyle,
  authorName,
  onAuthorPress,
  onExpansionChange,
}: Props) {
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [fullTextHeight, setFullTextHeight] = useState(24);
  const canExpand = lineCount > 1;
  const directionStyle: TextStyle = {
    textAlign: "auto",
    writingDirection: isRtl ? "rtl" : "ltr",
    // Keep single-line captions on the same baseline and height. Emoji glyphs
    // otherwise report slightly taller font metrics and shift nearby content.
    lineHeight: 22,
    ...textStyle,
  };
  function measureText(event: NativeSyntheticEvent<TextLayoutEventData>) {
    const lines = event.nativeEvent.lines;
    const nextLineCount = Math.max(lines.length, 1);
    const nextHeight = Math.max(
      24,
      lines.reduce((height, line) => height + line.height, 0),
    );

    if (nextLineCount !== lineCount) setLineCount(nextLineCount);
    if (Math.abs(nextHeight - fullTextHeight) > 0.5) {
      setFullTextHeight(nextHeight);
    }
  }

  function toggleExpanded() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    onExpansionChange?.(nextExpanded, fullTextHeight);
  }

  const captionClass =
    textClassName ??
    (tone === "overlay"
      ? "text-base text-white"
      : "text-gray-700 dark:text-gray-300");
  const actionClass =
    tone === "overlay"
      ? "text-sm font-bold text-white"
      : "text-sm font-bold text-black dark:text-white";
  const authorPrefix = authorName?.trim().replace(/^@+/, "") || null;

  const author = (interactive = false) =>
    authorPrefix ? (
      <Text
        numberOfLines={1}
        weight="bold"
        className={captionClass}
        style={{
          maxWidth: "42%",
          flexShrink: 0,
          textAlign: "left",
          writingDirection: "auto",
        }}
        onPress={interactive ? onAuthorPress : undefined}
        accessibilityRole={interactive && onAuthorPress ? "link" : undefined}
      >
        {authorPrefix}
      </Text>
    ) : null;

  return (
    <View className="relative">
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          {
            position: "absolute",
            flexDirection: "row",
            direction: "ltr",
            alignItems: "flex-start",
            gap: authorPrefix ? 5 : 0,
            width: "100%",
            opacity: 0,
            zIndex: -1,
          },
        ]}
      >
        {author()}
        <Text
          onTextLayout={measureText}
          className={`flex-1 ${captionClass}`}
          style={directionStyle}
        >
          {text}
        </Text>
      </View>

      {expanded ? (
        <View>
          <View
            style={{
              flexDirection: "row",
              direction: "ltr",
              alignItems: "flex-start",
              gap: authorPrefix ? 5 : 0,
            }}
          >
            {author(true)}
            <Text className={`flex-1 ${captionClass}`} style={directionStyle}>
              {text}
            </Text>
          </View>
          {canExpand ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={toggleExpanded}
              style={{ alignSelf: "flex-end" }}
              className="mt-1"
            >
              <Text className={actionClass}>{t("showLess")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View
          className="flex-row items-center"
          style={{
            flexDirection: "row",
            direction: "ltr",
            gap: authorPrefix ? 5 : 0,
            minHeight: 22,
          }}
        >
          {author(true)}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className={`flex-1 ${captionClass}`}
            style={directionStyle}
          >
            {text}
          </Text>
          {canExpand ? (
            <TouchableOpacity activeOpacity={0.75} onPress={toggleExpanded}>
              <Text className={actionClass}>{t("showMore")}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}
