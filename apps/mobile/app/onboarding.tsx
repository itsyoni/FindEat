import Avatar from "@/components/common/Avatar";
import Text from "@/components/common/AppText";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import RelationshipActionButton from "@/components/profile/RelationshipActionButton";
import { useAccessibilityPreferences } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import {
  ALLERGEN_OPTIONS,
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
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import {
  BookmarkSimpleIcon,
  CheckCircleIcon,
  ForkKnifeIcon,
  MapPinIcon,
  SparkleIcon,
} from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const FLOW: OnboardingStep[] = [
  "FOOD_PREFERENCES",
  "DIETARY_PREFERENCES",
  "LOCATION",
  "SAVE_TUTORIAL",
  "DISH_REVIEWS",
  "SOCIAL_DISCOVERY",
  "COMPLETION",
];

const DIETARY_OPTIONS = [
  "KOSHER_ONLY",
  "HALAL_ONLY",
  "VEGETARIAN",
  "VEGAN",
  "NO_PORK",
  "GLUTEN_FREE",
  "ALLERGIES",
] as const;

type DietaryOption = (typeof DIETARY_OPTIONS)[number];

export default function OnboardingScreen() {
  const { t } = useTranslation("onboarding");
  const { isDark } = useAppTheme();
  const { refreshUser } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState<OnboardingStep>("FOOD_PREFERENCES");
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
      setStep(
        next.onboardingStep && next.onboardingStep !== "COMPLETED"
          ? next.onboardingStep
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
    nextStep: OnboardingStep,
    patch: Parameters<typeof api.onboarding.update>[0] = {},
  ) {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const next = await api.onboarding.update({ ...patch, step: nextStep });
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
    await persist(FLOW[index - 1]);
  }

  if (loading || !state) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas dark:bg-[#0B0B0A]">
        {error ? (
          <View className="items-center px-8">
            <Text className="text-center text-gray-500 dark:text-gray-400">{error}</Text>
            <PrimaryButton label={t("common:retry")} onPress={() => void load()} />
          </View>
        ) : (
          <ActivityIndicator color="#D6A92D" />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas dark:bg-[#0B0B0A]">
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

      <Animated.View
        key={step}
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(120)}
        className="flex-1"
      >
        {step === "FOOD_PREFERENCES" ? (
          <FoodPreferencesStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "DIETARY_PREFERENCES" ? (
          <DietaryPreferencesStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "LOCATION" ? (
          <LocationStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "SAVE_TUTORIAL" ? (
          <SaveTutorialStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "DISH_REVIEWS" ? (
          <DishReviewStep saving={saving} persist={persist} />
        ) : null}
        {step === "SOCIAL_DISCOVERY" ? (
          <SocialStep state={state} saving={saving} persist={persist} />
        ) : null}
        {step === "COMPLETION" ? (
          <CompletionStep
            state={state}
            saving={saving}
            onComplete={async () => {
              setSaving(true);
              try {
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
      </Animated.View>

      {error ? (
        <Text className="px-6 pb-2 text-center text-sm text-red-500">{error}</Text>
      ) : null}
    </SafeAreaView>
  );
}

function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="px-6 pb-5 pt-4">
      <Text weight="black" className="text-3xl leading-9 text-ink dark:text-[#FAF9F6]">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-2 text-base leading-6 text-gray-500 dark:text-gray-400">
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
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      className={`mt-4 min-h-14 items-center justify-center rounded-2xl px-5 ${
        disabled ? "bg-black/10 dark:bg-white/10" : "bg-ink dark:bg-[#FAF9F6]"
      }`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color="#D6A92D" />
      ) : (
        <Text
          weight="bold"
          className={disabled ? "text-gray-400" : "text-white dark:text-[#171717]"}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      className={`min-h-12 flex-row items-center rounded-2xl border px-4 py-3 ${
        selected
          ? "border-[#D6A92D] bg-[#F7D786]/35 dark:bg-[#D6A92D]/20"
          : "border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
      }`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <Text className="text-base text-ink dark:text-[#FAF9F6]">{label}</Text>
      {selected ? (
        <View className="ml-2">
          <CheckCircleIcon size={19} color="#C38C00" weight="fill" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function FoodPreferencesStep({
  state,
  saving,
  persist,
}: StepProps) {
  const { t } = useTranslation("onboarding");
  const { reduceMotion } = useAccessibilityPreferences();
  const [selected, setSelected] = useState<string[]>(state.foodInterests ?? []);

  function toggle(value: string) {
    if (!reduceMotion) void Haptics.selectionAsync();
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  return (
    <View className="flex-1">
      <StepHeader title={t("foodTitle")} subtitle={t("foodSubtitle")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 18 }}>
        <View className="flex-row flex-wrap gap-2.5">
          {FOOD_INTERESTS.map((interest) => (
            <ChoiceChip
              key={interest}
              label={t(`foodInterests.${interest}`)}
              selected={selected.includes(interest)}
              onPress={() => toggle(interest)}
            />
          ))}
        </View>
      </ScrollView>
      <View className="px-6 pb-3">
        {selected.length < 3 ? (
          <Text className="text-center text-sm text-gray-500">
            {t("foodMinimum")} · {selected.length}/3
          </Text>
        ) : null}
        <PrimaryButton
          label={t("continue")}
          disabled={selected.length < 3}
          loading={saving}
          onPress={() => void persist("DIETARY_PREFERENCES", { foodInterests: selected })}
        />
      </View>
    </View>
  );
}

type StepProps = {
  state: OnboardingState;
  saving: boolean;
  persist: (
    nextStep: OnboardingStep,
    patch?: Parameters<typeof api.onboarding.update>[0],
  ) => Promise<void>;
};

function DietaryPreferencesStep({ state, saving, persist }: StepProps) {
  const { t } = useTranslation("onboarding");
  const [selected, setSelected] = useState<DietaryOption[]>(() => {
    const values: DietaryOption[] = [];
    if (state.restaurantDietaryRequirements.includes("KOSHER_ONLY")) values.push("KOSHER_ONLY");
    if (state.restaurantDietaryRequirements.includes("HALAL_ONLY")) values.push("HALAL_ONLY");
    if (state.foodPreferences.includes("VEGETARIAN")) values.push("VEGETARIAN");
    if (state.foodPreferences.includes("VEGAN")) values.push("VEGAN");
    if (state.dietaryRestrictions.includes("NO_PORK")) values.push("NO_PORK");
    if (state.dietaryRestrictions.includes("GLUTEN_FREE")) values.push("GLUTEN_FREE");
    if (state.allergies.length) values.push("ALLERGIES");
    return values;
  });
  const [allergies, setAllergies] = useState(state.allergies);

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
    allergies: selected.includes("ALLERGIES") ? allergies : [],
  };

  return (
    <View className="flex-1">
      <StepHeader title={t("dietaryTitle")} subtitle={t("dietarySubtitle")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 18 }}>
        <View className="flex-row flex-wrap gap-2.5">
          {DIETARY_OPTIONS.map((option) => (
            <ChoiceChip
              key={option}
              label={t(`dietary.${option}`)}
              selected={selected.includes(option)}
              onPress={() => toggle(option)}
            />
          ))}
        </View>
        {selected.includes("ALLERGIES") ? (
          <Animated.View entering={FadeIn.duration(180)} className="mt-7">
            <Text weight="bold" className="mb-3 text-lg text-ink dark:text-white">
              {t("allergiesTitle")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((allergen) => (
                <ChoiceChip
                  key={allergen}
                  label={t(`allergen.${allergen}`)}
                  selected={allergies.includes(allergen)}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setAllergies((current) =>
                      current.includes(allergen)
                        ? current.filter((item) => item !== allergen)
                        : [...current, allergen],
                    );
                  }}
                />
              ))}
            </View>
            <Text className="mt-4 text-xs leading-5 text-gray-500">{t("allergiesSafety")}</Text>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View className="px-6 pb-3">
        <PrimaryButton
          label={t("continue")}
          loading={saving}
          onPress={() => void persist("LOCATION", patch)}
        />
        <TouchableOpacity
          onPress={() => void persist("LOCATION", patch)}
          disabled={saving}
          className="min-h-11 items-center justify-center"
          accessibilityRole="button"
        >
          <Text weight="bold" className="text-gray-500">{t("skip")}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
              void persist("SAVE_TUTORIAL", { progress: { locationChoice: choice } })
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
            void persist("SAVE_TUTORIAL", { progress: { locationChoice: "SKIPPED" } })
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

function SaveTutorialStep({ state, saving, persist }: StepProps) {
  const { t } = useTranslation("onboarding");
  const { reduceMotion } = useAccessibilityPreferences();
  const [saved, setSaved] = useState(!!state.onboardingProgress?.saveTutorialCompleted);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (saved || reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1.13, { duration: 650 }), withTiming(1, { duration: 650 })),
      -1,
      true,
    );
  }, [pulse, reduceMotion, saved]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  async function saveDemo() {
    if (saved) return;
    setSaved(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const next = await api.onboarding.update({
        step: "SAVE_TUTORIAL",
        progress: { saveTutorialCompleted: true },
      });
      // The server state is only onboarding metadata; no restaurant save is created.
      void next;
    } catch {
      setSaved(false);
    }
  }

  return (
    <View className="flex-1">
      <StepHeader title={t("saveTitle")} subtitle={!saved ? t("saveInstruction") : undefined} />
      <View className="flex-1 px-6">
        <View className="flex-1 overflow-hidden rounded-[28px] bg-[#171717] shadow-sm">
          <Image
            source={require("@/assets/images/auth-bg.png")}
            contentFit="cover"
            style={{ flex: 1 }}
          />
          <LinearGradient
            colors={["transparent", "rgba(11,11,10,0.78)"]}
            className="absolute inset-0"
          />
          <View className="absolute bottom-5 left-5 right-5 flex-row items-end">
            <View className="min-w-0 flex-1 pr-4">
              <Text weight="bold" className="text-lg text-[#FAF9F6]">{t("demoRestaurant")}</Text>
              <Text className="mt-1 text-[#FAF9F6]/85">{t("demoCaption")}</Text>
            </View>
            <Animated.View style={pulseStyle}>
              <TouchableOpacity
                onPress={() => void saveDemo()}
                className={`h-14 w-14 items-center justify-center rounded-full ${
                  saved ? "bg-[#F7D786]" : "bg-black/50"
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: saved }}
                accessibilityLabel={t("saveInstruction")}
              >
                <BookmarkSimpleIcon
                  size={29}
                  color={saved ? "#171717" : "#FAF9F6"}
                  weight={saved ? "fill" : "bold"}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
        {saved ? (
          <Animated.View entering={FadeIn.duration(220)} className="items-center py-4">
            <Text weight="bold" className="text-[#9A6C00] dark:text-[#F7D786]">
              {t("savedConfirmation")}
            </Text>
            <Text className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
              {t("saveExplanation")}
            </Text>
          </Animated.View>
        ) : null}
      </View>
      <View className="px-6 pb-3">
        <PrimaryButton
          label={t("continue")}
          disabled={!saved}
          loading={saving}
          onPress={() =>
            void persist("DISH_REVIEWS", { progress: { saveTutorialCompleted: true } })
          }
        />
      </View>
    </View>
  );
}

function DishReviewStep({
  saving,
  persist,
}: Pick<StepProps, "saving" | "persist">) {
  const { t } = useTranslation("onboarding");
  return (
    <View className="flex-1">
      <StepHeader title={t("dishTitle")} subtitle={t("dishSubtitle")} />
      <View className="flex-1 justify-center px-6">
        <View className="overflow-hidden rounded-[28px] bg-white shadow-sm dark:bg-[#1A1A19]">
          <Image
            source={require("@/assets/images/auth-bg.png")}
            contentFit="cover"
            style={{ width: "100%", aspectRatio: 1.45 }}
          />
          <View className="flex-row items-center p-5">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#F7D786]/35">
              <ForkKnifeIcon size={25} color="#A36F00" weight="duotone" />
            </View>
            <View className="ml-3 flex-1">
              <Text weight="bold" className="text-xl text-ink dark:text-white">{t("dishName")}</Text>
              <Text className="mt-1 text-sm text-gray-500">{t("dishRatingLabel")}</Text>
            </View>
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#171717] dark:bg-[#F7D786]">
              <Text weight="black" className="text-2xl text-white dark:text-[#171717]">
                {t("dishRating")}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View className="px-6 pb-3">
        <PrimaryButton
          label={t("continue")}
          loading={saving}
          onPress={() => void persist("SOCIAL_DISCOVERY")}
        />
      </View>
    </View>
  );
}

function SocialStep({ state, saving, persist }: StepProps) {
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

  const finish = () =>
    persist("COMPLETION", { progress: { followedUserIds: followedIds } });

  return (
    <View className="flex-1">
      <StepHeader title={t("socialTitle")} subtitle={t("socialSubtitle")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 18 }}>
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
        <PrimaryButton label={t("continue")} loading={saving} onPress={() => void finish()} />
        <TouchableOpacity
          onPress={() => void finish()}
          disabled={saving}
          className="min-h-11 items-center justify-center"
        >
          <Text weight="bold" className="text-gray-500">{t("skip")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CompletionStep({
  state,
  saving,
  onComplete,
}: {
  state: OnboardingState;
  saving: boolean;
  onComplete: () => Promise<void>;
}) {
  const { t } = useTranslation("onboarding");
  const rows = useMemo(() => {
    const summary: string[] = [];
    if (state.foodInterests.length) {
      summary.push(state.foodInterests.slice(0, 3).map((item) => t(`foodInterests.${item}`)).join(" · "));
    }
    if (state.onboardingProgress?.locationChoice === "GRANTED") summary.push(`📍 ${t("nearYou")}`);
    const followed = state.onboardingProgress?.followedUserIds?.length ?? 0;
    if (followed) summary.push(`❤️ ${t("peopleFollowed", { count: followed })}`);
    if (state.onboardingProgress?.saveTutorialCompleted) summary.push(`🔖 ${t("placeSaved")}`);
    return summary;
  }, [state, t]);

  return (
    <View className="flex-1 px-6 pb-3">
      <View className="flex-1 items-center justify-center">
        <Animated.View entering={FadeIn.duration(260)} className="h-24 w-24 items-center justify-center rounded-[30px] bg-[#F7D786]/40">
          <SparkleIcon size={48} color="#B77D00" weight="duotone" />
        </Animated.View>
        <Text weight="black" className="mt-7 text-center text-4xl text-ink dark:text-white">
          {t("readyTitle")}
        </Text>
        <Text className="mt-3 text-center text-base text-gray-500 dark:text-gray-400">
          {t("readySubtitle")}
        </Text>
        <View className="mt-8 w-full gap-3 rounded-[26px] bg-white/70 p-5 dark:bg-white/5">
          {rows.map((row) => (
            <Text key={row} className="text-center text-base text-ink dark:text-white">
              {row}
            </Text>
          ))}
        </View>
      </View>
      <PrimaryButton label={t("finish")} loading={saving} onPress={() => void onComplete()} />
    </View>
  );
}
