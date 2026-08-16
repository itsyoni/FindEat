import { AppButton, Skeleton, SkeletonPulse, ThemedSafeAreaView } from "@/components/common";
import Text from "@/components/common/AppText";
import { api } from "@/lib/api";
import { Menu } from "@findeat/types";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, View } from "react-native";

export default function BusinessMenuScreen() {
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<Menu[]>([]);

  const loadBusiness = useCallback(async () => {
    try {
      const menus = await api.menu.myMenus();
      setMenus(menus);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBusiness();
    }, [loadBusiness]),
  );

  if (loading) {
    return (
      <ThemedSafeAreaView>
        <SkeletonPulse style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Skeleton width="58%" height={30} radius={10} />
          <Skeleton width="78%" height={13} radius={6} style={{ marginTop: 10 }} />
          <Skeleton height={48} radius={14} style={{ marginTop: 18 }} />
          {[0, 1, 2].map((item) => <View key={item} className="mt-4 gap-3 rounded-2xl bg-[#F5F4F5] p-4 dark:bg-gray-900"><Skeleton width="52%" height={20} radius={8} /><Skeleton width="82%" height={12} radius={6} /><Skeleton width="24%" height={11} radius={5} /><Skeleton height={46} radius={13} /><Skeleton height={46} radius={13} /></View>)}
        </SkeletonPulse>
      </ThemedSafeAreaView>
    );
  }

  return (
    <ThemedSafeAreaView>
      <View className="px-5 py-4">
        <Text className="text-3xl font-bold text-black">Menu & dishes</Text>
        <Text className="mt-2 text-gray-500">
          Manage the dishes people can review.
        </Text>

        <AppButton
          title="Add menu section"
          onPress={() => router.push("/business/menu/create")}
        />
      </View>

      <FlatList
        data={menus}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-gray-500">
            No menu sections yet.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-4 rounded-2xl bg-[#F5F4F5] p-4">
            <Text className="text-xl font-bold text-black">{item.title}</Text>

            {!!item.description && (
              <Text className="mt-1 text-gray-500">{item.description}</Text>
            )}

            <Text className="mt-3 text-sm text-gray-500">
              {item.items.length} dishes · {item.sectionType === "DRINKS" ? "Drinks" : "Food"}
            </Text>

            <AppButton
              title="Manage dishes"
              onPress={() =>
                router.push({
                  pathname: "/business/menu/[id]",
                  params: { id: item.id },
                })
              }
            />

            <AppButton
              title="Edit section"
              onPress={() =>
                router.push({
                  pathname: "/business/menu/edit-section/[id]",
                  params: {
                    id: item.id,
                    title: item.title,
                    description: item.description ?? "",
                    itemsCount: item.items.length.toString(),
                    sectionType: item.sectionType,
                  },
                })
              }
            />
          </View>
        )}
      />
    </ThemedSafeAreaView>
  );
}
