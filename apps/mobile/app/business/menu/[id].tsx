import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import { api } from "@/lib/api";
import { getErrorMessage } from "@findeat/utils";
import { uploadImage } from "@/lib/uploadImage";
import { Menu } from "@findeat/types";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { ThemedSafeAreaView, AppButton, Skeleton, SkeletonPulse, TextInput } from "@/components/common";

export default function ManageMenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dishImageUri, setDishImageUri] = useState<string>();
  const [dishName, setDishName] = useState("");
  const [dishDescription, setDishDescription] = useState("");
  const [dishPrice, setDishPrice] = useState("");

  const loadMenu = useCallback(async () => {
    if (!id) return;

    try {
      const menu = await api.menu.getMenu(id);
      setMenu(menu);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function addDish() {
    if (!id) return;

    if (!dishName.trim()) {
      Alert.alert("Missing name", "Dish name is required");
      return;
    }

    const parsedPrice = dishPrice.trim() ? Number(dishPrice) : undefined;

    if (dishPrice.trim() && Number.isNaN(parsedPrice)) {
      Alert.alert("Invalid price", "Price must be a number");
      return;
    }

    const imageUrl = dishImageUri
      ? await uploadImage(dishImageUri, "dish")
      : undefined;

    try {
      setCreating(true);

      await api.menu.createDish(id, {
        name: dishName.trim(),
        description: dishDescription.trim() || undefined,
        price: parsedPrice,
        imageUrl,
      });

      setDishName("");
      setDishDescription("");
      setDishPrice("");
      setDishImageUri(undefined);

      await loadMenu();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", getErrorMessage(error, "Could not add dish"));
    } finally {
      setCreating(false);
    }
  }

  async function pickDishImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setDishImageUri(result.assets[0].uri);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadMenu();
    }, [loadMenu]),
  );

  if (loading) {
    return (
      <ThemedSafeAreaView>
        <SkeletonPulse style={{ padding: 20 }}>
          <Skeleton width="52%" height={30} radius={10} />
          <Skeleton width="76%" height={13} radius={6} style={{ marginTop: 10 }} />
          <View className="mt-6 gap-3 rounded-2xl bg-[#F5F4F5] p-4 dark:bg-gray-900">
            <Skeleton width="30%" height={20} radius={8} />
            <Skeleton height={130} radius={16} />
            <Skeleton height={52} radius={14} />
            <Skeleton height={52} radius={14} />
            <Skeleton height={92} radius={14} />
            <Skeleton height={48} radius={14} />
          </View>
          {[0, 1, 2].map((item) => <View key={item} className="mt-4 flex-row items-center gap-3"><Skeleton width={82} height={72} radius={14} /><View className="flex-1 gap-2"><Skeleton width="62%" height={16} radius={7} /><Skeleton width="88%" height={12} radius={6} /><Skeleton width="30%" height={12} radius={6} /></View></View>)}
        </SkeletonPulse>
      </ThemedSafeAreaView>
    );
  }

  if (!menu) {
    return (
      <ThemedSafeAreaView>
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-lg font-bold text-black">Menu not found</Text>
        </View>
      </ThemedSafeAreaView>
    );
  }

  return (
    <ThemedSafeAreaView>
      <FlatList
        data={menu.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        ListHeaderComponent={
          <View>
            <Text className="text-3xl font-bold text-black">{menu.title}</Text>

            {!!menu.description && (
              <Text className="mt-2 text-gray-500">{menu.description}</Text>
            )}

            <View className="mt-6 rounded-2xl bg-[#F5F4F5] p-4">
              <Text className="text-lg font-bold text-black">Add dish</Text>

              <TouchableOpacity
                className="mt-4 items-center justify-center rounded-2xl bg-white py-8"
                onPress={pickDishImage}
              >
                {dishImageUri ? (
                  <ProgressiveImage
                    source={{ uri: dishImageUri }}
                    className="h-40 w-full rounded-2xl"
                    resizeMode="cover"
                  />
                ) : (
                  <Text className="text-gray-500">+ Add dish photo</Text>
                )}
              </TouchableOpacity>

              <TextInput
                className="mt-4 rounded-2xl bg-white px-4 py-4 text-base text-black"
                placeholder="Dish name"
                placeholderTextColor="#9CA3AF"
                value={dishName}
                onChangeText={setDishName}
              />

              <TextInput
                className="mt-3 rounded-2xl bg-white px-4 py-4 text-base text-black"
                placeholder="Price"
                placeholderTextColor="#9CA3AF"
                value={dishPrice}
                onChangeText={setDishPrice}
                keyboardType="numeric"
              />

              <TextInput
                className="mt-3 min-h-24 rounded-2xl bg-white px-4 py-4 text-base text-black"
                placeholder="Description optional"
                placeholderTextColor="#9CA3AF"
                value={dishDescription}
                onChangeText={setDishDescription}
                multiline
                textAlignVertical="top"
              />

              <AppButton
                title={creating ? "Adding..." : "Add dish"}
                onPress={addDish}
                disabled={creating}
              />
            </View>

            <Text className="mt-8 mb-4 text-xl font-bold text-black">
              Dishes
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text className="text-center text-gray-500">No dishes yet.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            className="mb-3 rounded-2xl bg-[#F5F4F5] p-4"
            onPress={() =>
              router.push({
                pathname: "/business/menu/edit-item/[id]",
                params: {
                  id: item.id,
                  name: item.name,
                  description: item.description ?? "",
                  price: item.price?.toString() ?? "",
                  imageUrl: item.imageUrl ?? "",
                  category: item.category ?? "",
                  isAvailable: item.isAvailable.toString(),
                  isFeatured: item.isFeatured.toString(),
                },
              })
            }
          >
            <View className="flex-row gap-4">
              {item.imageUrl ? (
                <ProgressiveImage
                  source={{ uri: item.imageUrl }}
                  className="h-20 w-20 rounded-2xl bg-gray-200"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-20 w-20 items-center justify-center rounded-2xl bg-white">
                  <Text className="text-2xl">🍽️</Text>
                </View>
              )}

              <View className="flex-1">
                <View className="flex-row justify-between gap-3">
                  <Text className="flex-1 text-lg font-bold text-black">
                    {item.name}
                  </Text>

                  {typeof item.price === "number" && (
                    <Text className="font-bold text-black">₪{item.price}</Text>
                  )}
                </View>

                {!!item.category && (
                  <Text className="mt-1 text-xs font-semibold text-gray-400">
                    {item.category}
                  </Text>
                )}

                {!!item.description && (
                  <Text className="mt-2 text-sm leading-5 text-gray-600">
                    {item.description}
                  </Text>
                )}

                {!item.isAvailable && <Text>Unavailable</Text>}
                {item.isFeatured && <Text>Featured</Text>}

                <Text className="mt-3 text-xs font-semibold text-gray-400">
                  Tap to edit
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </ThemedSafeAreaView>
  );
}
