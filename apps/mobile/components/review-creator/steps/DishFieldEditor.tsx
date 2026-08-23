import Text from "@/components/common/AppText";
import { TextInput } from "@/components/common";
import { useAppTheme } from "@/contexts/ThemeContext";
import type { ReviewDishFormDraft } from "@findeat/types/review";
import * as Haptics from "expo-haptics";
import { ChatTextIcon, ForkKnifeIcon } from "phosphor-react-native";
import {
  Text as NativeText,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import PriceInput from "../components/PriceInput";
import ReviewDetailEditorShell from "../components/ReviewDetailEditorShell";

export type DishFieldEditorKind = "NAME" | "PRICE" | "RATING" | "NOTE";

function mood(value?: number) {
  if (!value) return "✦";
  if (value <= 3) return "😕";
  if (value <= 5) return "🙂";
  if (value <= 7) return "😊";
  if (value <= 9) return "😍";
  return "🤩";
}

export default function DishFieldEditor({
  kind,
  form,
  onChange,
  onDone,
}: {
  kind: DishFieldEditorKind;
  form: ReviewDishFormDraft;
  onChange: (update: Partial<ReviewDishFormDraft>) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation(["create", "common"]);
  const { isDark } = useAppTheme();
  const title =
    kind === "NAME"
      ? t("dishName")
      : kind === "PRICE"
        ? t("price")
        : kind === "RATING"
          ? t("dishRating")
          : t("dishNote");

  return (
    <ReviewDetailEditorShell title={title} onDone={onDone}>
        {kind === "NAME" ? (
          <View>
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-brand/15">
              <ForkKnifeIcon size={31} color="#D4A72C" weight="duotone" />
            </View>
            <Text className="mb-5 text-base leading-6 text-gray-500 dark:text-gray-400">{t("dishNameEditorHint")}</Text>
            <TextInput
              autoFocus
              value={form.dishName}
              onChangeText={(dishName) => onChange({ dishName })}
              placeholder={t("dishNamePlaceholder")}
              className="rounded-3xl border border-gray-200 bg-[#F7F6F2] px-5 py-5 text-lg text-[#171717] dark:border-gray-700 dark:bg-[#171716] dark:text-[#FAF9F6]"
            />
          </View>
        ) : null}

        {kind === "PRICE" ? (
          <View>
            <Text className="mb-7 text-base leading-6 text-gray-500 dark:text-gray-400">{t("dishPriceEditorHint")}</Text>
            <View className="rounded-2xl bg-black/[0.035] p-5 dark:bg-white/[0.06]">
              <PriceInput label={t("price")} value={form.price} onChange={(price) => onChange({ price })} />
            </View>
          </View>
        ) : null}

        {kind === "NOTE" ? (
          <View>
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-full bg-brand/15">
              <ChatTextIcon size={31} color="#D4A72C" weight="duotone" />
            </View>
            <Text className="mb-5 text-base leading-6 text-gray-500 dark:text-gray-400">{t("dishNoteEditorHint")}</Text>
            <TextInput
              autoFocus
              multiline
              textAlignVertical="top"
              value={form.text}
              onChangeText={(text) => onChange({ text })}
              placeholder={t("dishNotePlaceholder")}
              className="min-h-52 rounded-3xl border border-gray-200 bg-[#F7F6F2] px-5 py-5 text-lg text-[#171717] dark:border-gray-700 dark:bg-[#171716] dark:text-[#FAF9F6]"
            />
          </View>
        ) : null}

        {kind === "RATING" ? (
          <View className="flex-1">
            <Text className="text-center text-base leading-6 text-gray-500 dark:text-gray-400">{t("dishRatingEditorHint")}</Text>
            <View className="flex-1 items-center justify-center py-10">
              <View className="h-36 w-36 items-center justify-center rounded-full bg-brand/15">
                <Text
                  className="text-6xl"
                  style={{ lineHeight: 76, paddingTop: 4 }}
                >
                  {mood(form.rating)}
                </Text>
              </View>
              <Text className="mt-6 text-5xl font-bold text-[#171717] dark:text-[#FAF9F6]">{form.rating ? `${form.rating}/10` : "—"}</Text>
              <Text className="mt-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{form.rating ? t("tapAnotherRating") : t("chooseRating")}</Text>
            </View>
            <View className="pb-2">
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => {
                  const selected = form.rating === value;
                  const filled = form.rating != null && value <= form.rating;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        onChange({ rating: value });
                      }}
                      style={{ width: "18%" }}
                      className={`aspect-square items-center justify-center rounded-2xl border ${selected ? "border-brand bg-brand" : filled ? "border-brand/40 bg-brand/15" : "border-gray-200 bg-[#FAF9F6] dark:border-gray-700 dark:bg-[#242422]"}`}
                    >
                      <View
                        pointerEvents="none"
                        className="absolute inset-0 items-center justify-center"
                      >
                        <NativeText
                          style={{
                            color: selected
                              ? "#171717"
                              : filled
                                ? "#D4A72C"
                                : isDark
                                  ? "#FAF9F6"
                                  : "#171717",
                            fontFamily: "CabinetBold",
                            fontSize: 18,
                            lineHeight: 20,
                            includeFontPadding: false,
                            textAlign: "center",
                            transform: [{ translateY: -1 }],
                          }}
                        >
                          {value}
                        </NativeText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {form.rating ? (
              <TouchableOpacity onPress={() => onChange({ rating: undefined })} className="mt-5 items-center py-3">
                <Text className="font-semibold text-gray-500">{t("removeRating")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
    </ReviewDetailEditorShell>
  );
}
