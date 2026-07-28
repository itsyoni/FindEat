import { Restaurant } from '@findeat/types';
import { ImagesSquareIcon, StarIcon } from 'phosphor-react-native';
import { ActivityIndicator, Pressable, TouchableOpacity, View } from 'react-native';
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { useAppTheme } from '@/contexts/ThemeContext';
import Text from '../common/AppText';
import { useTranslation } from 'react-i18next';
import { SkeletonList } from '@/components/common';

type Props = {
  posts: Restaurant['posts'];
  emptyText: string;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onPressPost: (postId: string) => void;
};

export default function RestaurantPostsSection({ posts, emptyText, loading, loadingMore, hasMore, onLoadMore, onPressPost }: Props) {
  const { isDark } = useAppTheme();
  const { t } = useTranslation('restaurants');
  const feedBackground = isDark ? '#000' : '#FFF';

  if (loading) {
    return (
      <View style={{ backgroundColor: feedBackground }}>
        <SkeletonList variant="grid" count={6} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View
        className="items-center justify-center py-16"
        style={{ backgroundColor: feedBackground }}
      >
        <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-gray-200 dark:border-gray-700">
          <ImagesSquareIcon size={28} color={isDark ? '#FFF' : '#111'} />
        </View>
        <Text className="mt-4 text-center text-gray-500">{emptyText}</Text>
      </View>
    );
  }

  return (
    <View className="-mx-6" style={{ backgroundColor: feedBackground }}>
      <View
        className="flex-row flex-wrap"
        style={{ backgroundColor: feedBackground }}
      >
        {posts.map((post) => (
        <Pressable
          key={post.id}
          onPress={() => onPressPost(post.id)}
          className="aspect-square w-1/3 border-[0.5px] border-gray-100 dark:border-gray-900"
          style={{ backgroundColor: isDark ? '#111827' : '#E5E7EB' }}
        >
          {post.imageUrl ? (
            <ProgressiveImage source={{ uri: post.imageUrl }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-gray-900 p-2">
              <Text className="text-center text-xs text-white" numberOfLines={4}>{post.description}</Text>
            </View>
          )}
          {post.type === 'REVIEW' && post.rating != null ? (
            <>
              <View className="absolute inset-0 bg-[#0000004D]" />
              <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-full bg-[#00000099] px-3 py-1">
                <StarIcon size={12} color="#F7D786" weight="fill" />
                <Text className="text-xs font-bold text-white">{post.rating}</Text>
              </View>
            </>
          ) : null}
        </Pressable>
        ))}
      </View>
      {hasMore ? (
        <TouchableOpacity disabled={loadingMore} onPress={onLoadMore} className="mx-6 my-5 rounded-xl bg-gray-100 py-3 dark:bg-gray-800">
          {loadingMore ? <ActivityIndicator /> : <Text className="text-center font-bold text-black dark:text-white">{t('loadMore')}</Text>}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
