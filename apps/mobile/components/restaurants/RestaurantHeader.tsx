import Avatar from '@/components/common/Avatar';
import FullScreenImageViewer from '@/components/common/FullScreenImageViewer';
import { Restaurant } from '@findeat/types';
import { router } from 'expo-router';
import { ChatCircleIcon, DotsThreeIcon, MapPinIcon } from 'phosphor-react-native';
import DirectionalIcon from '@/components/common/icons/DirectionalIcon';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../common/AppText';
import RestaurantFollowButton from './RestaurantFollowButton';
import RestaurantStats from './RestaurantStats';
import RestaurantBadge from './RestaurantBadge';
import { useState } from 'react';
import { Skeleton, SkeletonPulse } from '../common';
import ParallaxProfileCover from '../profile/ParallaxProfileCover';
import { useAppTheme } from '@/contexts/ThemeContext';
import { RestaurantOpeningHoursSummary } from './RestaurantOpeningHours';

type Props = {
  restaurant?: Restaurant | null;
  loading?: boolean;
  onToggleFollow: () => void;
  onOpenOptions: () => void;
  scrollY: SharedValue<number>;
};

export default function RestaurantHeader({ restaurant, loading = false, onToggleFollow, onOpenOptions, scrollY }: Props) {
  const { t } = useTranslation('restaurants');
  const { isDark } = useAppTheme();
  const [logoOpen, setLogoOpen] = useState(false);

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
  const reviewPosts = restaurant.posts.filter((post) => post.type === 'REVIEW');
  const ratings = reviewPosts
    .map((post) => post.rating)
    .filter((rating): rating is number => rating != null);
  const averageRating = ratings.length > 0
    ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
    : null;
  return (
    <View style={{ backgroundColor: isDark ? '#0B0B0A' : '#FAF9F6' }}>
      <View className="relative">
        <ParallaxProfileCover uri={restaurant.coverUrl} scrollY={scrollY} />
        <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0 }}>
          <View className="flex-row items-center justify-between px-4 pt-2">
            <TouchableOpacity onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-black/45">
              <DirectionalIcon direction="back" variant="arrow" size={24} color="#FAF9F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenOptions} className="h-11 w-11 items-center justify-center rounded-full bg-black/45">
              <DotsThreeIcon size={25} color="#FAF9F6" weight="bold" />
            </TouchableOpacity>
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
        {location ? (
          <TouchableOpacity
            activeOpacity={0.7}
            className="mt-3 flex-row items-center rounded-full bg-blue-50 px-3 py-2 dark:bg-blue-950/40"
            onPress={() =>
              router.push({
                pathname: '/(tabs)/map',
                params: { restaurantId: restaurant.id },
              })
            }
          >
            <MapPinIcon size={16} color="#3B82F6" weight="fill" />
            <Text className="ml-1.5 max-w-72 text-center font-medium text-blue-600 dark:text-blue-400">{location}</Text>
            <DirectionalIcon direction="forward" size={14} color="#3B82F6" weight="bold" />
          </TouchableOpacity>
        ) : null}
        {restaurant.openingHours ? (
          <View className="mt-2">
            <RestaurantOpeningHoursSummary hours={restaurant.openingHours} />
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
    </View>
  );
}
