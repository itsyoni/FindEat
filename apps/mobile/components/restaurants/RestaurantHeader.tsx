import Avatar from '@/components/common/Avatar';
import AppBottomSheet from '@/components/common/AppBottomSheet';
import FullScreenImageViewer from '@/components/common/FullScreenImageViewer';
import { Restaurant } from '@findeat/types';
import { router } from 'expo-router';
import { CalendarCheckIcon, ChatCircleIcon, DotsThreeIcon, FireIcon, MapPinIcon, NotePencilIcon } from 'phosphor-react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import DirectionalIcon from '@/components/common/icons/DirectionalIcon';
import { useTranslation } from 'react-i18next';
import { Image, Linking, Platform, TouchableOpacity, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { SharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../common/AppText';
import RestaurantFollowButton from './RestaurantFollowButton';
import RestaurantStats from './RestaurantStats';
import RestaurantBadge from './RestaurantBadge';
import HappyHourBadge from './HappyHourBadge';
import { useState } from 'react';
import { Skeleton, SkeletonPulse } from '../common';
import ParallaxProfileCover from '../profile/ParallaxProfileCover';
import { useAppTheme } from '@/contexts/ThemeContext';
import { RestaurantOpeningHoursSummary } from './RestaurantOpeningHours';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import Svg, { Path } from 'react-native-svg';
import { api } from '@/lib/api';
import { AppAlert as Alert } from '@/lib/appAlert';

function GoogleMapsBrandIcon({ size = 25 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 92.3 132.3">
      <Path
        fill="#1A73E8"
        d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2Z"
      />
      <Path
        fill="#EA4335"
        d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3Z"
      />
      <Path
        fill="#4285F4"
        d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3Z"
      />
      <Path
        fill="#FBBC04"
        d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3Z"
      />
      <Path
        fill="#34A853"
        d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2Z"
      />
    </Svg>
  );
}

type Props = {
  restaurant?: Restaurant | null;
  loading?: boolean;
  onToggleFollow: () => void;
  onOpenOptions: () => void;
  onCreateReview: () => void;
  scrollY: SharedValue<number>;
  hotRightNow?: boolean;
};

export default function RestaurantHeader({ restaurant, loading = false, onToggleFollow, onOpenOptions, onCreateReview, scrollY, hotRightNow = false }: Props) {
  const { t } = useTranslation(['restaurants', 'map']);
  const { isDark } = useAppTheme();
  const [logoOpen, setLogoOpen] = useState(false);
  const [locationActionsOpen, setLocationActionsOpen] = useState(false);
  const [booking, setBooking] = useState(false);

  if (loading || !restaurant) {
    return (
      <SkeletonPulse>
        <View style={{ backgroundColor: isDark ? '#0B0B0A' : '#FAF9F6' }}>
          <View className="relative">
            <Skeleton height={240} radius={0} />
            <SafeAreaView edges={["top"]} style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
              <View className="flex-row justify-between px-4 pt-2"><Skeleton width={44} height={44} circle /><Skeleton width={44} height={44} circle /></View>
            </SafeAreaView>
          </View>
          <View
            className="-mt-7 items-center rounded-t-[30px] pb-3"
            style={{ backgroundColor: isDark ? '#0B0B0A' : '#FAF9F6' }}
          >
            <Skeleton width={116} height={116} circle style={{ marginTop: -56 }} />
            <Skeleton width="54%" height={23} radius={9} style={{ marginTop: 12 }} />
            <Skeleton width="64%" height={34} radius={17} style={{ marginTop: 12 }} />
            <View className="mt-5 w-full flex-row justify-around px-5">
              {[0, 1, 2].map((item) => <View key={item} className="items-center gap-2"><Skeleton width={38} height={19} radius={7} /><Skeleton width={58} height={11} radius={6} /></View>)}
            </View>
            <View className="mt-5 w-full flex-row gap-3 px-5"><Skeleton width="48%" height={46} radius={12} /><Skeleton width="48%" height={46} radius={12} /></View>
          </View>
        </View>
      </SkeletonPulse>
    );
  }
  const location = [restaurant.address, restaurant.city].filter(Boolean).join(', ');
  const hasNavigationCoordinates =
    typeof restaurant.latitude === 'number' &&
    typeof restaurant.longitude === 'number';
  const navigationDestination = hasNavigationCoordinates
    ? `${restaurant.latitude},${restaurant.longitude}`
    : location;
  const encodedDestination = encodeURIComponent(navigationDestination);
  const wazeUrl = hasNavigationCoordinates
    ? `https://waze.com/ul?ll=${encodedDestination}&navigate=yes`
    : `https://waze.com/ul?q=${encodedDestination}&navigate=yes`;
  const reviewPosts = restaurant.posts.filter((post) => post.type === 'REVIEW');
  const ratings = reviewPosts
    .map((post) => post.rating)
    .filter((rating): rating is number => rating != null);
  const averageRating = ratings.length > 0
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : null;
  const kosher = restaurant.foodCertificationDetails?.kosher;
  const halal = restaurant.foodCertificationDetails?.halal;
  const certificationLabels = [
    kosher?.status === 'CERTIFIED'
      ? `${kosher.standard === 'MEHADRIN' ? t('mehadrinCertified') : t('kosherCertified')}${kosher.authority ? ` · ${kosher.authority}` : ''}`
      : null,
    halal?.status === 'CERTIFIED'
      ? `${t('halalCertified')}${halal.authority ? ` · ${halal.authority}` : ''}`
      : halal?.status === 'HALAL_MEAT'
        ? t('halalMeat')
        : halal?.status === 'OPTIONS'
          ? t('halalOptions')
          : null,
  ].filter((value): value is string => Boolean(value));
  const legacyReservation = restaurant.ontopoUrl
    ? { provider: 'ONTOP' as const, reservationUrl: restaurant.ontopoUrl }
    : restaurant.tabitUrl
      ? { provider: 'TABIT' as const, reservationUrl: restaurant.tabitUrl }
      : null;
  const reservation = restaurant.reservationConfig?.enabled
    ? restaurant.reservationConfig
    : !restaurant.reservationConfig && legacyReservation
      ? { ...legacyReservation, enabled: true }
      : null;
  const reservationProvider = reservation?.provider === 'ONTOP'
    ? 'Ontopo'
    : reservation?.provider === 'TABIT'
      ? 'Tabit'
      : reservation?.provider === 'OTHER'
        ? t('externalBookingProvider')
        : null;
  const restaurantId = restaurant.id;

  async function openReservation() {
    if (!reservation || booking) return;
    setBooking(true);
    try {
      const result = await api.reservations.resolveBookingLink(restaurantId, {
        source: 'RESTAURANT_PAGE',
      });
      try {
        await WebBrowser.openBrowserAsync(result.bookingUrl, {
          controlsColor: '#D97706',
        });
      } catch {
        await Linking.openURL(result.bookingUrl);
      }
    } catch (error) {
      console.warn('Could not open restaurant booking', error);
      Alert.alert(t('bookingUnavailableTitle'), t('bookingUnavailableBody'), undefined, {
        tone: 'warning',
        illustration: 'guide',
      });
    } finally {
      setBooking(false);
    }
  }
  return (
    <View style={{ backgroundColor: isDark ? '#0B0B0A' : '#FAF9F6' }}>
      <View className="relative">
        <ParallaxProfileCover uri={restaurant.coverUrl} scrollY={scrollY} />
        <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <View className="flex-row items-center justify-between px-4 pt-2">
            <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-black/45">
              <DirectionalIcon direction="back" variant="arrow" size={24} color="#FAF9F6" />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              {reservation && reservationProvider ? (
                <TouchableOpacity
                  accessibilityRole="link"
                  accessibilityLabel={t('bookTableWith', { provider: reservationProvider })}
                  activeOpacity={0.78}
                  disabled={booking}
                  onPress={() => void openReservation()}
                  className={`h-11 w-11 items-center justify-center rounded-full bg-black/45 ${booking ? 'opacity-60' : ''}`}
                >
                  <CalendarCheckIcon size={21} color="#FAF9F6" weight="bold" />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={onCreateReview}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={t('writeReview')}
                className="h-11 w-11 items-center justify-center rounded-full bg-black/45"
              >
                <NotePencilIcon size={21} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onOpenOptions} className="h-11 w-11 items-center justify-center rounded-full bg-black/45">
                <DotsThreeIcon size={25} color="#FAF9F6" weight="bold" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View
        className="-mt-7 items-center rounded-t-[30px] pb-3"
        style={{ backgroundColor: isDark ? '#0B0B0A' : '#FAF9F6' }}
      >
        <TouchableOpacity
          activeOpacity={restaurant.logoUrl ? 0.8 : 1}
          disabled={!restaurant.logoUrl}
          accessibilityRole={restaurant.logoUrl ? "imagebutton" : undefined}
          accessibilityLabel={restaurant.logoUrl ? "Open restaurant picture" : undefined}
          onPress={() => setLogoOpen(true)}
          className="-mt-14 rounded-full bg-white p-1.5 dark:bg-black"
        >
          <Avatar uri={restaurant.logoUrl} username={restaurant.name} size={104} fallbackType="restaurant" />
        </TouchableOpacity>
        <View className="mt-3 flex-row items-center justify-center px-6">
        <Text weight="bold" className="text-center text-2xl text-black dark:text-white">{restaurant.name}</Text>
        <RestaurantBadge size={19} status={restaurant.status} />
        </View>
        {certificationLabels.length ? (
          <View className="mt-2 flex-row flex-wrap justify-center gap-2 px-5">
            {certificationLabels.map((label) => (
              <View key={label} className="rounded-full bg-amber-100 px-3 py-1.5 dark:bg-amber-950/60">
                <Text className="text-xs font-bold text-amber-900 dark:text-amber-100">{label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {location || hotRightNow ? (
          <View className="mt-3 flex-row items-center justify-center gap-2 px-5">
            {location ? (
              <TouchableOpacity
                activeOpacity={0.7}
                className="min-w-0 shrink flex-row items-center rounded-full bg-blue-50 px-3 py-2 dark:bg-blue-950/40"
                onPress={() => setLocationActionsOpen(true)}
              >
                <MapPinIcon size={16} color="#3B82F6" weight="fill" />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  className="ml-1.5 min-w-0 shrink text-center font-medium text-blue-600 dark:text-blue-400"
                >
                  {location}
                </Text>
                <DirectionalIcon direction="forward" size={14} color="#3B82F6" weight="bold" />
              </TouchableOpacity>
            ) : null}
            {hotRightNow ? (
              <View className="shrink-0 flex-row items-center rounded-full bg-[#FFF0E6] px-3 py-2 dark:bg-[#3A211C]">
                <FireIcon size={15} color="#FF5B35" weight="fill" />
                <Text className="ml-1.5 text-xs font-bold text-brand">
                  {t('map:hotRightNow')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {restaurant.resolvedOpeningHours ? (
          <View className="mt-2">
            <RestaurantOpeningHoursSummary hours={restaurant.resolvedOpeningHours} />
          </View>
        ) : null}
        {restaurant.isHappyHourNow ? (
          <View className="mt-3">
            <HappyHourBadge restaurant={restaurant} />
          </View>
        ) : null}
        <RestaurantStats
          averageRating={averageRating}
          reviewsCount={reviewPosts.length}
          followersCount={restaurant.followersCount}
        />
        <View className="mt-5 w-full flex-row gap-3 px-5">
          <RestaurantFollowButton className="flex-1" isFollowing={restaurant.isFollowing} onPress={onToggleFollow} />
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center rounded-xl bg-gray-100 py-3 dark:bg-gray-800"
            onPress={() => router.push({ pathname: '/chats/[id]', params: { id: 'new-restaurant', type: 'RESTAURANT', restaurantId: restaurant.id, title: restaurant.name, imageUrl: restaurant.logoUrl ?? '' } })}
          >
            <ChatCircleIcon size={20} color="#6B7280" />
            <Text className="ml-2 font-bold text-black dark:text-white">{t('message')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FullScreenImageViewer
        uri={restaurant.logoUrl}
        visible={logoOpen}
        onClose={() => setLogoOpen(false)}
      />
      <AppBottomSheet
        open={locationActionsOpen}
        onClose={() => setLocationActionsOpen(false)}
        snapPoints={[Platform.OS === 'ios' ? "52%" : "42%"]}
      >
        <BottomSheetView className="flex-1 px-5 pb-8 pt-1">
          <Text className="text-xl font-bold text-black dark:text-white">
            {t('locationOptions')}
          </Text>
          <Text numberOfLines={2} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {location}
          </Text>

          <View className="mt-5 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
            <TouchableOpacity
              onPress={() => {
                setLocationActionsOpen(false);
                requestAnimationFrame(() => {
                  router.push({
                    pathname: '/(tabs)/map',
                    params: { restaurantId: restaurant.id },
                  });
                });
              }}
              className="h-16 flex-row items-center px-4"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950">
                <MapPinIcon size={21} color="#3B82F6" weight="fill" />
              </View>
              <Text className="ml-3 flex-1 text-base font-bold text-black dark:text-white">
                {t('viewOnMap')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setLocationActionsOpen(false);
                void Linking.openURL(wazeUrl).catch((error) =>
                  console.error('Could not open Waze', error),
                );
              }}
              className="h-16 flex-row items-center border-t border-black/5 px-4 dark:border-white/10"
            >
              <View className="h-10 w-10 overflow-hidden rounded-full">
                <Image
                  source={require('../../assets/images/waze-navigation.jpg')}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </View>
              <Text className="ml-3 flex-1 text-base font-bold text-black dark:text-white">
                {t('navigateWithWaze')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setLocationActionsOpen(false);
                void Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`,
                ).catch((error) =>
                  console.error('Could not open Google Maps', error),
                );
              }}
              className="h-16 flex-row items-center border-t border-black/5 px-4 dark:border-white/10"
            >
              <View
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: '#FFFFFF' }}
              >
                <GoogleMapsBrandIcon />
              </View>
              <Text className="ml-3 flex-1 text-base font-bold text-black dark:text-white">
                {t('navigateWithGoogleMaps')}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' ? (
              <TouchableOpacity
                onPress={() => {
                  setLocationActionsOpen(false);
                  void Linking.openURL(
                    `https://maps.apple.com/?daddr=${encodedDestination}&dirflg=d`,
                  ).catch((error) =>
                    console.error('Could not open Apple Maps', error),
                  );
                }}
                className="h-16 flex-row items-center border-t border-black/5 px-4 dark:border-white/10"
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                  <FontAwesome6 name="apple" size={24} color="#111111" />
                </View>
                <Text className="ml-3 flex-1 text-base font-bold text-black dark:text-white">
                  {t('navigateWithAppleMaps')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </BottomSheetView>
      </AppBottomSheet>
    </View>
  );
}
