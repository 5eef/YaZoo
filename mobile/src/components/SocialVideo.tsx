import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Icon } from './Icon';
import { mediaHeaders } from '../api/client';
import { dictionaries, type Locale } from '../i18n/messages';

export function SocialVideo({ uri, active, muted, locale, onMute, fullscreen = false, onRatio }: { uri: string; active: boolean; muted: boolean; locale: Locale; onMute?: () => void; fullscreen?: boolean; onRatio?: (ratio: number) => void }) {
  const t = dictionaries[locale];
  const player = useVideoPlayer({ uri, headers: mediaHeaders(uri) }, value => { value.loop = true; value.muted = muted; });
  const [paused, setPaused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { videoTrack } = useEvent(player, 'videoTrackChange', { videoTrack: player.videoTrack });
  useEffect(() => { const subscription = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => subscription.remove(); }, []);
  // expo-video owns a mutable native player; mutations belong in effects, never during render.
  // eslint-disable-next-line react-hooks/immutability
  useEffect(() => { player.muted = muted; }, [player, muted]);
  useEffect(() => { if (active && foreground && !paused) player.play(); else player.pause(); }, [player, active, foreground, paused]);
  useEffect(() => { const size = videoTrack?.size; if (size?.width && size.height) onRatio?.(size.width / size.height); }, [videoTrack, onRatio]);
  return <View style={{ flex: 1, backgroundColor: '#000000' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={paused ? t.play : t.pause} accessibilityState={{ selected: paused }} onPress={() => setPaused(value => !value)} style={{ flex: 1 }}>
      <VideoView pointerEvents="none" player={player} nativeControls={false} contentFit="contain" surfaceType="textureView" style={{ flex: 1 }} />
      {paused && status !== 'error' && <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', top: '43%', padding: 14, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.45)' }}><Icon name="play" color="#ffffff" size={32} /></View>}
    </Pressable>
    {status === 'loading' && <ActivityIndicator accessibilityLabel={t.loading} color="#ffffff" size="small" style={{ position: 'absolute', top: '45%', alignSelf: 'center' }} />}
    {status === 'error' && <View style={{ position: 'absolute', top: '42%', alignSelf: 'center', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12 }}><Text accessibilityRole="alert" style={{ color: '#ffffff' }}>{t.videoUnavailable}</Text><Pressable accessibilityRole="button" accessibilityLabel={t.retry} onPress={() => void player.replaceAsync({ uri, headers: mediaHeaders(uri) }).catch(() => {})} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}><Icon name="retry" color="#ffffff" /></Pressable></View>}
    {onMute && <Pressable accessibilityRole="button" accessibilityLabel={muted ? t.unmute : t.mute} accessibilityState={{ selected: !muted }} onPress={onMute} style={{ position: 'absolute', right: 8, bottom: fullscreen ? 12 : 8, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}><Icon name={muted ? 'muted' : 'sound'} color="#ffffff" size={21} /></Pressable>}
  </View>;
}
