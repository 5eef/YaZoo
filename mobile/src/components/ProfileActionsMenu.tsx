import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { dictionaries, type Locale } from '../i18n/messages';
import { useTheme } from '../theme/ThemeProvider';
import { radius, spacing } from '../theme/tokens';

type Props = {
  locale: Locale; disabled: boolean;
  onAvatar: () => void; onCover: () => void; onEdit: () => void;
  onSettings: () => void; onWeb: () => void;
};

export function ProfileActionsMenu({ locale, disabled, onAvatar, onCover, onEdit, onSettings, onWeb }: Props) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const t = dictionaries[locale];
  const textStyle = { color: colors.text, fontSize: 16, textAlign: locale === 'ar' ? 'right' as const : 'left' as const, writingDirection: locale === 'ar' ? 'rtl' as const : 'ltr' as const };
  const actions = [
    { label: t.editAvatar, press: onAvatar }, { label: t.editCover, press: onCover },
    { label: t.editProfile, press: onEdit }, { label: t.settings, press: onSettings }, { label: t.viewWeb, press: onWeb },
  ];
  return <>
    <Pressable testID="profile-actions-trigger" accessibilityRole="button" accessibilityLabel={t.profileActions}
      accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen(true)}
      style={{ width: 48, height: 48, borderRadius: radius.action, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted, opacity: disabled ? 0.55 : 1 }}>
      <Text accessible={false} style={{ color: colors.brandText, fontSize: 28 }}>⋮</Text>
    </Pressable>
    {open && <Modal transparent visible animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.close} onPress={() => setOpen(false)} style={{ flex: 1 }} />
        <SafeAreaView edges={['bottom', 'left', 'right']} accessibilityViewIsModal
          style={{ maxHeight: '80%', backgroundColor: colors.surface, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
            <Text accessibilityRole="header" style={[textStyle, { fontWeight: '700' }]}>{t.profileActions}</Text>
            {actions.map(action => <Pressable key={action.label} accessibilityRole="button" accessibilityLabel={action.label}
              disabled={disabled} accessibilityState={{ disabled }} onPress={() => { setOpen(false); action.press(); }}
              style={{ minHeight: 48, padding: spacing.md, justifyContent: 'center', borderRadius: radius.action, backgroundColor: colors.muted }}>
              <Text style={textStyle}>{action.label}</Text>
            </Pressable>)}
            <Pressable accessibilityRole="button" accessibilityLabel={t.close} onPress={() => setOpen(false)} style={{ minHeight: 48, padding: spacing.md, justifyContent: 'center' }}><Text style={textStyle}>{t.close}</Text></Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>}
  </>;
}
