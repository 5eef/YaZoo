import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { SocialVideo } from './SocialVideo';
import { Icon } from './Icon';
import { dictionaries, type Locale } from '../i18n/messages';
import { Label, mediaUrl } from './ui';
import { mediaHeaders } from '../api/client';
import { useTheme } from '../theme/ThemeProvider';
export type VideoPlayback = { active: boolean; muted: boolean; onMute: () => void; onRequestPlay: () => void };
function Video({ uri, locale, playback }: { uri: string; locale: Locale; playback?: VideoPlayback }) {
  const [ratio, setRatio] = useState(4 / 3);
  const [width, setWidth] = useState(320);
  const [requested, setRequested] = useState(false);
  const [muted, setMuted] = useState(true);
  const active = playback ? playback.active : requested;
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{ width: '100%', height: Math.min(420, width / ratio), marginVertical: 10, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000000' }}>
    {active ? <SocialVideo uri={uri} active muted={playback?.muted ?? muted} onMute={playback?.onMute || (() => setMuted(value => !value))} locale={locale} onRatio={setRatio} /> : <Pressable accessibilityRole="button" accessibilityLabel={dictionaries[locale].play} onPress={playback?.onRequestPlay || (() => setRequested(true))} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Icon name="play" color="#ffffff" size={28} /></Pressable>}
  </View>;
}
function Photo({ uri, label, fallback, maxHeight }: { uri: string; label: string; fallback: string; maxHeight: number }) {
  const { colors } = useTheme();
  const [ratio, setRatio] = useState(4 / 3);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  return <View style={{ borderRadius: 18, overflow: 'hidden', marginVertical: 10, backgroundColor: colors.muted }}>
    {failed ? <View style={{ padding: 24 }}><Label muted>{fallback}</Label></View> : <Image accessibilityLabel={label} source={{ uri, headers: mediaHeaders(uri) }} resizeMode="contain" onLoad={event => { const { width, height } = event.nativeEvent.source; if (width && height) setRatio(width / height); setLoading(false); }} onError={() => { setFailed(true); setLoading(false); }} style={{ width: '100%', aspectRatio: ratio, maxHeight, alignSelf: 'center' }} />}
    {loading && <ActivityIndicator color={colors.brandText} style={{ position: 'absolute', top: '45%', alignSelf: 'center' }} />}
  </View>;
}
export function Media({ uri, kind, label = '', fallback = '\u26a0', maxHeight = 520, locale = 'fr', playback }: { uri?: string | null; kind?: string; label?: string; fallback?: string; maxHeight?: number; locale?: Locale; playback?: VideoPlayback }) { const source = mediaUrl(uri); if (!source) return null; return kind === 'video' ? <Video key={source} uri={source} locale={locale} playback={playback} /> : <Photo key={source} uri={source} label={label} fallback={fallback} maxHeight={maxHeight} />; }
