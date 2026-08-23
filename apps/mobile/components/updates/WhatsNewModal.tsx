import Text from '@/components/common/AppText';
import { useAuth } from '@/contexts/AuthContext';
import { useAppTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { ProductUpdate } from '@findeat/types';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TouchableOpacity, View } from 'react-native';
import ProgressiveImage from "@/components/common/ProgressiveImage";
import { SparkleIcon, XIcon } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

export default function WhatsNewModal() {
  const { user } = useAuth();
  const { isDark } = useAppTheme();
  const { t } = useTranslation('settings');
  const [updates, setUpdates] = useState<ProductUpdate[]>([]);
  const [index, setIndex] = useState(0);
  const current = updates[index];

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    api.productUpdates.unseen()
      .then((next) => {
        if (active) {
          setUpdates(next);
          setIndex(0);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!current?.id) return;
    void api.productUpdates.markSeen(current.id).catch(() => undefined);
  }, [current?.id]);

  if (!current) return null;
  const isLast = index >= updates.length - 1;
  const surface = isDark ? '#151515' : '#FAF9F6';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => setUpdates([])}>
      <View className="flex-1 items-center justify-center bg-black/60 px-5">
        <Pressable className="absolute inset-0" onPress={() => setUpdates([])} />
        <View style={{ backgroundColor: surface, maxHeight: '82%' }} className="w-full max-w-md overflow-hidden rounded-[30px]">
          {current.imageUrl ? (
            <ProgressiveImage source={{ uri: current.imageUrl }} className="h-56 w-full" resizeMode="cover" />
          ) : (
            <View className="h-40 items-center justify-center bg-amber-100 dark:bg-amber-950/40">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-brand">
                <SparkleIcon size={40} color="#FAF9F6" weight="fill" />
              </View>
            </View>
          )}
          <TouchableOpacity onPress={() => setUpdates([])} className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-black/55">
            <XIcon size={20} color="#FAF9F6" weight="bold" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row items-center">
              <SparkleIcon size={18} color="#F4B942" weight="fill" />
              <Text weight="bold" className="ml-2 text-sm uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t('whatsNew')}
              </Text>
              {current.versionLabel ? <Text className="ml-auto text-xs text-gray-400">{current.versionLabel}</Text> : null}
            </View>
            <Text weight="bold" className="mt-3 text-3xl text-black dark:text-white">{current.title}</Text>
            <Text className="mt-4 text-base leading-6 text-gray-600 dark:text-gray-300">{current.body}</Text>
          </ScrollView>
          <View className="flex-row items-center border-t border-gray-100 px-6 py-4 dark:border-gray-800">
            <View className="flex-row gap-1.5">
              {updates.map((update, itemIndex) => <View key={update.id} className={`h-1.5 rounded-full ${itemIndex === index ? 'w-6 bg-brand' : 'w-1.5 bg-gray-300 dark:bg-gray-700'}`} />)}
            </View>
            <TouchableOpacity
              className="ml-auto rounded-2xl bg-black px-6 py-3 dark:bg-white"
              onPress={() => isLast ? setUpdates([]) : setIndex((currentIndex) => currentIndex + 1)}
            >
              <Text weight="bold" className="text-white dark:text-black">{isLast ? t('gotIt') : t('nextUpdate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
