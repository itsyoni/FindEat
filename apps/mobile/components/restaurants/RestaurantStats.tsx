import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/contexts/ThemeContext';
import { StarIcon } from 'phosphor-react-native';
import Text from '../common/AppText';

type Props = {
  averageRating: number | null;
  reviewsCount: number;
  followersCount: number;
};

export default function RestaurantStats({
  averageRating,
  reviewsCount,
  followersCount,
}: Props) {
  const { t } = useTranslation('restaurants');
  const { isDark } = useAppTheme();
  const valueColor = isDark ? '#FAF9F6' : '#111';
  const roundedRating = averageRating?.toFixed(1);
  const formattedRating = roundedRating === '10.0' ? '10' : roundedRating;

  const stats = [
    {
      label: t('overallRating'),
      value: formattedRating ?? '—',
      showStar: averageRating != null,
    },
    {
      label: t('reviewsCount'),
      value: reviewsCount.toLocaleString(),
      showStar: false,
    },
    {
      label: t('followersCount'),
      value: followersCount.toLocaleString(),
      showStar: false,
    },
  ];

  return (
    <View className="mt-5 w-full flex-row">
      {stats.map((stat) => (
        <View key={stat.label} className="flex-1 items-center px-1">
          <View className="flex-row items-center justify-center gap-1">
            {stat.showStar ? (
              <StarIcon size={19} color="#F7D786" weight="fill" />
            ) : null}
            <Text weight="bold" className="text-xl" style={{ color: valueColor }}>
              {stat.value}
            </Text>
          </View>
          <Text className="mt-1 text-center text-xs text-gray-500">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
