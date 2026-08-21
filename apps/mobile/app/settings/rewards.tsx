import SettingsHeader from "@/components/settings/SettingsHeader";
import Text from "@/components/common/AppText";
import { api } from "@/lib/api";
import type {
  AvailableReward,
  AvailableRewardsResponse,
  RestaurantOffer,
  RestaurantOfferClaim,
  RewardSavingsSummary,
} from "@findeat/types";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import {
  CheckCircleIcon,
  ClockCountdownIcon,
  CopyIcon,
  GiftIcon,
  TicketIcon,
} from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Tab = "available" | "used" | "expired";

function amount(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function benefitLabel(offer: RestaurantOffer) {
  if (offer.type === "PERCENTAGE_DISCOUNT") return `${amount(offer.discountValue)}% off`;
  if (offer.type === "FIXED_DISCOUNT") return `${amount(offer.discountValue)} ${offer.currency} off`;
  if (offer.type === "FREE_ITEM") return "Free item";
  return offer.description || "Restaurant reward";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function RewardCard({
  offer,
  claim,
  eligibility,
  onClaim,
  onCode,
  busy,
}: {
  offer: RestaurantOffer;
  claim?: RestaurantOfferClaim;
  eligibility?: AvailableReward["eligibility"];
  onClaim?: () => void;
  onCode?: () => void;
  busy?: boolean;
}) {
  return (
    <View className="overflow-hidden rounded-[22px] border border-[#E7E1D9] bg-[#F7F4EF] dark:border-[#34312E] dark:bg-[#1A1917]">
      <View className="flex-row items-center gap-3 p-4">
        {offer.restaurant.logoUrl ? (
          <Image source={{ uri: offer.restaurant.logoUrl }} className="h-12 w-12 rounded-full bg-[#E9E3DB]" contentFit="cover" />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#EEE6DC] dark:bg-[#302D29]">
            <GiftIcon size={23} color="#E4573D" weight="duotone" />
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text weight="bold" className="text-base text-[#1E1B18] dark:text-[#F7F4EF]" numberOfLines={1}>{offer.title}</Text>
          <Text className="mt-0.5 text-xs text-[#77706A] dark:text-[#AAA39C]" numberOfLines={1}>{offer.restaurant.name}{offer.restaurant.city ? ` · ${offer.restaurant.city}` : ""}</Text>
        </View>
        <View className="rounded-full bg-[#FFE3D9] px-2.5 py-1 dark:bg-[#3A241D]">
          <Text weight="bold" className="text-xs text-[#BA3D26] dark:text-[#FF9A7F]">{benefitLabel(offer)}</Text>
        </View>
      </View>

      <View className="mx-4 border-t border-dashed border-[#D8D0C7] pb-4 pt-3 dark:border-[#403C38]">
        {offer.description ? <Text className="mb-2 text-sm leading-5 text-[#4F4944] dark:text-[#D4CEC7]">{offer.description}</Text> : null}
        {eligibility?.reasons[0] ? (
          <View className="mb-2 flex-row items-center gap-1.5">
            <CheckCircleIcon size={15} color="#2F8A5B" weight="fill" />
            <Text className="flex-1 text-xs text-[#397257] dark:text-[#75C79A]">{eligibility.reasons[0]}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-1.5">
          <ClockCountdownIcon size={15} color="#8B8178" />
          <Text className="text-xs text-[#77706A] dark:text-[#AAA39C]">Valid until {formatDate(claim?.expiresAt ?? offer.validUntil)}</Text>
        </View>
        {offer.terms ? <Text className="mt-2 text-[11px] leading-4 text-[#8A827B] dark:text-[#97918A]">{offer.terms}</Text> : null}

        {onClaim ? (
          <Pressable disabled={busy} onPress={onClaim} className="mt-4 min-h-11 items-center justify-center rounded-xl bg-[#E4573D] active:opacity-80 disabled:opacity-50">
            {busy ? <ActivityIndicator color="#F7F4EF" /> : <Text weight="bold" className="text-sm text-[#F7F4EF]">Claim reward</Text>}
          </Pressable>
        ) : null}
        {onCode ? (
          <Pressable disabled={busy} onPress={onCode} className="mt-4 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-[#24211F] active:opacity-80 dark:bg-[#F2EEE8]">
            {busy ? <ActivityIndicator color="#E4573D" /> : <><TicketIcon size={18} color="#E4573D" weight="fill" /><Text weight="bold" className="text-sm text-[#F7F4EF] dark:text-[#24211F]">Show redemption code</Text></>}
          </Pressable>
        ) : null}
        {claim?.status === "REDEEMED" ? <Text weight="bold" className="mt-3 text-xs text-[#2F8A5B]">Used {claim.redeemedAt ? formatDate(claim.redeemedAt) : ""}{claim.actualSavingsAmount ? ` · ${amount(claim.actualSavingsAmount)} ${claim.currency} saved` : ""}</Text> : null}
        {claim?.status === "EXPIRED" ? <Text weight="bold" className="mt-3 text-xs text-[#8A827B]">Expired</Text> : null}
      </View>
    </View>
  );
}

export default function RewardsScreen() {
  const { t } = useTranslation("settings");
  const [tab, setTab] = useState<Tab>("available");
  const [available, setAvailable] = useState<AvailableRewardsResponse>({ claimed: [], available: [] });
  const [history, setHistory] = useState<Record<"used" | "expired", RestaurantOfferClaim[]>>({ used: [], expired: [] });
  const [summary, setSummary] = useState<RewardSavingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [redemption, setRedemption] = useState<{ token: string; expiresAt: string } | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [nextAvailable, used, expired, nextSummary] = await Promise.all([
        api.rewards.listAvailable(),
        api.rewards.listUsed(),
        api.rewards.listExpired(),
        api.rewards.summary(),
      ]);
      setAvailable(nextAvailable);
      setHistory({ used, expired });
      setSummary(nextSummary);
      setError("");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not load rewards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleHistory = useMemo(() => tab === "available" ? [] : history[tab], [history, tab]);

  async function claim(offerId: string) {
    setBusyId(offerId);
    try { await api.rewards.claim(offerId); await load(true); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not claim reward"); }
    finally { setBusyId(null); }
  }

  async function showCode(claimId: string) {
    setBusyId(claimId);
    try { setRedemption(await api.rewards.redemptionToken(claimId)); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not create redemption code"); }
    finally { setBusyId(null); }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FBFAF8] dark:bg-[#0B0B0A]">
      <SettingsHeader title={t("myRewards")} />
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#E4573D" />} contentContainerClassName="gap-4 px-4 pb-10">
        <View className="overflow-hidden rounded-[24px] bg-[#272320] p-5 dark:bg-[#201E1B]">
          <Text className="text-xs font-bold uppercase tracking-widest text-[#E9BFB4]">Your savings</Text>
          <Text weight="bold" className="mt-1 text-3xl text-[#F7F4EF]">{amount(summary?.lifetimeSavings).toFixed(2)} <Text className="text-base text-[#CFC7BE]">ILS</Text></Text>
          <Text className="mt-1 text-xs text-[#BEB6AE]">{summary?.redeemedCount ?? 0} rewards redeemed · {amount(summary?.currentYearSavings).toFixed(2)} ILS this year</Text>
        </View>

        <View className="flex-row rounded-2xl bg-[#EEEAE4] p-1 dark:bg-[#23211F]">
          {(["available", "used", "expired"] as Tab[]).map((item) => (
            <Pressable key={item} onPress={() => setTab(item)} className={`min-h-10 flex-1 items-center justify-center rounded-xl ${tab === item ? "bg-[#FBFAF8] shadow-sm dark:bg-[#34312E]" : ""}`}>
              <Text weight={tab === item ? "bold" : "regular"} className={`text-sm capitalize ${tab === item ? "text-[#1E1B18] dark:text-[#F7F4EF]" : "text-[#817A73]"}`}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <View className="rounded-xl bg-[#FCE4DF] p-3 dark:bg-[#3A201B]"><Text weight="bold" className="text-sm text-[#A63B29] dark:text-[#FF9A83]">{error}</Text></View> : null}
        {loading ? <ActivityIndicator className="mt-16" color="#E4573D" /> : null}

        {!loading && tab === "available" ? (
          <View className="gap-3">
            {available.claimed.map((claim) => {
              const reasons = Array.isArray(claim.offerSnapshot.eligibilityReasons)
                ? claim.offerSnapshot.eligibilityReasons.filter((value): value is string => typeof value === "string")
                : [];
              return <RewardCard key={claim.id} offer={claim.offer} claim={claim} eligibility={{ eligible: true, matchedAudiences: [], reasons }} busy={busyId === claim.id} onCode={() => void showCode(claim.id)} />;
            })}
            {available.available.map((item) => <RewardCard key={item.offer.id} offer={item.offer} eligibility={item.eligibility} busy={busyId === item.offer.id} onClaim={() => void claim(item.offer.id)} />)}
            {!available.claimed.length && !available.available.length ? <View className="items-center px-8 py-16"><GiftIcon size={46} color="#C7BEB5" weight="duotone" /><Text weight="bold" className="mt-3 text-lg text-[#403B36] dark:text-[#E8E1DA]">No rewards yet</Text><Text className="mt-1 text-center text-sm text-[#817A73]">Offers you qualify for will appear here automatically.</Text></View> : null}
          </View>
        ) : null}
        {!loading && tab !== "available" ? <View className="gap-3">{visibleHistory.map((claim) => <RewardCard key={claim.id} offer={claim.offer} claim={claim} />)}{!visibleHistory.length ? <View className="items-center px-8 py-16"><CheckCircleIcon size={44} color="#C7BEB5" weight="duotone" /><Text className="mt-3 text-sm text-[#817A73]">Nothing here yet.</Text></View> : null}</View> : null}
      </ScrollView>

      {redemption ? (
        <View className="absolute inset-0 items-center justify-center bg-[#17131199] px-6">
          <Pressable className="absolute inset-0" onPress={() => setRedemption(null)} />
          <View className="w-full max-w-sm rounded-[28px] bg-[#F7F4EF] p-6 dark:bg-[#201E1B]">
            <View className="items-center"><TicketIcon size={42} color="#E4573D" weight="duotone" /><Text weight="bold" className="mt-2 text-xl text-[#1E1B18] dark:text-[#F7F4EF]">Redemption code</Text><Text className="mt-1 text-center text-xs text-[#817A73]">Show this to the restaurant. It expires in two minutes and works once.</Text></View>
            <View className="my-5 rounded-2xl border border-dashed border-[#CFC5BA] bg-[#EEE8E0] p-4 dark:border-[#514B45] dark:bg-[#2B2825]"><Text selectable weight="bold" className="text-center text-sm tracking-wider text-[#292521] dark:text-[#F7F4EF]">{redemption.token}</Text></View>
            <Pressable onPress={() => void Clipboard.setStringAsync(redemption.token)} className="min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-[#E4573D]"><CopyIcon size={18} color="#F7F4EF" weight="bold" /><Text weight="bold" className="text-[#F7F4EF]">Copy code</Text></Pressable>
            <Pressable onPress={() => setRedemption(null)} className="min-h-11 items-center justify-center"><Text weight="bold" className="text-[#6F6861]">Close</Text></Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
