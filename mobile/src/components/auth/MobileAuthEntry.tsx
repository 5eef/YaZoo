import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../ui';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, spacing, themes, typography } from '../../theme/tokens';
import { dictionaries, type Locale } from '../../i18n/messages';

type Field = 'name' | 'email' | 'password' | 'password_confirmation';
type Props = {
  locale: Locale; register: boolean; busy: boolean; error: string;
  values: Record<Field, string>; fields: Record<string, string[]>;
  onChange: (field: Field, value: string) => void;
  onSubmit: () => void; onToggle: () => void; onRetry: () => void;
  onLegal: (path: string) => void;
};

export function MobileAuthEntry(props: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.page },
    content: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: spacing.xl, paddingBottom: spacing.xxl },
    logo: { width: 220, height: 220, alignSelf: 'center', borderRadius: radius.card, backgroundColor: themes.light.page },
    card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
    heading: { fontSize: typography.title, fontWeight: '700', color: colors.text },
    label: { fontSize: typography.caption, color: colors.secondary, marginBottom: spacing.sm },
    input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, padding: spacing.md, backgroundColor: colors.form, color: colors.text, fontSize: typography.body },
    text: { fontSize: typography.body, lineHeight: 25, color: colors.secondary },
    error: { fontSize: typography.body, lineHeight: 24, color: colors.danger },
    legal: { gap: spacing.sm, marginTop: spacing.lg },
  }), [colors]);
  const [progress] = useState(() => new Animated.Value(0));
  const [revealed, setRevealed] = useState(false);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    let active = true;
    const reveal = (reduceMotion: boolean) => {
      if (!active) return;
      setRevealed(true);
      if (reduceMotion) { progress.stopAnimation(); progress.setValue(1); }
      else Animated.parallel([
        Animated.timing(progress, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    };
    const timer = setTimeout(() => reveal(false), 800);
    const reduce = (enabled: boolean) => { if (enabled) { clearTimeout(timer); reveal(true); } };
    void AccessibilityInfo.isReduceMotionEnabled().then(reduce).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', reduce);
    return () => { active = false; clearTimeout(timer); listener.remove(); progress.stopAnimation(); };
  }, [progress]);
  const t = dictionaries[props.locale];
  const direction = { writingDirection: props.locale === 'ar' ? 'rtl' as const : 'ltr' as const, textAlign: props.locale === 'ar' ? 'right' as const : 'left' as const };
  const field = (key: Field, label: string, secure = false) => <View key={key}>
    <Text style={[styles.label, direction]}>{label}</Text>
    <TextInput accessibilityLabel={label} value={props.values[key]} onChangeText={value => props.onChange(key, value)} secureTextEntry={secure}
      autoCapitalize={key === 'name' ? 'words' : 'none'} autoCorrect={false} keyboardType={key === 'email' ? 'email-address' : 'default'}
      autoComplete={key === 'email' ? 'email' : key === 'name' ? 'name' : props.register ? 'new-password' : 'current-password'}
      style={[styles.input, direction]} />
    {props.fields[key]?.map((message, index) => <Text key={index} accessibilityRole="alert" style={[styles.error, direction]}>{message}</Text>)}
  </View>;
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} onLayout={event => {
    // Freeze the intro geometry: opening the keyboard must not restart or move it.
    if (!height) setHeight(event.nativeEvent.layout.height);
  }}>
    <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={revealed} contentContainerStyle={styles.content}>
      <Animated.View style={{ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [Math.max(0, (height - 220) / 2 - spacing.xl), -spacing.md] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] }) }] }}>
        <Image source={require('../../../assets/brand/yazoo-logo.png')} resizeMode="contain" style={styles.logo} accessible={!revealed} accessibilityLabel="YaZoo" accessibilityElementsHidden={revealed} importantForAccessibility={revealed ? 'no' : 'yes'} />
      </Animated.View>
      {revealed && <Animated.View testID="auth-form" style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
        <View style={styles.card}>
          <Text accessibilityRole="header" accessibilityLabel={`YaZoo — ${t[props.register ? 'register' : 'login']}`} style={[styles.heading, direction]}>{t[props.register ? 'register' : 'login']}</Text>
          {!!props.error && <View><Text accessibilityRole="alert" style={[styles.error, direction]}>{props.error}</Text><Button label={t.retry} onPress={props.onRetry} secondary disabled={props.busy} /></View>}
          {props.busy && <ActivityIndicator accessibilityLabel={t.loading} color={colors.brandText} />}
          {props.register && field('name', t.name)}
          {field('email', t.email)}{field('password', t.password, true)}
          {props.register && field('password_confirmation', t.confirmation, true)}
          {props.register && <Text style={[styles.text, direction]}>{t.consent}</Text>}
          <Button label={t[props.register ? 'register' : 'login']} onPress={props.onSubmit} disabled={props.busy} />
          <Button label={t[props.register ? 'login' : 'register']} onPress={props.onToggle} secondary disabled={props.busy} />
          <Text style={[styles.text, direction]}>{t.secure}</Text>
        </View>
        <View style={styles.legal}><Text style={[styles.text, direction]}>{t.demo}</Text>
          <Button label={t.privacy} onPress={() => props.onLegal('/privacy')} secondary disabled={props.busy} />
          <Button label={t.terms} onPress={() => props.onLegal('/cgu')} secondary disabled={props.busy} />
        </View>
      </Animated.View>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
