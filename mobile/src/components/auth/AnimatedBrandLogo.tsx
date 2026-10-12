import React, { useEffect, useState } from 'react';
import { AppState, Image, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const assets = {
  light: { video: require('../../../assets/brand/login-logo-light.mp4'), logo: require('../../../assets/brand/login-logo-light.png') },
  dark: { video: require('../../../assets/brand/login-logo-dark.mp4'), logo: require('../../../assets/brand/login-logo-dark.png') },
};

class VideoFallbackBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function BrandVideo({ source, visible }: { source: number; visible: boolean }) {
  const player = useVideoPlayer(source, value => {
    value.loop = true;
    value.muted = true;
    value.staysActiveInBackground = false;
  });
  const [failed, setFailed] = useState(() => player.status === 'error');
  const [firstFrame, setFirstFrame] = useState(false);
  useEffect(() => {
    const status = player.addListener('statusChange', event => {
      if (event.status === 'error') setFailed(true);
    });
    return () => status.remove();
  }, [player]);
  useEffect(() => {
    const sync = (state: string) => {
      try {
        if (visible && !failed && state === 'active') player.play();
        else player.pause();
      } catch { setFailed(true); }
    };
    sync(AppState.currentState);
    const listener = AppState.addEventListener('change', sync);
    return () => { listener.remove(); try { player.pause(); } catch { /* The hook may already have released the native player. */ } };
  }, [player, visible, failed]);
  useEffect(() => {
    if (firstFrame || failed || !visible) return;
    const timer = setTimeout(() => setFailed(true), 8000);
    return () => clearTimeout(timer);
  }, [firstFrame, failed, visible]);
  if (failed) return null;
  return <VideoView testID="login-brand-video" pointerEvents="none" accessible={false}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" focusable={false}
    player={player} nativeControls={false} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false}
    contentFit="contain" surfaceType="textureView" onFirstFrameRender={() => setFirstFrame(true)}
    style={[StyleSheet.absoluteFill, { opacity: firstFrame ? 1 : 0 }]} />;
}

export function AnimatedBrandLogo({ isDark, reduceMotion, visible, style, accessible }: {
  isDark: boolean; reduceMotion: boolean; visible: boolean; style: StyleProp<ViewStyle>; accessible: boolean;
}) {
  const mode = isDark ? 'dark' : 'light';
  const asset = assets[mode];
  return <View testID={`login-brand-${mode}`} style={style} pointerEvents="none" accessible={accessible}
    accessibilityLabel="YaZoo" accessibilityElementsHidden={!accessible} importantForAccessibility={accessible ? 'yes' : 'no-hide-descendants'}>
    <Image testID={`login-brand-fallback-${mode}`} source={asset.logo as ImageSourcePropType}
      resizeMode="contain" accessible={false} style={StyleSheet.absoluteFill} />
    {!reduceMotion && <VideoFallbackBoundary key={mode}><BrandVideo source={asset.video} visible={visible} /></VideoFallbackBoundary>}
  </View>;
}
