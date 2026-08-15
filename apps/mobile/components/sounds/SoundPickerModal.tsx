import Text from "@/components/common/AppText";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useActiveCountry } from "@/contexts/ActiveCountryContext";
import { api } from "@/lib/api";
import type { Sound, SoundSelection } from "@findeat/types";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { MusicNoteIcon, PauseIcon, PlayIcon, TrashIcon, XIcon } from "phosphor-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, TextInput, TouchableOpacity, View, type GestureResponderEvent } from "react-native";

const CATEGORIES = [
  ["For You", "categories.forYou"],
  ["Trending", "categories.trending"],
  ["Chill", "categories.chill"],
  ["Food", "categories.food"],
  ["Fun", "categories.fun"],
  ["Cinematic", "categories.cinematic"],
] as const;

function percent(value: number): `${number}%` {
  return `${Math.round(value * 100)}%`;
}

function timestamp(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Slider({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [width, setWidth] = useState(260);
  const update = (event: GestureResponderEvent) => {
    onChange(Math.max(0, Math.min(1, event.nativeEvent.locationX / width)));
  };
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={update}
      onResponderMove={update}
      className="h-8 justify-center"
      style={{ width: 260, maxWidth: "100%" }}
    >
      <View className="h-1.5 overflow-hidden rounded-full bg-black/15 dark:bg-white/20">
        <View className="h-full rounded-full bg-[#E9B51B]" style={{ width: percent(value) }} />
      </View>
      <View className="absolute h-5 w-5 rounded-full border-2 border-[#FBFAF8] bg-[#E9B51B]" style={{ left: Math.max(0, Math.min(width - 20, value * width - 10)) }} />
    </Pressable>
  );
}

export default function SoundPickerModal({
  visible,
  value,
  hasOriginalAudio,
  onClose,
  onChange,
  surface = "post",
}: {
  visible: boolean;
  value: SoundSelection | null;
  hasOriginalAudio: boolean;
  onClose: () => void;
  onChange: (selection: SoundSelection | null) => void;
  surface?: "post" | "snap";
}) {
  const { isDark } = useAppTheme();
  const { t } = useTranslation("sound");
  const { activeCountry } = useActiveCountry();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("For You");
  const [draft, setDraft] = useState<SoundSelection | null>(value);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewPlayer = useAudioPlayer(null, { updateInterval: 250 });
  const previewStatus = useAudioPlayerStatus(previewPlayer);
  const previewRequestRef = useRef(0);
  const sounds = useQuery({
    queryKey: ["sounds", activeCountry?.code, query.trim(), category],
    queryFn: () => api.sounds.list({
      q: query.trim() || undefined,
      category: category === "For You" || category === "Trending" ? undefined : category,
      territory: activeCountry?.code,
    }),
    enabled: visible,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => setDraft(value), 0);
      void api.sounds.track({ event: "PICKER_OPENED", surface }).catch(() => undefined);
      return () => clearTimeout(timer);
    }
    else {
      previewRequestRef.current += 1;
      try {
        previewPlayer.pause();
      } catch {
        // The audio hook may already have released its native player while the
        // modal is being removed. There is nothing left to pause in that case.
      }
      const timer = setTimeout(() => setPreviewId(null), 0);
      return () => clearTimeout(timer);
    }
  }, [previewPlayer, surface, value, visible]);

  useEffect(() => {
    const cleanQuery = query.trim();
    if (!visible || cleanQuery.length < 2) return;
    const timer = setTimeout(() => {
      void api.sounds.track({ event: "SEARCHED", surface, query: cleanQuery }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [query, surface, visible]);

  useEffect(
    () => () => {
      // Invalidate pending seek/play work. useAudioPlayer owns and releases the
      // native object, so calling pause from this cleanup can race that release.
      previewRequestRef.current += 1;
    },
    [],
  );

  const selectedSoundId = draft?.sound.id;
  const data = useMemo(() => sounds.data ?? [], [sounds.data]);

  function togglePreview(sound: Sound) {
    if (!sound.audioUrl) return;
    if (previewId === sound.id && previewStatus.playing) {
      previewRequestRef.current += 1;
      try {
        previewPlayer.pause();
      } catch {
        setPreviewId(null);
      }
      return;
    }
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    try {
      previewPlayer.pause();
      previewPlayer.replace(sound.audioUrl);
      // expo-audio exposes volume as an imperative player property.
      // eslint-disable-next-line react-hooks/immutability
      previewPlayer.volume = 0.8;
      setPreviewId(sound.id);
      void api.sounds.track({ event: "PREVIEWED", soundId: sound.id, surface }).catch(() => undefined);
      void previewPlayer
        .seekTo(0)
        .then(() => {
          if (previewRequestRef.current !== requestId) return;
          try {
            previewPlayer.play();
          } catch {
            setPreviewId(null);
          }
        })
        .catch(() => {
          if (previewRequestRef.current === requestId) setPreviewId(null);
        });
    } catch {
      setPreviewId(null);
    }
  }

  function select(sound: Sound) {
    previewRequestRef.current += 1;
    try {
      previewPlayer.pause();
    } catch {
      // Selection is still valid if the preview player was already released.
    }
    setPreviewId(null);
    setDraft({ sound, soundStartTimeMs: 0, soundVolume: 0.8, originalAudioVolume: hasOriginalAudio ? 1 : 0 });
    void api.sounds.track({ event: "SELECTED", soundId: sound.id, surface }).catch(() => undefined);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-[#FBFAF8] px-4 pt-4 dark:bg-[#121210]">
        <View className="flex-row items-center justify-between py-2">
          <TouchableOpacity onPress={onClose} className="h-11 w-11 items-center justify-center">
            <XIcon size={24} color={isDark ? "#F5F2EC" : "#24231F"} weight="bold" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-black dark:text-white">{t("addSound")}</Text>
          <TouchableOpacity
            disabled={!draft}
            onPress={() => { onChange(draft); onClose(); }}
            className="min-w-11 items-end justify-center"
          >
            <Text className={draft ? "font-bold text-[#C99500]" : "font-bold text-gray-400"}>{t("done")}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("search")}
          placeholderTextColor={isDark ? "#88857F" : "#77736C"}
          className="mb-3 rounded-2xl bg-black/5 px-4 py-3 text-base text-black dark:bg-white/10 dark:text-white"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0, height: 50 }}
          contentContainerStyle={{
            gap: 8,
            height: 50,
            alignItems: "center",
            paddingBottom: 2,
          }}
        >
          {CATEGORIES.map(([value, label]) => (
            <TouchableOpacity
              key={value}
              onPress={() => setCategory(value)}
              className={
                category === value
                  ? "items-center justify-center rounded-full bg-[#E9B51B] px-4"
                  : "items-center justify-center rounded-full bg-black/5 px-4 dark:bg-white/10"
              }
              style={{ height: 36 }}
            >
              <Text
                className="text-sm font-semibold text-black dark:text-white"
                style={{ lineHeight: 18, textAlign: "center" }}
              >
                {t(label)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {draft ? (
          <View className="mb-3 rounded-2xl border border-[#E9B51B]/40 bg-[#E9B51B]/10 p-4">
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-bold text-black dark:text-white">{draft.sound.title}</Text>
                <Text numberOfLines={1} className="text-sm text-gray-600 dark:text-gray-300">{draft.sound.artist}</Text>
              </View>
              <TouchableOpacity onPress={() => {
                void api.sounds.track({ event: "REMOVED_BEFORE_PUBLISH", soundId: draft.sound.id, surface }).catch(() => undefined);
                setDraft(null);
                onChange(null);
              }} className="h-10 w-10 items-center justify-center">
                <TrashIcon size={21} color="#D94841" />
              </TouchableOpacity>
            </View>
            <View className="mt-3 flex-row items-center justify-between"><Text className="text-sm text-black dark:text-white">{t("start")}</Text><Text className="text-sm text-gray-600 dark:text-gray-300">{timestamp(draft.soundStartTimeMs)}</Text></View>
            <Slider
              value={draft.sound.durationMs > 0 ? draft.soundStartTimeMs / Math.max(1, draft.sound.durationMs - 1000) : 0}
              onChange={(ratio) => setDraft({ ...draft, soundStartTimeMs: Math.round(ratio * Math.max(0, draft.sound.durationMs - 1000)) })}
            />
            <View className="mt-3 flex-row items-center justify-between"><Text className="text-sm text-black dark:text-white">{t("sound")}</Text><Text className="text-sm text-gray-600 dark:text-gray-300">{percent(draft.soundVolume)}</Text></View>
            <Slider value={draft.soundVolume} onChange={(soundVolume) => setDraft({ ...draft, soundVolume })} />
            {hasOriginalAudio ? <>
              <View className="mt-2 flex-row items-center justify-between"><Text className="text-sm text-black dark:text-white">{t("originalAudio")}</Text><Text className="text-sm text-gray-600 dark:text-gray-300">{percent(draft.originalAudioVolume)}</Text></View>
              <Slider value={draft.originalAudioVolume} onChange={(originalAudioVolume) => setDraft({ ...draft, originalAudioVolume })} />
            </> : null}
          </View>
        ) : null}

        {sounds.isPending ? <ActivityIndicator className="mt-10" color="#E9B51B" /> : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text className="mt-10 text-center text-gray-500">{t("noResults")}</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => select(item)} className="flex-row items-center gap-3 border-b border-black/5 py-3 dark:border-white/10">
                <View className="h-12 w-12 overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
                  {item.artworkUrl ? <Image source={{ uri: item.artworkUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <View className="flex-1 items-center justify-center"><MusicNoteIcon size={23} color="#D5A400" weight="fill" /></View>}
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-bold text-black dark:text-white">{item.title}</Text>
                  <Text numberOfLines={1} className="text-sm text-gray-600 dark:text-gray-300">{item.artist} · {Math.floor(item.durationMs / 60000)}:{Math.floor((item.durationMs % 60000) / 1000).toString().padStart(2, "0")}</Text>
                </View>
                {selectedSoundId === item.id ? <Text className="font-bold text-[#C99500]">{t("selected")}</Text> : null}
                <TouchableOpacity onPress={() => togglePreview(item)} className="h-11 w-11 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
                  {previewId === item.id && previewStatus.playing ? <PauseIcon size={20} color={isDark ? "#F5F2EC" : "#24231F"} weight="fill" /> : <PlayIcon size={20} color={isDark ? "#F5F2EC" : "#24231F"} weight="fill" />}
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
