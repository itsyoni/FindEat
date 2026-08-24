import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import SelectionPill from "@/components/common/SelectionPill";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import RelationshipActionButton from "@/components/profile/RelationshipActionButton";
import { useAccessibilityPreferences } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";
import {
  ALLERGEN_OPTIONS,
  CUISINE_OPTIONS,
  FOOD_INTERESTS,
  type FollowSuggestion,
  type OnboardingProgress,
  type OnboardingState,
  type OnboardingStep,
  type UserRelationship,
} from "@findeat/types";
import {
  getNextRelationshipAfterToggle,
  shouldRemoveFollowRelationship,
} from "@findeat/utils";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { Camera } from "expo-camera";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  BellIcon,
  CameraIcon,
  CheckIcon,
  ImageSquareIcon,
  MapPinIcon,
  XIcon,
} from "phosphor-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type OnboardingScreenStep = Exclude<
  OnboardingStep,
  "SAVE_TUTORIAL" | "DISH_REVIEWS" | "COMPLETION" | "COMPLETED"
>;

const FLOW: OnboardingScreenStep[] = [
  "FOOD_PREFERENCES",
  "DIETARY_PREFERENCES",
  "ALLERGIES",
  "LOCATION",
  "CAMERA_PERMISSION",
  "PHOTOS_PERMISSION",
  "NOTIFICATIONS_PERMISSION",
  "SOCIAL_DISCOVERY",
];

const DIETARY_OPTIONS = [
  "KOSHER_ONLY",
  "HALAL_ONLY",
  "VEGETARIAN",
  "VEGAN",
  "NO_PORK",
  "GLUTEN_FREE",
] as const;

type DietaryOption = (typeof DIETARY_OPTIONS)[number];

