import { StorefrontIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import type { RestaurantStatus } from '@findeat/types';

type Props = {
  size?: number;
  status?: RestaurantStatus | string;
  claimed?: boolean;
};

export default function RestaurantBadge({ size = 16, status, claimed }: Props) {
  const isClaimed = claimed ?? (status ? status === 'CLAIMED' : true);

  return (
    <View
      accessibilityLabel={isClaimed ? 'Claimed restaurant' : 'Unclaimed restaurant'}
      className="ml-1.5 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: isClaimed ? '#3B82F6' : '#F05A3C',
      }}
    >
      <StorefrontIcon size={size * 0.65} color="#FAF9F6" weight="fill" />
    </View>
  );
}
