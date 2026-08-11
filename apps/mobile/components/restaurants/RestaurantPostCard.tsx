import { Restaurant } from "@findeat/types";
import { View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import Text from "../common/AppText";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";

type Props = {
  post: Restaurant["posts"][number];
};

export default function RestaurantPostCard({ post }: Props) {
  return (
    <View className="mt-4 rounded-2xl border border-gray-200 p-4">
      {!!post.imageUrl && (
        <ProgressiveImage
          source={{ uri: post.imageUrl }}
          className="mb-3 h-48 w-full rounded-2xl bg-gray-100"
          resizeMode="cover"
        />
      )}

      <Text className="font-bold text-black">{userDisplayName(post.author)}</Text>
      {post.author.displayName?.trim() ? (
        <Text className="text-xs text-gray-500">
          {usernameLabel(post.author.username)}
        </Text>
      ) : null}

      {!!post.description && (
        <Text className="mt-2 text-gray-700">{post.description}</Text>
      )}

      {post.rating != null && (
        <Text className="mt-2 font-bold text-black">⭐ {post.rating}/10</Text>
      )}

      <Text className="mt-3 text-gray-400">
        ❤️ {post._count.likes} · 💬 {post._count.comments}
      </Text>
    </View>
  );
}
