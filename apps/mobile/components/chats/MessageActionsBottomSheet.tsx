import AppBottomSheet from '@/components/common/AppBottomSheet';
import Text from '@/components/common/AppText';
import { useAppTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import type { Message } from '@findeat/types';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { ArrowBendUpLeftIcon, CopyIcon, PencilSimpleIcon, StarIcon, TrashIcon, UserMinusIcon, UsersIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';

type Props = {
  message: Message | null;
  isMine: boolean;
  onClose: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message, scope: 'me' | 'everyone') => Promise<void>;
  onToggleStar: (message: Message) => Promise<void>;
};

const EDIT_WINDOW_MS = 2 * 60 * 60 * 1000;

export default function MessageActionsBottomSheet({ message, isMine, onClose, onReply, onEdit, onDelete, onToggleStar }: Props) {
  const { t } = useTranslation('chat');
  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const [showDeleteChoices, setShowDeleteChoices] = useState(false);
  const [deleting, setDeleting] = useState<'me' | 'everyone' | null>(null);
  const [starring, setStarring] = useState(false);
  const [withinEditWindow, setWithinEditWindow] = useState(false);
  const iconColor = isDark ? '#FAF9F6' : '#171717';
  const canEdit =
    !!message &&
    isMine &&
    !message.id.startsWith('pending-') &&
    !message.deletedAt &&
    (!message.type || message.type === 'TEXT') &&
    !!message.content &&
    withinEditWindow;

  useEffect(() => {
    let expiryTimeout: ReturnType<typeof setTimeout> | null = null;
    const availabilityTimeout = setTimeout(() => {
      if (!message) {
        setWithinEditWindow(false);
        return;
      }
      const remaining =
        new Date(message.createdAt).getTime() + EDIT_WINDOW_MS - Date.now();
      setWithinEditWindow(remaining > 0);
      if (remaining > 0) {
        expiryTimeout = setTimeout(() => setWithinEditWindow(false), remaining + 50);
      }
    }, 0);

    return () => {
      clearTimeout(availabilityTimeout);
      if (expiryTimeout) clearTimeout(expiryTimeout);
    };
  }, [message]);

  function close() {
    setShowDeleteChoices(false);
    setDeleting(null);
    setStarring(false);
    onClose();
  }

  async function toggleStar() {
    if (!message || starring) return;
    setStarring(true);
    try {
      await onToggleStar(message);
      close();
      showToast(t(message.starred ? 'messageUnstarred' : 'messageStarred'));
    } catch {
      showToast(t('messageStarError'), { kind: 'error' });
      setStarring(false);
    }
  }

  async function copy() {
    if (!message?.content) return;
    try {
      await Clipboard.setStringAsync(message.content);
      close();
      showToast(t('messageCopied'));
    } catch {
      showToast(t('messageCopyFailed'), { kind: 'error' });
    }
  }

  async function remove(scope: 'me' | 'everyone') {
    if (!message || deleting) return;
    setDeleting(scope);
    try {
      await onDelete(message, scope);
      close();
      showToast(t(scope === 'everyone' ? 'messageDeletedForEveryone' : 'messageDeletedForMe'));
    } catch {
      showToast(t('messageDeleteFailed'), { kind: 'error' });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AppBottomSheet open={!!message} onClose={close} snapPoints={[showDeleteChoices ? '36%' : '55%']}>
      <BottomSheetView className="flex-1 px-4 pb-6 pt-1">
        {showDeleteChoices ? <>
          <Text className="px-2 pb-3 text-center text-xl font-bold text-black dark:text-white">{t('deleteMessage')}</Text>
          <ActionRow icon={<UserMinusIcon size={23} color="#EF4444" weight="duotone" />} title={t('deleteForMe')} destructive loading={deleting === 'me'} onPress={() => void remove('me')} />
          {isMine ? <ActionRow icon={<UsersIcon size={23} color="#EF4444" weight="duotone" />} title={t('deleteForEveryone')} destructive loading={deleting === 'everyone'} onPress={() => void remove('everyone')} /> : null}
          <TouchableOpacity className="mt-3 items-center rounded-2xl bg-gray-100 py-4 dark:bg-gray-800" onPress={() => setShowDeleteChoices(false)}>
            <Text className="font-bold text-black dark:text-white">{t('cancel')}</Text>
          </TouchableOpacity>
        </> : <>
          <Text className="px-2 pb-3 text-center text-xl font-bold text-black dark:text-white">{t('messageOptions')}</Text>
          <ActionRow icon={<ArrowBendUpLeftIcon size={23} color={iconColor} weight="duotone" />} title={t('reply')} onPress={() => { if (message) onReply(message); close(); }} />
          {canEdit ? <ActionRow icon={<PencilSimpleIcon size={23} color={iconColor} weight="duotone" />} title={t('editMessage')} onPress={() => { onEdit(message); close(); }} /> : null}
          {message && !message.id.startsWith('pending-') ? <ActionRow icon={<StarIcon size={23} color="#D97706" weight={message.starred ? "fill" : "duotone"} />} title={t(message.starred ? 'unstarMessage' : 'starMessage')} loading={starring} onPress={() => void toggleStar()} /> : null}
          {message?.content ? <ActionRow icon={<CopyIcon size={23} color={iconColor} weight="duotone" />} title={t('copy')} onPress={() => void copy()} /> : null}
          <ActionRow icon={<TrashIcon size={23} color="#EF4444" weight="duotone" />} title={t('deleteMessage')} destructive onPress={() => setShowDeleteChoices(true)} />
        </>}
      </BottomSheetView>
    </AppBottomSheet>
  );
}

function ActionRow({ icon, title, onPress, destructive, loading }: { icon: ReactNode; title: string; onPress: () => void; destructive?: boolean; loading?: boolean }) {
  return <TouchableOpacity disabled={loading} onPress={onPress} className="mb-2 flex-row items-center rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900">
    <View className="mr-4 h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800">{loading ? <ActivityIndicator color="#EF4444" /> : icon}</View>
    <Text className={`text-base font-bold ${destructive ? 'text-red-500' : 'text-black dark:text-white'}`}>{title}</Text>
  </TouchableOpacity>;
}
