import { AppAlert as Alert } from "@/lib/appAlert";
import { AppButton, TextInput , ThemedSafeAreaView } from "@/components/common";
import Text from "@/components/common/AppText";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import { api } from "@/lib/api";
import { getErrorMessage } from "@findeat/utils";
import { uploadImage } from "@/lib/uploadImage";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Switch, TouchableOpacity, View } from "react-native";
import ProgressiveImage from "@/components/common/ProgressiveImage";

export default function EditMenuItemScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    description?: string;
    price?: string;
    imageUrl?: string;
    category?: string;
    isAvailable?: string;
    isFeatured?: string;
  }>();

  const initialImageUrl =
    params.imageUrl && params.imageUrl.length > 0 ? params.imageUrl : undefined;

  const [name, setName] = useState(params.name ?? "");
  const [description, setDescription] = useState(params.description ?? "");
  const [price, setPrice] = useState(params.price ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [imageUrl] = useState<string | undefined>(initialImageUrl);
  const [newImageUri, setNewImageUri] = useState<string>();
  const [isAvailable, setIsAvailable] = useState(
    params.isAvailable !== "false",
  );
  const [isFeatured, setIsFeatured] = useState(params.isFeatured === "true");
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewImageUri(result.assets[0].uri);
    }
  }

  async function saveDish() {
    if (!name.trim()) {
      Alert.alert("Missing name", "Dish name is required");
      return;
    }

    const parsedPrice = price.trim() ? Number(price) : null;

    if (price.trim() && Number.isNaN(parsedPrice)) {
      Alert.alert("Invalid price", "Price must be a number");
      return;
    }

    try {
      setLoading(true);

      let finalImageUrl = imageUrl;

      if (newImageUri) {
        finalImageUrl = await uploadImage(newImageUri, "dish");
      }

      await api.menu.updateDish(params.id, {
        name: name.trim(),
        description: description.trim() || null,
        price: parsedPrice,
        category: category.trim() || null,
        imageUrl: finalImageUrl ?? null,
        isAvailable,
        isFeatured,
      });

      router.back();
    } catch (error) {
      console.error(error);

      Alert.alert("Error", getErrorMessage(error, "Could not update dish"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteDish() {
    Alert.alert("Delete dish", "Are you sure you want to delete this dish?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);

            await api.menu.deleteDish(params.id);

            router.back();
          } catch (error) {
            console.error(error);
            Alert.alert(
              "Error",
              getErrorMessage(error, "Could not delete dish"),
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  const displayedImage = newImageUri ?? imageUrl;

  return (
    <ThemedSafeAreaView>
      <KeyboardAwareFormScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        bottomOffset={28}
      >
          <Text className="text-3xl font-bold text-black">Edit dish</Text>

          <TouchableOpacity
            className="mt-6 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 py-10"
            onPress={pickImage}
          >
            {displayedImage ? (
              <ProgressiveImage
                source={{ uri: displayedImage }}
                className="h-56 w-full rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-gray-500">+ Add dish photo</Text>
            )}
          </TouchableOpacity>

          <TextInput
            className="mt-6 rounded-2xl border border-gray-200 px-4 py-4 text-base text-black"
            placeholder="Dish name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            className="mt-4 rounded-2xl border border-gray-200 px-4 py-4 text-base text-black"
            placeholder="Price"
            placeholderTextColor="#9CA3AF"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <TextInput
            className="mt-4 rounded-2xl border border-gray-200 px-4 py-4 text-base text-black"
            placeholder="Category optional"
            placeholderTextColor="#9CA3AF"
            value={category}
            onChangeText={setCategory}
          />

          <TextInput
            className="mt-4 min-h-32 rounded-2xl border border-gray-200 px-4 py-4 text-base text-black"
            placeholder="Description"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <View className="mt-4 rounded-2xl bg-[#F5F4F5] p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="font-bold text-black">Available</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Hide this dish when it is sold out.
                </Text>
              </View>

              <Switch value={isAvailable} onValueChange={setIsAvailable} />
            </View>

            <View className="mt-4 flex-row items-center justify-between border-t border-gray-200 pt-4">
              <View className="flex-1 pr-4">
                <Text className="font-bold text-black">Featured dish</Text>
                <Text className="mt-1 text-sm text-gray-500">
                  Highlight this dish on your restaurant page.
                </Text>
              </View>

              <Switch value={isFeatured} onValueChange={setIsFeatured} />
            </View>
          </View>

          <AppButton
            title={loading ? "Saving..." : "Save changes"}
            onPress={saveDish}
            disabled={loading}
          />

          <AppButton
            title="Delete dish"
            onPress={deleteDish}
            disabled={loading}
          />
      </KeyboardAwareFormScrollView>
    </ThemedSafeAreaView>
  );
}