function favoriteCuisinesFromInterests(interests: string[]) {
  const mapped = interests.flatMap((interest) => {
    if (interest === "SUSHI") return ["JAPANESE"];
    if (
      interest === "BURGERS" ||
      interest === "STEAKHOUSES" ||
      interest === "BBQ"
    ) {
      return ["AMERICAN"];
    }
    if (interest === "TACOS") return ["MEXICAN"];
    return [interest];
  });

  return [...new Set(mapped)].filter((value) =>
    (CUISINE_OPTIONS as readonly string[]).includes(value),
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation("onboarding");
  const { isDark } = useAppTheme();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState<OnboardingScreenStep>("FOOD_PREFERENCES");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const index = Math.max(0, FLOW.indexOf(step));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await api.onboarding.get();
      setState(next);
      const resumedStep = next.onboardingStep;
      setStep(
        resumedStep === "SAVE_TUTORIAL"
          ? "CAMERA_PERMISSION"
          : resumedStep === "DISH_REVIEWS"
            ? "PHOTOS_PERMISSION"
            : resumedStep === "COMPLETION"
              ? "SOCIAL_DISCOVERY"
          : resumedStep && resumedStep !== "COMPLETED"
                ? resumedStep
                : "FOOD_PREFERENCES",
      );
    } catch {
      setError(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load]);

  async function persist(
    nextStep: OnboardingScreenStep,
    patch: Parameters<typeof api.onboarding.update>[0] = {},
  ) {
    if (saving) return;
    if (nextStep === "NOTIFICATIONS_PERMISSION") {
      setError("");
      setStep(nextStep);
      return;
    }
    const serverStep: OnboardingStep =
      nextStep === "CAMERA_PERMISSION"
        ? "SAVE_TUTORIAL"
        : nextStep === "PHOTOS_PERMISSION"
          ? "DISH_REVIEWS"
          : nextStep;
    setSaving(true);
    setError("");
    try {
      const next = await api.onboarding.update({ ...patch, step: serverStep });
      setState(next);
      setStep(nextStep);
    } catch {
      setError(t("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  async function goBack() {
    if (index <= 0) return;
    const previousStep = FLOW[index - 1];
    await persist(previousStep);
  }

  if (loading || !state) {
    return (
      <OnboardingBackground isDark={isDark}>
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {error ? (
          <View className="items-center px-8">
            <Text className="text-center text-gray-500 dark:text-gray-400">{error}</Text>
            <PrimaryButton label={t("common:retry")} onPress={() => void load()} />
          </View>
        ) : (
          <ActivityIndicator color="#D6A92D" />
        )}
      </SafeAreaView>
      </OnboardingBackground>
    );
  }

  return (
    <OnboardingBackground isDark={isDark}>
    <SafeAreaView style={{ flex: 1, minHeight: 0 }}>
      <View className="flex-row items-center px-5 pb-2 pt-3">
        {index > 0 ? (
          <TouchableOpacity
            onPress={() => void goBack()}
            disabled={saving}
            className="h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
            accessibilityRole="button"
            accessibilityLabel={t("common:back")}
          >
            <DirectionalIcon
              direction="back"
              size={23}
              color={isDark ? "#FAF9F6" : "#171717"}
            />
          </TouchableOpacity>
        ) : (
          <View className="h-11 w-11" />
        )}
        <View className="mx-4 flex-1 flex-row gap-1.5">
          {FLOW.map((item, itemIndex) => (
            <View
              key={item}
              className={`h-1.5 flex-1 rounded-full ${
                itemIndex <= index ? "bg-[#D6A92D]" : "bg-black/10 dark:bg-white/15"
              }`}
            />
          ))}
        </View>
        <Text className="w-11 text-center text-xs text-gray-500">
          {t("progress", { current: index + 1, total: FLOW.length })}
        </Text>
      </View>

      <View key={step} style={{ flex: 1, minHeight: 0, width: "100%" }}>
        {step === "FOOD_PREFERENCES" ? (
          <FoodPreferencesStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "DIETARY_PREFERENCES" ? (
          <DietaryPreferencesStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "ALLERGIES" ? (
          <AllergiesStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "LOCATION" ? (
          <LocationStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "CAMERA_PERMISSION" ? (
          <CameraPermissionStep saving={saving} persist={persist} />
        ) : null}
        {step === "PHOTOS_PERMISSION" ? (
          <PhotosPermissionStep saving={saving} persist={persist} />
        ) : null}
        {step === "NOTIFICATIONS_PERMISSION" ? (
          <NotificationsPermissionStep saving={saving} persist={persist} />
        ) : null}
        {step === "SOCIAL_DISCOVERY" ? (
          <SocialStep
            state={state}
            saving={saving}
            onComplete={async (followedUserIds) => {
              setSaving(true);
              try {
                await api.onboarding.update({
                  step: "SOCIAL_DISCOVERY",
                  progress: { followedUserIds },
                });
                await api.onboarding.complete();
                await refreshUser();
                router.replace("/(tabs)");
              } catch {
                setError(t("somethingWentWrong"));
              } finally {
                setSaving(false);
              }
            }}
          />
        ) : null}
      </View>

      {error ? (
        <Text className="px-6 pb-2 text-center text-sm text-red-500">{error}</Text>
      ) : null}
    </SafeAreaView>
    </OnboardingBackground>
  );
}

function OnboardingBackground({ isDark, children }: { isDark: boolean; children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B0B0A" : "#FBFAF8" }}>
      <Image
        source={require("@/assets/images/auth-bg.png")}
        contentFit="cover"
        style={{ position: "absolute", inset: 0, opacity: isDark ? 0.55 : 0.38 }}
      />
      <BlurView
        intensity={38}
        tint={isDark ? "dark" : "light"}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={{ position: "absolute", inset: 0 }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: isDark ? "rgba(11,11,10,0.72)" : "rgba(251,250,248,0.76)",
        }}
      />
      {children}
    </View>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { isDark } = useAppTheme();

  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 }}>
      <Text
        weight="black"
        style={{ color: isDark ? "#FAF9F6" : "#171715", fontSize: 30, lineHeight: 36 }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: 8,
            color: isDark ? "#A8A8A3" : "#6B6B67",
            fontSize: 16,
            lineHeight: 24,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { isDark } = useAppTheme();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={{
        minHeight: 56,
        marginTop: 16,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        paddingHorizontal: 20,
        backgroundColor: isDisabled
          ? isDark
            ? "rgba(250,249,246,0.1)"
            : "rgba(23,23,21,0.1)"
          : isDark
            ? "#FAF9F6"
            : "#171715",
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color="#D6A92D" />
      ) : (
        <Text
          weight="bold"
          style={{
            color: isDisabled ? "#9B9B96" : isDark ? "#171715" : "#FAF9F6",
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function PreferNotToSayCheckbox({
  checked,
  onPress,
  label,
}: {
  checked: boolean;
  onPress: () => void;
  label?: string;
}) {
  const { t } = useTranslation("onboarding");
  const { isDark } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={{
        minHeight: 48,
        marginTop: 18,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: checked
            ? "#D6A92D"
            : isDark
              ? "rgba(250,249,246,0.35)"
              : "rgba(23,23,21,0.3)",
          backgroundColor: checked ? "#D6A92D" : "transparent",
        }}
      >
        {checked ? <CheckIcon size={17} color="#171715" weight="bold" /> : null}
      </View>
      <Text
        style={{
          marginLeft: 12,
          color: isDark ? "#FAF9F6" : "#171715",
          fontSize: 16,
        }}
      >
        {label ?? t("preferNotToSay")}
      </Text>
    </TouchableOpacity>
  );
}

function FoodPreferencesStep({
  state,
  saving,
  persist,
}: StepProps) {
  const { t } = useTranslation("onboarding");
  const { isDark } = useAppTheme();
  const { reduceMotion } = useAccessibilityPreferences();
  const [selected, setSelected] = useState<string[]>(state.foodInterests ?? []);
  const [preferNotToSay, setPreferNotToSay] = useState(
    !!state.onboardingProgress?.foodPreferencesPreferNotToSay,
  );

  function toggle(value: string) {
    if (!reduceMotion) void Haptics.selectionAsync();
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <StepHeader title={t("foodTitle")} subtitle={t("foodSubtitle")} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {FOOD_INTERESTS.map((interest) => (
            <SelectionPill
              key={interest}
              label={t(`foodInterests.${interest}`)}
              selected={selected.includes(interest)}
              onPress={() => toggle(interest)}
              disabled={preferNotToSay}
            />
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        {!preferNotToSay && selected.length < 3 ? (
          <Text
            style={{
              color: isDark ? "#A8A8A3" : "#6B6B67",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {t("foodMinimum")} · {selected.length}/3
          </Text>
        ) : null}
        <PreferNotToSayCheckbox
          checked={preferNotToSay}
          onPress={() => {
            if (!reduceMotion) void Haptics.selectionAsync();
            setPreferNotToSay((current) => {
              const next = !current;
              if (next) setSelected([]);
              return next;
            });
          }}
        />
        <PrimaryButton
          label={t("continue")}
          disabled={!preferNotToSay && selected.length < 3}
          loading={saving}
          onPress={() =>
            void persist("DIETARY_PREFERENCES", {
              foodInterests: preferNotToSay ? [] : selected,
              favoriteCuisines: preferNotToSay
                ? []
                : favoriteCuisinesFromInterests(selected),
              progress: { foodPreferencesPreferNotToSay: preferNotToSay },
            })
          }
        />
      </View>
    </View>
  );
}

type StepProps = {
  state: OnboardingState;
  saving: boolean;
  persist: (
    nextStep: OnboardingScreenStep,
    patch?: Parameters<typeof api.onboarding.update>[0],
  ) => Promise<void>;
};

function DietaryPreferencesStep({ state, saving, persist }: StepProps) {
  const { t } = useTranslation("onboarding");
  const { reduceMotion } = useAccessibilityPreferences();
  const [selected, setSelected] = useState<DietaryOption[]>(() => {
    const values: DietaryOption[] = [];
    if (state.restaurantDietaryRequirements.includes("KOSHER_ONLY")) values.push("KOSHER_ONLY");
    if (state.restaurantDietaryRequirements.includes("HALAL_ONLY")) values.push("HALAL_ONLY");
    if (state.foodPreferences.includes("VEGETARIAN")) values.push("VEGETARIAN");
    if (state.foodPreferences.includes("VEGAN")) values.push("VEGAN");
    if (state.dietaryRestrictions.includes("NO_PORK")) values.push("NO_PORK");
    if (state.dietaryRestrictions.includes("GLUTEN_FREE")) values.push("GLUTEN_FREE");
    return values;
  });
  const [preferNotToSay, setPreferNotToSay] = useState(
    !!state.onboardingProgress?.dietaryPreferencesPreferNotToSay,
  );

  function toggle(value: DietaryOption) {
    void Haptics.selectionAsync();
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  const patch = {
    foodPreferences: selected.filter((item) => item === "VEGAN" || item === "VEGETARIAN"),
    dietaryRestrictions: selected.filter(
      (item) => item === "NO_PORK" || item === "GLUTEN_FREE",
    ),
    restaurantDietaryRequirements: selected.filter(
      (item) => item === "KOSHER_ONLY" || item === "HALAL_ONLY",
    ),
  };

  return (
    <View className="flex-1">
      <StepHeader title={t("dietaryTitle")} subtitle={t("dietarySubtitle")} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 18 }}
      >
        <View className="flex-row flex-wrap gap-2.5">
          {DIETARY_OPTIONS.map((option) => (
            <SelectionPill
              key={option}
              label={t(`dietary.${option}`)}
              selected={selected.includes(option)}
              onPress={() => toggle(option)}
              disabled={preferNotToSay}
            />
          ))}
        </View>
      </ScrollView>
      <View className="px-6 pb-3">
        <PreferNotToSayCheckbox
          checked={preferNotToSay}
          label={t("dietaryNoneOrPreferNotToSay")}
          onPress={() => {
            if (!reduceMotion) void Haptics.selectionAsync();
            setPreferNotToSay((current) => {
              const next = !current;
              if (next) setSelected([]);
              return next;
            });
          }}
        />
        <PrimaryButton
          label={t("continue")}
          disabled={!preferNotToSay && selected.length === 0}
          loading={saving}
          onPress={() =>
            void persist("ALLERGIES", {
              ...(preferNotToSay
                ? {
                    foodPreferences: [],
                    dietaryRestrictions: [],
                    restaurantDietaryRequirements: [],
                  }
                : patch),
              progress: { dietaryPreferencesPreferNotToSay: preferNotToSay },
            })
          }
        />
      </View>
    </View>
  );
}

function AllergiesStep({ state, saving, persist }: StepProps) {
  const { t } = useTranslation("onboarding");
  const { isDark } = useAppTheme();
  const { reduceMotion } = useAccessibilityPreferences();
  const [selected, setSelected] = useState<string[]>(state.allergies ?? []);
  const [preferNotToSay, setPreferNotToSay] = useState(
    !!state.onboardingProgress?.allergiesPreferNotToSay,
  );
  const [suggestionOpen, setSuggestionOpen] = useState(false);

  function toggle(value: string) {
    if (!reduceMotion) void Haptics.selectionAsync();
    setPreferNotToSay(false);
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function togglePreferNotToSay() {
    if (!reduceMotion) void Haptics.selectionAsync();
    setPreferNotToSay((current) => {
      const next = !current;
      if (next) setSelected([]);
      return next;
    });
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <StepHeader title={t("allergiesTitle")} subtitle={t("allergiesSubtitle")} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingBottom: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {ALLERGEN_OPTIONS.map((allergen) => (
            <SelectionPill
              key={allergen}
              label={t(`allergen.${allergen}`)}
              selected={selected.includes(allergen)}
              onPress={() => toggle(allergen)}
              disabled={preferNotToSay}
            />
          ))}
        </View>
        <Text
          style={{
            marginTop: 20,
            color: isDark ? "#A8A8A3" : "#6B6B67",
            fontSize: 12,
            lineHeight: 20,
          }}
        >
          {t("allergiesSafety")}
        </Text>
        <TouchableOpacity
          onPress={() => setSuggestionOpen(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          style={{ alignSelf: "flex-start", marginTop: 14, paddingVertical: 8 }}
        >
          <Text weight="bold" style={{ color: "#C38C00", fontSize: 15 }}>
            {t("missingAllergyAction")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        <PreferNotToSayCheckbox
          checked={preferNotToSay}
          onPress={togglePreferNotToSay}
          label={t("allergiesNoneOrPreferNotToSay")}
        />
        <PrimaryButton
          label={t("continue")}
          disabled={!preferNotToSay && selected.length === 0}
          loading={saving}
          onPress={() =>
            void persist("LOCATION", {
              allergies: preferNotToSay ? [] : selected,
              progress: { allergiesPreferNotToSay: preferNotToSay },
            })
          }
        />
      </View>
      <AllergySuggestionModal
        visible={suggestionOpen}
        onClose={() => setSuggestionOpen(false)}
      />
    </View>
  );
}

function AllergySuggestionModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation("onboarding");
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [allergy, setAllergy] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const colors = {
    background: isDark ? "#11110F" : "#FBFAF8",
    surface: isDark ? "#1D1D1A" : "#F1EEE8",
    border: isDark ? "#383833" : "#DDD7CD",
    text: isDark ? "#FAF9F6" : "#171715",
    muted: isDark ? "#A8A8A3" : "#6B6B67",
  };
  const canSubmit = allergy.trim().length >= 2 && !submitting;

  function close() {
    if (submitting) return;
    setAllergy("");
    setDetails("");
    onClose();
  }

  async function submit() {
    const name = allergy.trim();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.support.create({
        category: "FEATURE_REQUEST",
        subject: `Allergy suggestion: ${name}`.slice(0, 120),
        message: [
          `Missing allergy suggested during personalized onboarding: ${name}`,
          details.trim() ? `Additional details: ${details.trim()}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      showToast(t("allergySuggestionSent"));
      setAllergy("");
      setDetails("");
      onClose();
    } catch {
      showToast(t("allergySuggestionError"), { kind: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            minHeight: 60,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
          }}
        >
          <View style={{ width: 44 }} />
          <Text weight="bold" style={{ color: colors.text, fontSize: 18 }}>
            {t("allergySuggestionTitle")}
          </Text>
          <TouchableOpacity
            onPress={close}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={t("common:close")}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          >
            <XIcon size={24} color={colors.text} weight="bold" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
              {t("allergySuggestionIntro")}
            </Text>
            <Text weight="bold" style={{ color: colors.text, fontSize: 15, marginTop: 26, marginBottom: 8 }}>
              {t("allergyNameLabel")}
            </Text>
            <TextInput
              value={allergy}
              onChangeText={setAllergy}
              autoFocus
              maxLength={80}
              placeholder={t("allergyNamePlaceholder")}
              placeholderTextColor={colors.muted}
              style={{
                minHeight: 52,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.text,
                paddingHorizontal: 16,
                fontSize: 16,
              }}
            />
            <Text weight="bold" style={{ color: colors.text, fontSize: 15, marginTop: 22, marginBottom: 8 }}>
              {t("allergyDetailsLabel")}
            </Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              placeholder={t("allergyDetailsPlaceholder")}
              placeholderTextColor={colors.muted}
              style={{
                minHeight: 120,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.text,
                paddingHorizontal: 16,
                paddingTop: 14,
                fontSize: 16,
              }}
            />
            <PrimaryButton
              label={t("submitAllergySuggestion")}
              disabled={!canSubmit}
              loading={submitting}
              onPress={() => void submit()}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function LocationStep({ state, saving, persist }: StepProps) {
  const { t } = useTranslation("onboarding");
  const [requesting, setRequesting] = useState(false);
  const [choice, setChoice] = useState<OnboardingProgress["locationChoice"]>(
    state.onboardingProgress?.locationChoice,
  );

  async function requestLocation() {
    setRequesting(true);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setChoice("UNAVAILABLE");
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      const nextChoice = permission.status === "granted" ? "GRANTED" : "DENIED";
      setChoice(nextChoice);
      if (nextChoice === "GRANTED") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setChoice("UNAVAILABLE");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <View className="flex-1">
      <StepHeader title={t("locationTitle")} subtitle={t("locationSubtitle")} />
      <View className="flex-1 px-6">
        <View className="relative flex-1 overflow-hidden rounded-[30px] bg-[#E8E3D8] dark:bg-[#242522]">
          <View className="absolute left-8 top-16 h-36 w-[120%] rotate-12 rounded-full border-2 border-white/70 dark:border-white/10" />
          <View className="absolute -left-16 top-44 h-28 w-[140%] -rotate-6 rounded-full border-2 border-white/80 dark:border-white/10" />
          {[
            ["18%", "22%"],
            ["68%", "18%"],
            ["46%", "48%"],
            ["76%", "70%"],
            ["22%", "74%"],
          ].map(([left, top], markerIndex) => (
            <Animated.View
              key={`${left}-${top}`}
              entering={FadeIn.delay(markerIndex * 70)}
              className="absolute h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#343532]"
              style={{ left: left as `${number}%`, top: top as `${number}%` }}
            >
              <MapPinIcon size={24} color="#D29A13" weight="fill" />
            </Animated.View>
          ))}
          <View className="absolute bottom-6 left-6 right-6 rounded-2xl bg-white/90 p-4 dark:bg-[#171816]/90">
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F7D786]/40">
                <MapPinIcon size={24} color="#B77D00" weight="duotone" />
              </View>
              <Text className="ml-3 flex-1 text-base text-ink dark:text-white">
                {choice === "GRANTED"
                  ? t("locationGranted")
                  : choice === "DENIED"
                    ? t("locationDenied")
                    : choice === "UNAVAILABLE"
                      ? t("locationUnavailable")
                      : t("locationSubtitle")}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View className="px-6 pb-3">
        {choice ? (
          <PrimaryButton
            label={t("continue")}
            loading={saving}
            onPress={() =>
              void persist("CAMERA_PERMISSION", { progress: { locationChoice: choice } })
            }
          />
        ) : (
          <PrimaryButton
            label={t("enableLocation")}
            loading={requesting}
            onPress={() => void requestLocation()}
          />
        )}
        <TouchableOpacity
          onPress={() =>
            void persist("CAMERA_PERMISSION", { progress: { locationChoice: "SKIPPED" } })
          }
          disabled={saving || requesting}
          className="min-h-11 items-center justify-center"
        >
          <Text weight="bold" className="text-gray-500">{t("notNow")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type PermissionStatus = "granted" | "denied" | "undetermined" | "limited";

function CameraPermissionStep({ saving, persist }: Pick<StepProps, "saving" | "persist">) {
  return (
    <PermissionStep
      icon={<CameraIcon size={52} color="#171715" weight="duotone" />}
      titleKey="cameraTitle"
      subtitleKey="cameraSubtitle"
      grantedKey="cameraGranted"
      requestLabelKey="enableCamera"
      saving={saving}
      load={async () => (await Camera.getCameraPermissionsAsync()).status}
      request={async () => (await Camera.requestCameraPermissionsAsync()).status}
      onContinue={() => void persist("PHOTOS_PERMISSION")}
    />
  );
}

function PhotosPermissionStep({ saving, persist }: Pick<StepProps, "saving" | "persist">) {
  return (
    <PermissionStep
      icon={<ImageSquareIcon size={52} color="#171715" weight="duotone" />}
      titleKey="photosTitle"
      subtitleKey="photosSubtitle"
      grantedKey="photosGranted"
      requestLabelKey="enablePhotos"
      saving={saving}
      load={async () => {
        const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
        return permission.accessPrivileges === "limited" ? "limited" : permission.status;
      }}
      request={async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        return permission.accessPrivileges === "limited" ? "limited" : permission.status;
      }}
      onContinue={() => void persist("NOTIFICATIONS_PERMISSION")}
    />
  );
}

function NotificationsPermissionStep({ saving, persist }: Pick<StepProps, "saving" | "persist">) {
  return (
    <PermissionStep
      icon={<BellIcon size={52} color="#171715" weight="duotone" />}
      titleKey="notificationsTitle"
      subtitleKey="notificationsSubtitle"
      grantedKey="notificationsGranted"
      requestLabelKey="enableNotifications"
      saving={saving}
      load={async () => (await Notifications.getPermissionsAsync()).status}
      request={async () => (await Notifications.requestPermissionsAsync()).status}
      onContinue={() => void persist("SOCIAL_DISCOVERY")}
    />
  );
}

function PermissionStep({
  icon,
  titleKey,
  subtitleKey,
  grantedKey,
  requestLabelKey,
  saving,
  load,
  request,
  onContinue,
}: {
  icon: ReactNode;
  titleKey: string;
  subtitleKey: string;
  grantedKey: string;
  requestLabelKey: string;
  saving: boolean;
  load: () => Promise<PermissionStatus>;
  request: () => Promise<PermissionStatus>;
  onContinue: () => void;
}) {
  const { t } = useTranslation("onboarding");
  const [status, setStatus] = useState<PermissionStatus>("undetermined");
  const [requesting, setRequesting] = useState(false);
  const granted = status === "granted" || status === "limited";

  useEffect(() => {
    let active = true;
    void load()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [load]);

  async function ask() {
    setRequesting(true);
    try {
      const nextStatus = await request();
      setStatus(nextStatus);
      if (nextStatus === "granted" || nextStatus === "limited") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setRequesting(false);
    }
  }

  return (
    <View className="flex-1">
      <StepHeader title={t(titleKey)} subtitle={t(subtitleKey)} />
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full items-center rounded-[30px] border border-white/30 bg-white/65 px-6 py-10 shadow-sm dark:border-white/10 dark:bg-black/30">
          <Animated.View
            entering={FadeIn.duration(220)}
            className="h-28 w-28 items-center justify-center rounded-[34px] bg-[#F7D786]"
          >
            {granted ? <CheckIcon size={54} color="#171715" weight="bold" /> : icon}
          </Animated.View>
          <Text weight="black" className="mt-6 text-center text-2xl text-ink dark:text-white">
            {granted ? t(grantedKey) : t("permissionPowerUp")}
          </Text>
          <Text className="mt-2 text-center text-gray-600 dark:text-gray-300">
            {granted ? t("permissionReady") : t("permissionPrivate")}
          </Text>
        </View>
      </View>
      <View className="px-6 pb-3">
        {granted || status === "denied" ? (
          <PrimaryButton label={t("continue")} loading={saving} onPress={onContinue} />
        ) : (
          <PrimaryButton
            label={t(requestLabelKey)}
            loading={requesting}
            onPress={() => void ask()}
          />
        )}
        {!granted && status !== "denied" ? (
          <TouchableOpacity
            onPress={onContinue}
            disabled={saving || requesting}
            className="min-h-11 items-center justify-center"
          >
            <Text weight="bold" className="text-gray-600 dark:text-gray-300">{t("notNow")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function SocialStep({
  state,
  saving,
  onComplete,
}: Pick<StepProps, "state" | "saving"> & {
  onComplete: (followedUserIds: string[]) => Promise<void>;
}) {
  const { t } = useTranslation("onboarding");
  const [suggestions, setSuggestions] = useState<FollowSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(new Set<string>());
  const initialFollowedIds = state.onboardingProgress?.followedUserIds ?? [];
  const [followedIds, setFollowedIds] = useState(initialFollowedIds);

  useEffect(() => {
    api.users
      .followSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(item: FollowSuggestion) {
    if (inFlight.current.has(item.id)) return;
    inFlight.current.add(item.id);
    const wasFollowing = shouldRemoveFollowRelationship(item.relationship);
    const optimistic = getNextRelationshipAfterToggle(item.relationship);
    setSuggestions((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, relationship: optimistic } : candidate,
      ),
    );
    setFollowedIds((current) =>
      wasFollowing ? current.filter((id) => id !== item.id) : [...new Set([...current, item.id])],
    );
    try {
      const result = await api.users.toggleFollow(item.id, wasFollowing);
      setSuggestions((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, relationship: result.relationship } : candidate,
        ),
      );
    } catch {
      setSuggestions((current) =>
        current.map((candidate) => (candidate.id === item.id ? item : candidate)),
      );
      setFollowedIds((current) =>
        wasFollowing ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id),
      );
    } finally {
      inFlight.current.delete(item.id);
    }
  }

  function label(relationship?: UserRelationship) {
    if (relationship === "FRIENDS") return t("friends");
    if (relationship === "FOLLOWING") return t("following");
    if (relationship === "REQUESTED") return t("requested");
    return t("follow");
  }

  return (
    <View className="flex-1">
      <StepHeader title={t("socialTitle")} subtitle={t("socialSubtitle")} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 18 }}
      >
        {loading ? (
          <ActivityIndicator className="mt-12" color="#D6A92D" />
        ) : suggestions.length ? (
          <View className="gap-4">
            {suggestions.slice(0, 6).map((item) => (
              <View key={item.id} className="flex-row items-center">
                <Avatar uri={item.avatarUrl} username={item.username} size={50} />
                <View className="ml-3 min-w-0 flex-1">
                  <Text weight="bold" numberOfLines={1} className="text-ink dark:text-white">
                    {item.displayName || item.username}
                  </Text>
                  <Text numberOfLines={1} className="text-sm text-gray-500">@{item.username}</Text>
                </View>
                <RelationshipActionButton
                  relationship={item.relationship}
                  label={label(item.relationship)}
                  className="ml-3 min-w-24"
                  onPress={() => void toggle(item)}
                />
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center py-14">
            <Text className="text-center text-gray-500">{t("noSuggestions")}</Text>
          </View>
        )}
      </ScrollView>
      <View className="px-6 pb-3">
        <PrimaryButton
          label={t("finish")}
          loading={saving}
          onPress={() => void onComplete(followedIds)}
        />
      </View>
    </View>
  );
}
