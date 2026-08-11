import { AppAlert as Alert } from "@/lib/appAlert";
import Text from "@/components/common/AppText";
import Avatar from "@/components/common/Avatar";
import { Skeleton, SkeletonList, SkeletonPulse, ThemedSafeAreaView } from "@/components/common";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import { Chat } from "@findeat/types/chat";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
  CameraIcon,
  UsersThreeIcon,
  UserPlusIcon,
} from "phosphor-react-native";
import DirectionalIcon from "@/components/common/icons/DirectionalIcon";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ImageCropPicker from "react-native-image-crop-picker";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";
import { userDisplayName, usernameLabel } from "@/lib/userIdentity";

export default function GroupDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useTranslation(["chat", "common"]);
  const { isDark } = useAppTheme();
  const foreground = isDark ? "#FAF9F6" : "#111827";

  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api.chats
      .get(id)
      .then((chat) => {
        if (!cancelled) setChat(chat);
      })
      .catch((error) => console.error("load group failed", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const isAdmin = chat?.participants.some(
    (participant) =>
      participant.userId === user?.id && participant.role === "ADMIN",
  );

  async function saveGroupPhoto(uri: string | null) {
    if (!chat || updatingPhoto) return;
    try {
      setUpdatingPhoto(true);
      const imageUrl = uri ? await uploadImage(uri, "other") : null;
      const updated = await api.chats.updateGroup(chat.id, { imageUrl });
      setChat(updated);
    } catch (error) {
      console.error("Could not update group photo", error);
      Alert.alert(t("common:error"), t("chat:groupPhotoUpdateError"));
    } finally {
      setUpdatingPhoto(false);
    }
  }

  function chooseGroupPhoto() {
    const cropOptions = {
      width: 1000,
      height: 1000,
      cropping: true,
      cropperCircleOverlay: true,
      freeStyleCropEnabled: false,
      mediaType: "photo" as const,
      compressImageQuality: 0.82,
      forceJpg: true,
      cropperToolbarTitle: t("chat:cropGroupPhoto"),
    };

    async function openCamera() {
      try {
        const image = await ImageCropPicker.openCamera(cropOptions);
        await saveGroupPhoto(image.path);
      } catch (error) {
        if ((error as { code?: string }).code !== "E_PICKER_CANCELLED") {
          Alert.alert(t("common:error"), t("chat:groupPhotoUpdateError"));
        }
      }
    }

    async function openLibrary() {
      try {
        const image = await ImageCropPicker.openPicker(cropOptions);
        await saveGroupPhoto(image.path);
      } catch (error) {
        if ((error as { code?: string }).code !== "E_PICKER_CANCELLED") {
          Alert.alert(t("common:error"), t("chat:groupPhotoUpdateError"));
        }
      }
    }

    Alert.alert(t("chat:changeGroupPhoto"), undefined, [
      { text: t("chat:takePhoto"), onPress: () => void openCamera() },
      {
        text: t("chat:chooseFromLibrary"),
        onPress: () => void openLibrary(),
      },
      ...(chat?.imageUrl
        ? [
            {
              text: t("chat:removeGroupPhoto"),
              style: "destructive" as const,
              onPress: () => void saveGroupPhoto(null),
            },
          ]
        : []),
      { text: t("common:cancel"), style: "cancel" },
    ]);
  }

  if (loading || !chat) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerBackVisible: false }} />
        <ThemedSafeAreaView>
          <SkeletonPulse>
            <View className="items-center border-b border-gray-100 px-6 py-8 dark:border-gray-800">
              <Skeleton width={96} height={96} circle />
              <Skeleton width="48%" height={28} radius={10} style={{ marginTop: 16 }} />
              <Skeleton width="24%" height={12} radius={6} style={{ marginTop: 10 }} />
              <Skeleton width={150} height={46} radius={16} style={{ marginTop: 24 }} />
            </View>
          </SkeletonPulse>
          <SkeletonList count={7} />
        </ThemedSafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          headerBackVisible: false,
          headerStyle: { backgroundColor: isDark ? "#0B0B0A" : "#FAF9F6" },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              className="flex-row items-center pr-3"
              onPress={() => router.back()}
            >
              <DirectionalIcon direction="back" size={24} color={foreground} />
              <Text className="text-lg text-black dark:text-white">
                {t("common:back")}
              </Text>
            </Pressable>
          ),
        }}
      />

      <ThemedSafeAreaView>
        <View className="items-center border-b border-gray-100 px-6 py-8 dark:border-gray-800">
          <TouchableOpacity
            disabled={!isAdmin || updatingPhoto}
            activeOpacity={isAdmin ? 0.75 : 1}
            onPress={chooseGroupPhoto}
          >
            {chat.imageUrl ? (
              <Avatar
                uri={chat.imageUrl}
                username={chat.title ?? t("chat:group")}
                size={96}
                showSnapIndicator={false}
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800">
                <UsersThreeIcon size={43} color="#6B7280" weight="fill" />
              </View>
            )}
            {isAdmin ? (
              <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-[#FAF9F6] bg-brand dark:border-[#0B0B0A]">
                {updatingPhoto ? (
                  <ActivityIndicator size="small" color="#FAF9F6" />
                ) : (
                  <CameraIcon size={18} color="#FAF9F6" weight="fill" />
                )}
              </View>
            ) : null}
          </TouchableOpacity>

          <Text className="mt-4 text-3xl font-bold text-black dark:text-white">
            {chat.title ?? "Group"}
          </Text>

          <Text className="mt-2 text-gray-500">
            {t("chat:members", { count: chat.participants.length })}
          </Text>

          {isAdmin ? (
            <TouchableOpacity
              className="mt-6 flex-row items-center rounded-2xl bg-[#171716] px-5 py-3 dark:bg-[#F7F6F2]"
              onPress={() =>
                router.push({
                  pathname: "/chats/group/add-members",
                  params: { id: chat.id },
                })
              }
            >
              <UserPlusIcon
                size={20}
                color={isDark ? "#171716" : "#F7F6F2"}
                weight="bold"
              />
              <Text className="ml-2 font-bold text-[#F7F6F2] dark:text-[#171716]">
                {t("chat:addMembers")}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          data={chat.participants}
          keyExtractor={(item) => item.userId}
          ListHeaderComponent={
            <Text className="px-5 py-4 text-sm font-bold uppercase text-gray-400">
              {t("chat:participants")}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center border-b border-gray-100 px-5 py-4 dark:border-gray-900"
              onPress={() =>
                router.push({
                  pathname: "/(users)/[id]",
                  params: { id: item.userId },
                })
              }
            >
              <Avatar
                uri={item.user.avatarUrl}
                username={item.user.username}
                size={48}
                showSnapIndicator={false}
              />

              <View className="ml-4 flex-1">
                <Text className="font-bold text-black dark:text-white">
                  {userDisplayName(item.user)}
                </Text>
                {item.user.displayName?.trim() ? (
                  <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {usernameLabel(item.user.username)}
                  </Text>
                ) : null}

                <Text className="mt-1 text-sm text-gray-500">
                  {t(item.role === "ADMIN" ? "chat:admin" : "chat:member")}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </ThemedSafeAreaView>
    </>
  );
}
