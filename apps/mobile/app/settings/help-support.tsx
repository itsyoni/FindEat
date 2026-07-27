import Text from '@/components/common/AppText';
import { Skeleton, SkeletonPulse } from '@/components/common';
import AppButton from '@/components/common/buttons/AppButton';
import KeyboardAwareFormScrollView from '@/components/common/layout/KeyboardAwareFormScrollView';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';
import type { SupportTicket, SupportTicketCategory, SupportTicketStatus } from '@findeat/types';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import useSettingsDirection from '@/components/settings/useSettingsDirection';
import { useLocalSearchParams } from 'expo-router';

const categories: SupportTicketCategory[] = ['BUG', 'ACCOUNT', 'RESTAURANT', 'CONTENT', 'SAFETY', 'OTHER'];

export default function HelpSupportScreen() {
  const { t } = useTranslation('settings');
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const { isDark } = useAppTheme();
  const isAccessibilityRequest = topic === 'accessibility';
  const [category, setCategory] = useState<SupportTicketCategory>(isAccessibilityRequest ? 'OTHER' : 'BUG');
  const [subject, setSubject] = useState(isAccessibilityRequest ? t('accessibilitySupportSubject') : '');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const { isRtl, rowStyle, textStyle } = useSettingsDirection();

  const colors = {
    background: isDark ? '#000' : '#FBFAF8',
    surface: isDark ? '#151515' : '#FFF',
    input: isDark ? '#202020' : '#F3F0EB',
    text: isDark ? '#FFF' : '#171717',
    muted: isDark ? '#A3A3A3' : '#737373',
    border: isDark ? '#303030' : '#E7E1D8',
    accent: '#F4B942',
  };

  const loadTickets = useCallback(async () => {
    try {
      setError('');
      setTickets(await api.support.listMine());
    } catch {
      setError(t('supportLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    api.support.listMine()
      .then((nextTickets) => {
        if (active) setTickets(nextTickets);
      })
      .catch(() => {
        if (active) setError(t('supportLoadError'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [t]);

  async function submit() {
    if (subject.trim().length < 3 || message.trim().length < 10) return;
    setSaving(true);
    setSent(false);
    setError('');
    try {
      const ticket = await api.support.create({ category, subject: subject.trim(), message: message.trim() });
      setTickets((current) => [ticket, ...current]);
      setSubject('');
      setMessage('');
      setSent(true);
    } catch {
      setError(t('supportSubmitError'));
    } finally {
      setSaving(false);
    }
  }

  function statusLabel(status: SupportTicketStatus) {
    return t(`supportStatus.${status}`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <SettingsHeader title={t('helpSupport')} />
      <KeyboardAwareFormScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          bottomOffset={28}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadTickets(); }} tintColor={colors.text} />}
        >
          <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 22, padding: 18 }}>
            <Text weight="bold" style={[textStyle, { color: colors.text, fontSize: 20 }]}>{t('contactSupport')}</Text>
            <Text style={[textStyle, { color: colors.muted, marginTop: 6, lineHeight: 20 }]}>{t('supportIntro')}</Text>

            <Text weight="bold" style={[textStyle, { color: colors.text, marginTop: 22, marginBottom: 10 }]}>{t('supportCategory')}</Text>
            <View style={[rowStyle, { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }]}>
              {categories.map((item) => {
                const selected = item === category;
                return <TouchableOpacity key={item} onPress={() => setCategory(item)} style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: selected ? colors.accent : colors.input }}>
                  <Text weight={selected ? 'bold' : 'medium'} style={{ color: '#171717' }}>{t(`supportCategories.${item}`)}</Text>
                </TouchableOpacity>;
              })}
            </View>

            <Text weight="bold" style={[textStyle, { color: colors.text, marginTop: 20, marginBottom: 8 }]}>{t('supportSubject')}</Text>
            <TextInput
              value={subject}
              onChangeText={(value) => { setSubject(value); setSent(false); }}
              placeholder={t('supportSubjectPlaceholder')}
              placeholderTextColor={colors.muted}
              maxLength={120}
              style={{ backgroundColor: colors.input, color: colors.text, borderRadius: 14, paddingHorizontal: 14, minHeight: 48, fontSize: 16, textAlign: 'auto', writingDirection: isRtl ? 'rtl' : 'ltr' }}
            />
            <Text weight="bold" style={[textStyle, { color: colors.text, marginTop: 16, marginBottom: 8 }]}>{t('supportMessage')}</Text>
            <TextInput
              value={message}
              onChangeText={(value) => { setMessage(value); setSent(false); }}
              placeholder={t('supportMessagePlaceholder')}
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              maxLength={5000}
              style={{ backgroundColor: colors.input, color: colors.text, borderRadius: 14, padding: 14, minHeight: 120, fontSize: 16, textAlign: 'auto', writingDirection: isRtl ? 'rtl' : 'ltr' }}
            />
            {error ? <Text style={{ color: '#EF4444', marginTop: 12 }}>{error}</Text> : null}
            {sent ? <View style={{ backgroundColor: isDark ? '#17351F' : '#E8F7EC', borderRadius: 12, padding: 12, marginTop: 12 }}>
              <Text weight="bold" style={{ color: isDark ? '#86EFAC' : '#166534' }}>{t('ticketSent')}</Text>
              <Text style={{ color: isDark ? '#BBF7D0' : '#166534', marginTop: 2 }}>{t('ticketSentHint')}</Text>
            </View> : null}
            <AppButton title={t('submitTicket')} loading={saving} disabled={subject.trim().length < 3 || message.trim().length < 10} onPress={() => void submit()} className="mt-4" />
          </View>

          <Text weight="bold" style={[textStyle, { color: colors.text, fontSize: 20, marginTop: 28, marginBottom: 12 }]}>{t('mySupportRequests')}</Text>
          {loading ? <SkeletonPulse>{[0, 1].map((item) => <View key={item} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 }}><View className="flex-row items-center justify-between"><View className="flex-1 gap-2"><Skeleton width="58%" height={16} radius={7} /><Skeleton width="42%" height={11} radius={5} /></View><Skeleton width={72} height={28} radius={14} /></View><Skeleton width="100%" height={12} radius={6} style={{ marginTop: 16 }} /><Skeleton width="82%" height={12} radius={6} style={{ marginTop: 8 }} /></View>)}</SkeletonPulse> : tickets.length === 0 ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 18, padding: 24, alignItems: 'center' }}>
              <Text weight="bold" style={{ color: colors.text }}>{t('noSupportRequests')}</Text>
              <Text style={{ color: colors.muted, marginTop: 5, textAlign: 'center' }}>{t('noSupportRequestsSubtitle')}</Text>
            </View>
          ) : tickets.map((ticket) => (
            <View key={ticket.id} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 12 }}>
              <View style={[rowStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text weight="bold" style={[textStyle, { color: colors.text, fontSize: 16 }]}>{ticket.subject}</Text>
                  <Text style={[textStyle, { color: colors.muted, marginTop: 3 }]}>{t(`supportCategories.${ticket.category}`)} · {new Date(ticket.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={{ backgroundColor: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (isDark ? '#17351F' : '#E8F7EC') : colors.input, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text weight="bold" style={{ color: ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (isDark ? '#86EFAC' : '#166534') : colors.text, fontSize: 12 }}>{statusLabel(ticket.status)}</Text>
                </View>
              </View>
              <Text style={[textStyle, { color: colors.text, marginTop: 12, lineHeight: 20 }]}>{ticket.message}</Text>
              {ticket.adminReply ? <View style={{ backgroundColor: colors.input, borderRadius: 12, padding: 12, marginTop: 14 }}>
                <Text weight="bold" style={[textStyle, { color: colors.text }]}>{t('adminReply')}</Text>
                <Text style={[textStyle, { color: colors.text, marginTop: 5, lineHeight: 20 }]}>{ticket.adminReply}</Text>
              </View> : null}
            </View>
          ))}
      </KeyboardAwareFormScrollView>
    </SafeAreaView>
  );
}
