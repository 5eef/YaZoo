import { EdgeSwipeBack } from '../components/EdgeSwipeBack';
import React, { useState } from 'react';
import { Image, Keyboard, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../components/Icon';
import { Avatar, Button, Label } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { primaryDestinations, secondaryDestinations, type Screen } from './destinations';
import type { User } from '../auth/session';

type Props = { onLogout: () => void; logoutBusy: boolean; backEnabled: boolean; onBack: () => void; children: React.ReactNode; screen: Screen; user: User; rtl: boolean; label: (key: Screen | 'menu' | 'close' | 'theme' | 'light' | 'dark' | 'system' | 'discoverShort' | 'messagesShort' | 'back' | 'logout') => string; navigate: (screen: Screen) => void; webLinks: { label: string; path: string }[]; openWeb: (path: string) => void; communitiesEnabled: boolean; };
export function YaZooShell({ children, onLogout, logoutBusy, backEnabled, onBack, screen, user, rtl, label, navigate, webLinks, openWeb, communitiesEnabled }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [drawer, setDrawer] = useState(false);
  const go = (target: Screen) => { Keyboard.dismiss(); setDrawer(false); navigate(target); };
  function item(target: Screen, compact = false) { const selected = screen === target; return <Pressable key={target} accessibilityRole="button" accessibilityLabel={label(target)} accessibilityState={{ selected }} onPress={() => go(target)} style={{ minHeight: 48, flex: compact ? 1 : undefined, flexDirection: compact ? 'column' : 'row', gap: 7, padding: compact ? 7 : 12, alignItems: 'center', borderRadius: 18, backgroundColor: selected || target === 'create-post' ? '#7c3aed' : 'transparent' }}><Icon name={target} color={selected || target === 'create-post' ? '#ffffff' : colors.brandText} size={compact ? 22 : 24} /><Text numberOfLines={compact ? 1 : undefined} adjustsFontSizeToFit={compact} minimumFontScale={0.8} style={{ fontSize: compact ? 11 : 15, color: selected || target === 'create-post' ? '#ffffff' : colors.text, flexShrink: 1 }}>{label(compact && target === 'discover' ? 'discoverShort' : compact && target === 'messages' ? 'messagesShort' : target)}</Text></Pressable>; }
  const logout = <View style={{ marginTop: 'auto', paddingTop: 16, borderTopWidth: 1, borderColor: colors.border }}><Pressable accessibilityRole="button" accessibilityLabel={label('logout')} accessibilityState={{ disabled: logoutBusy }} disabled={logoutBusy} onPress={() => { setDrawer(false); Keyboard.dismiss(); onLogout(); }} style={{ minHeight: 48, padding: 12, flexDirection: rtl ? 'row-reverse' : 'row', gap: 12, alignItems: 'center' }}><Icon name="logout" color={colors.danger} /><Text style={{ color: colors.danger }}>{label('logout')}</Text></Pressable></View>;
  const menu = <><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14 }}><Avatar name={user.name} uri={user.avatar} /><View style={{ flex: 1 }}><Label>{user.name}</Label><Label small muted>YaZoo</Label></View></View>{secondaryDestinations.filter(target => target !== 'communities' || communitiesEnabled).map(target => item(target))}{webLinks.map(value => <Button key={value.path} label={value.label} secondary onPress={() => { setDrawer(false); openWeb(value.path); }} />)}</>;
  return <EdgeSwipeBack enabled={backEnabled} onBack={onBack}><SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={['top', 'bottom']}><View style={{ flex: 1, flexDirection: 'row' }}>{wide && <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ width: 220, flexGrow: 0, borderRightWidth: 1, borderColor: colors.border, padding: 10, backgroundColor: colors.surface }}>{menu}{logout}</ScrollView>}<View style={{ flex: 1, minWidth: 0 }}>
    {screen !== 'reels' && <LinearGradient colors={[colors.surface, colors.muted]} style={{ margin: 10, marginBottom: 4, borderRadius: radius.header, padding: 10, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="YaZoo" onPress={() => go('feed')} style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, gap: 5 }}><Image source={require('../../assets/brand/yazoo-inapp-logo.png')} resizeMode="contain" style={{ width: 38, height: 38 }} /><View style={{ flex: 1 }}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={{ fontSize: 24, fontWeight: '800', color: colors.brandText }}>YaZoo</Text><Text numberOfLines={1} style={{ fontSize: 11, color: colors.secondary }}>{label(screen)}</Text></View></Pressable>
      {(['notifications', 'messages'] as const).map(target => <Pressable key={target} accessibilityRole="button" accessibilityLabel={label(target)} onPress={() => go(target)} style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name={target} color={colors.brandText} /></Pressable>)}
      <Pressable accessibilityRole="button" accessibilityLabel={label('menu')} accessibilityState={{ expanded: drawer }} onPress={() => { Keyboard.dismiss(); setDrawer(true); }} style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="menu" color={colors.brandText} /></Pressable>
    </LinearGradient>}
    <View style={{ flex: 1 }}>{children}</View>
    {!wide && <View style={{ margin: 10, marginTop: 0, padding: 5, borderRadius: radius.dock, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', gap: 2 }}>{primaryDestinations.map(target => item(target, true))}</View>}
  </View></View>
  <Modal visible={drawer} transparent animationType="slide" onRequestClose={() => setDrawer(false)}><View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', flexDirection: rtl ? 'row-reverse' : 'row' }}><SafeAreaView style={{ width: Math.min(width - 48, 350), backgroundColor: colors.surface }}><ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1 }}><Button label={label('close')} secondary onPress={() => setDrawer(false)} />{menu}{logout}</ScrollView></SafeAreaView><Pressable accessibilityRole="button" accessibilityLabel={label('close')} style={{ flex: 1 }} onPress={() => setDrawer(false)} /></View></Modal>
  </SafeAreaView></EdgeSwipeBack>;
}
