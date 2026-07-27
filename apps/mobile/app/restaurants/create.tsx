import { AppAlert as Alert } from "@/lib/appAlert";
import { TextInput } from "@/components/common";
import KeyboardAwareFormScrollView from "@/components/common/layout/KeyboardAwareFormScrollView";
import Text from "@/components/common/AppText";
import AddressAutocomplete from "@/components/forms/AddressAutocomplete";
import { api } from "@/lib/api";
import type { SelectedAddress } from "@findeat/types";
import { uploadImage } from "@/lib/uploadImage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Image, TouchableOpacity } from "react-native";

export default function CreateRestaurantScreen() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState<SelectedAddress | null>(null);
  const [description, setDescription] = useState("");

  const [avatarUri, setAvatarUri] = useState<string>();
  const [coverUri, setCoverUri] = useState<string>();

  const [loading, setLoading] = useState(false);

  async function pickLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  async function pickCover() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
    });

    if (!result.canceled) {
      setCoverUri(result.assets[0].uri);
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert("Restaurant name is required");
      return;
    }
    if (!address) {
      Alert.alert("Restaurant address is required");
      return;
    }

    try {
      setLoading(true);

      let avatarUrl: string | undefined;
      let coverUrl: string | undefined;

      if (avatarUri) {
        avatarUrl = await uploadImage(avatarUri, "restaurant");
      }

      if (coverUri) {
        coverUrl = await uploadImage(coverUri, "restaurant");
      }

      await api.restaurants.create({
        name,
        address: address.address,
        description,
        avatarUrl,
        coverUrl,
      });

      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Failed to create restaurant");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAwareFormScrollView
      className="flex-1 bg-white px-6 pt-10 dark:bg-black"
      bottomOffset={28}
    >
      <Text className="text-3xl font-bold mb-8">Create Restaurant</Text>

      <TouchableOpacity
        className="border rounded-2xl h-32 items-center justify-center"
        onPress={pickLogo}
      >
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            className="w-full h-full rounded-2xl"
          />
        ) : (
          <Text>Add Logo</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        className="border rounded-2xl h-48 mt-4 items-center justify-center"
        onPress={pickCover}
      >
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            className="w-full h-full rounded-2xl"
          />
        ) : (
          <Text>Add Cover</Text>
        )}
      </TouchableOpacity>

      <TextInput
        className="border rounded-2xl mt-6 p-4"
        placeholder="Restaurant name"
        value={name}
        onChangeText={setName}
      />

      <AddressAutocomplete onSelect={setAddress} />

      <TextInput
        className="border rounded-2xl mt-4 p-4 h-32"
        multiline
        textAlignVertical="top"
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity
        className="bg-black rounded-2xl py-4 mt-8 mb-20"
        onPress={handleCreate}
      >
        <Text className="text-white font-bold text-center">
          {loading ? "Creating..." : "Create Restaurant"}
        </Text>
      </TouchableOpacity>
    </KeyboardAwareFormScrollView>
  );
}
