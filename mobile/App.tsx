import { ReelsScreen } from './src/components/reels/ReelsScreen';
import { Stack, router, usePathname, type Href } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, I18nManager, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { getLocales } from 'expo-localization';
import { deviceLocale, startupLocale } from './src/i18n/deviceLocale';
import { BrandLoading } from './src/components/auth/BrandLoading';
import { MobileAuthEntry } from './src/components/auth/MobileAuthEntry';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import type { Colors } from './src/theme/tokens';
import { YaZooShell } from './src/navigation/YaZooShell';
import { screens, socialScreens, type Screen } from './src/navigation/destinations';
import { useSocial } from './src/features/social/useSocial';
import { Avatar, Button } from './src/components/ui';
import { ProfessionalCard } from './src/components/ProfessionalCard';
import { api, authorizeBroadcast, configureSession } from './src/api/client';
import { connectRealtime, type RealtimeEvent } from './src/api/realtime';
import { realtimeUrl } from './src/api/realtimeConfig';
import type { Notification } from './src/features/social/types';
import { ApiError, failureKey } from './src/api/errors';
import { clearSession, readSession, saveSession, type Session } from './src/auth/session';
import { dictionaries, type Locale, type TranslationKey } from './src/i18n/messages';
import type { Appointment, Collection, Conversation, Service, Slot, Vet } from './src/features/types';

function phoneLocale(): Locale { try { return deviceLocale(getLocales()[0]?.languageCode); } catch { return 'fr'; } }

const ScreenContext = createContext<React.ReactNode>(null);
export function PilotScreen() { return useContext(ScreenContext); }
function provideScreen(content: React.ReactNode) { return <ScreenContext.Provider value={content}><Stack screenOptions={{ headerShown: false }} /></ScreenContext.Provider>; }

export default function App() { return <SafeAreaProvider><ThemeProvider><PilotApp /></ThemeProvider></SafeAreaProvider>; }
function PilotApp() {
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [locale, setLocale] = useState<Locale>(phoneLocale);
  const [session, setSession] = useState<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const pathname = usePathname();
  const routeScreen = pathname.slice(1);
  const screen: Screen = screens.includes(routeScreen as Screen) ? routeScreen as Screen : 'feed';
  const setScreen = (target: Screen) => router.push(`/${target}` as Href);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const social = useSocial(locale, session?.user, setScreen, contactUser, id => void openVeterinarian(id), error, busy);
  const resetSocial = social.reset;
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [vets, setVets] = useState<Vet[]>([]);
  const [selectedVet, setSelectedVet] = useState<Vet | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [reason, setReason] = useState('');
  const [animal, setAnimal] = useState('');
  const [body, setBody] = useState('');
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [reviewId, setReviewId] = useState<number | null>(null);
  const t = (key: TranslationKey) => dictionaries[locale][key];
  const rtl = locale === 'ar';
  const textStyle = { textAlign: 'auto' as const, writingDirection: rtl ? 'rtl' as const : 'ltr' as const };
  const invalidate = useCallback(() => {
    resetSocial();
    configureSession(null, () => {});
    const next = phoneLocale();
    setLocale(next); I18nManager.allowRTL(true); I18nManager.forceRTL(next === 'ar');
    setSession(null); setPassword(''); setConfirmation(''); setSelectedConversation(null);
    setConversations([]); setAppointments([]); setBody(''); setReason(''); setComment(''); setReviewId(null); router.replace('/');
    void clearSession().catch(() => {});
  }, [resetSocial]);
  useEffect(() => {
    let active = true;
    void Promise.all([readSession(), SecureStore.getItemAsync('yazoo-native-locale').catch(() => null)]).then(([saved, lang]) => {
      if (!active) return;
      const next = startupLocale(phoneLocale(), lang, !!saved);
      setLocale(next); I18nManager.allowRTL(true); I18nManager.forceRTL(next === 'ar');
      setSession(saved); configureSession(saved?.token || null, invalidate);
    }).catch(() => { if (active) setError(dictionaries[phoneLocale()].unexpected); }).finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, [invalidate]);
  const refreshScreen = useEffectEvent(() => { if (session) void perform(() => load(screen, 1)); });
  useEffect(() => { refreshScreen(); }, [screen, session?.user.id]);
  const receiveRealtime = useEffectEvent((event: RealtimeEvent) => {
    if (!session) return;
    if (event.event === 'message.sent') {
      const payload = event.data as { message?: Conversation['latestMessage'] };
      if (!payload.message?.id || !payload.message.body) return;
      const message = { ...payload.message, isOwn: payload.message.sender?.id === session.user.id };
      setSelectedConversation(previous => {
        if (!previous || event.channel !== `private-conversations.${previous.id}`) return previous;
        const messages = [...(previous.messages || []).filter(item => item.id !== message.id), message].sort((a, b) => a.id - b.id);
        return { ...previous, messages, latestMessage: message };
      });
      if (screen === 'conversation' && selectedConversation) void api(`/conversations/${selectedConversation.id}/read`, locale, 'PATCH').catch(() => {});
    }
    if (event.event === 'notification.created') {
      const payload = event.data as { notification?: Notification };
      if (payload.notification?.id) social.receiveNotification(payload.notification);
      if (screen === 'messages') refreshScreen();
    }
  });
  useEffect(() => {
    const url = realtimeUrl();
    if (!session || !url) return;
    return connectRealtime({ url, origin: 'https://yazoo-showcase.pages.dev',
      channels: [`private-users.${session.user.id}`, ...(screen === 'conversation' && selectedConversation ? [`private-conversations.${selectedConversation.id}`] : [])],
      authorize: authorizeBroadcast, receive: event => receiveRealtime(event),
      status: setRealtimeConnected, resync: () => refreshScreen(),
    });
  }, [session?.token, session?.user.id, screen, selectedConversation?.id]);
  useEffect(() => {
    if (!session || realtimeConnected || !['conversation', 'messages', 'notifications'].includes(screen)) return;
    const interval = setInterval(() => refreshScreen(), 30000);
    return () => clearInterval(interval);
  }, [session?.user.id, screen, realtimeConnected]);
  async function changeLocale(next: Locale) {
    try {
      await SecureStore.setItemAsync('yazoo-native-locale', next);
      social.clearError();
      setError(''); setFields({});
      setLocale(next); I18nManager.allowRTL(true); I18nManager.forceRTL(next === 'ar');
      if (I18nManager.isRTL !== (next === 'ar')) Alert.alert(dictionaries[next].language, dictionaries[next].restart);
    } catch { setError(t('unexpected')); }
  }
  const mutationLock = useRef(false);
  async function perform(action: () => Promise<void>) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true); setError(''); setFields({});
    try { await action(); } catch (failure) {
      const issue = failure instanceof ApiError ? failure : new ApiError(500);
      setError(t(failureKey(failure))); setFields(issue.fields);
    } finally { mutationLock.current = false; setBusy(false); }
  }
  async function load(target: Screen = screen, targetPage = page) {
    if ((socialScreens as readonly string[]).includes(target)) {
      await social.load(target, targetPage);
    } else if (target === 'discover') {
      const params = new URLSearchParams({ search, city, specialty, page: String(targetPage) });
      const result = await api<Collection<Vet>>(`/veterinarians?${params}`, locale);
      setVets(result.data); setPage(targetPage); setLastPage(result.meta?.last_page || 1);
    } else if (target === 'appointments') {
      setAppointments((await api<Collection<Appointment>>('/veterinarian-appointments', locale)).data);
    } else if (target === 'messages') {
      setConversations((await api<Collection<Conversation>>('/conversations', locale)).data);
    } else if (target === 'conversation' && selectedConversation) {
      setSelectedConversation((await api<{ data: Conversation }>(`/conversations/${selectedConversation.id}`, locale)).data);
      await api(`/conversations/${selectedConversation.id}/read`, locale, 'PATCH');
    } else if (target === 'profile' && selectedVet) {
      setSlots((await api<Collection<Slot>>(`/veterinarians/${selectedVet.id}/availability`, locale)).data);
    } else if (target === 'services') {
      setServices((await api<Collection<Service>>('/services', locale)).data);
    }
  }
  async function navigate(target: Screen) { Keyboard.dismiss(); if (target === 'user-profile') social.selectOwnProfile(); if (target === 'create-post') social.preparePost(); if (target === screen) await perform(() => load(target, 1)); else setScreen(target); }
  async function contactUser(id: number) {
    const result = await api<{ data: Conversation }>('/conversations/direct', locale, 'POST', { recipient_id: id });
    setSelectedConversation(result.data); setScreen('conversation');
  }
  async function authenticate() {
    await perform(async () => {
      const result = await api<Session>(`/auth/mobile/${register ? 'register' : 'login'}`, locale, 'POST', {
        email, password, device_name: `YaZoo ${Platform.OS}`, ...(register ? { name, password_confirmation: confirmation, preferred_locale: locale } : {})
      });
      await saveSession(result); setSession(result); configureSession(result.token, invalidate); setPassword(''); setConfirmation('');
      router.replace('/feed');
    });
  }
  async function openVeterinarian(id: number) { await perform(async () => { setSlots([]); setSelectedVet((await api<{ data: Vet }>(`/veterinarians/${id}`, locale)).data); setScreen('profile'); setSlots((await api<Collection<Slot>>(`/veterinarians/${id}/availability`, locale)).data); }); }
  function button(label: string, onPress: () => void, secondary = false) {
    return <Button label={label} onPress={onPress} secondary={secondary} disabled={busy} />;
  }
  function input(label: string, value: string, change: (text: string) => void, secure = false, field?: string) {
    return <View style={styles.field}><Text style={[styles.label, textStyle]}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change} maxLength={field === 'body' ? 5000 : undefined} multiline={field === 'body'} secureTextEntry={secure} autoCapitalize={secure || field === 'email' ? 'none' : 'sentences'} keyboardType={field === 'email' ? 'email-address' : field === 'rating' ? 'number-pad' : 'default'} style={[styles.input, textStyle]} />{field && fields[field]?.map((item, i) => <Text accessibilityRole="alert" key={i} style={styles.error}>{item}</Text>)}</View>;
  }
  const languages = <View style={styles.row}>{(['fr', 'ar', 'en'] as const).map(lang => <Pressable key={lang} accessibilityRole="button" accessibilityLabel={{fr: 'Français', ar: 'العربية', en: 'English'}[lang]} accessibilityState={{ selected: locale === lang }} style={[styles.language, locale === lang && styles.secondary]} onPress={() => void changeLocale(lang)}><Text style={{ color: colors.text }}>{lang.toUpperCase()}</Text></Pressable>)}</View>;
  if (restoring) return provideScreen(<BrandLoading backgroundColor={colors.page} />);
  if (!session) return provideScreen(<SafeAreaView style={styles.container}><MobileAuthEntry locale={locale} register={register} busy={busy} error={error}
    values={{ name, email, password, password_confirmation: confirmation }} fields={fields}
    onChange={(field, value) => ({ name: setName, email: setEmail, password: setPassword, password_confirmation: setConfirmation })[field](value)}
    onSubmit={() => void authenticate()} onToggle={() => { setRegister(!register); setFields({}); setError(''); }}
    onRetry={() => void perform(async () => { await api('/legal/config', locale); })} onLegal={path => void openLegal(path)} /></SafeAreaView>);
  const content = screen === 'reels' ? <ReelsScreen openFeed={() => void navigate('feed')} prepareComments={social.prepareReelComments} latestPost={social.latestReelPost} openVet={id => void openVeterinarian(id)} getSnapshot={social.getReelsSnapshot} saveSnapshot={social.saveReelsSnapshot} locale={locale} openAuthor={social.openProfile} renderComments={social.reelComments} /> : screen === 'feed' ? social.render('feed') : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView key={`${screen}:${session?.user.id || 'guest'}`} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={session ? <RefreshControl refreshing={busy} onRefresh={() => void perform(() => load())} colors={[colors.brandText]} tintColor={colors.brandText} /> : undefined}>
    {!!error && <View><Text accessibilityRole="alert" style={[styles.error, textStyle]}>{error}</Text>{button(t('retry'), () => void perform(async () => { if (session) await load(); else await api('/legal/config', locale); }), true)}</View>}
    {busy && <ActivityIndicator accessibilityLabel={t('loading')} color="#7c3aed" />}
    <View>
      {(socialScreens as readonly string[]).includes(screen) && social.render(screen)}
      {screen === 'discover' && <View><Text style={[styles.heading, textStyle]}>{t('pilot')}</Text>{input(t('search'), search, setSearch)}{input(t('city'), city, setCity)}<View style={styles.row}>{['Sefrou', 'Fès', 'Meknès'].map(value => <View key={value}>{button(value, () => setCity(value), true)}</View>)}</View>{input(t('specialty'), specialty, setSpecialty)}{button(t('search'), () => void perform(() => load('discover', 1)))}{button(t('services'), () => void navigate('services'), true)}
        {!vets.length && <Text style={[styles.text, textStyle]}>{t('empty')}</Text>}{vets.map(vet => <ProfessionalCard key={vet.id} professional={vet} trust={t('trust')} action={t('profile')} onPress={() => void perform(async () => { setSelectedVet(vet); setSlots([]); setScreen('profile'); setSelectedVet((await api<{ data: Vet }>(`/veterinarians/${vet.id}`, locale)).data); setSlots((await api<Collection<Slot>>(`/veterinarians/${vet.id}/availability`, locale)).data); })} />)}
        {page > 1 && button(t('previous'), () => void perform(() => load('discover', page - 1)), true)}{page < lastPage && button(t('next'), () => void perform(() => load('discover', page + 1)), true)}
      </View>}
      {screen === 'services' && <View>{!services.length && <Text style={styles.text}>{t('empty')}</Text>}{services.map(service => <View style={styles.card} key={service.id}><Text style={[styles.heading, textStyle]}>{service.title}</Text><Text style={[styles.text, textStyle]}>{service.city}</Text><Text style={[styles.text, textStyle]}>{service.description}</Text></View>)}</View>}
      {screen === 'profile' && selectedVet && <View><ProfessionalCard professional={selectedVet} trust={t('trust')} /><Text style={[styles.text, textStyle]}>{selectedVet.description}</Text><Text style={[styles.text, textStyle]}>{selectedVet.specialties?.join(' · ')}</Text>{selectedVet.owner?.isProfessionalVerified && <Text style={[styles.text, textStyle]}>{t('trust')}</Text>}
        {button(t('contact'), () => void perform(async () => { const result = await api<{ data: Conversation }>('/conversations/direct', locale, 'POST', { recipient_id: selectedVet.owner?.id }); setSelectedConversation(result.data); setScreen('conversation'); }))}
        {input(t('animal'), animal, setAnimal, false, 'animal_type')}{input(t('reason'), reason, setReason, false, 'reason')}{!slots.length && <Text style={styles.text}>{t('empty')}</Text>}{slots.map(slot => <View key={slot.id} style={styles.card}><Text style={[styles.text, textStyle]}>{new Date(slot.startsAt).toLocaleString(locale)}</Text>{button(t('book'), () => void perform(async () => { await api(`/veterinarians/${selectedVet.id}/appointments`, locale, 'POST', { availability_slot_id: slot.id, animal_type: animal, reason }); setReason(''); setScreen('appointments'); await load('appointments'); }))}</View>)}
      </View>}
      {screen === 'appointments' && <View>{!appointments.length && <Text style={styles.text}>{t('empty')}</Text>}{appointments.map(appointment => <View key={appointment.id} style={styles.card}><Text style={[styles.heading, textStyle]}>{appointment.veterinarianName}</Text><Text style={[styles.text, textStyle]}>{new Date(appointment.startsAt).toLocaleString(locale)} · {t(`status_${appointment.status}`)}</Text><Text style={[styles.text, textStyle]}>{appointment.reason}</Text>
        {appointment.canManage && appointment.status === 'pending' && <View>{button(t('confirm'), () => void transition(appointment.id, 'confirmed'))}{button(t('reject'), () => void transition(appointment.id, 'rejected'), true)}</View>}
        {appointment.canManage && appointment.status === 'confirmed' && Date.parse(appointment.endsAt) < Date.now() && button(t('complete'), () => void transition(appointment.id, 'completed'))}
        {appointment.canCancel && button(t('cancel'), () => void transition(appointment.id, 'cancelled'), true)}
        {appointment.canReview && button(t('review'), () => setReviewId(appointment.id), true)}
        {reviewId === appointment.id && <View>{input(t('rating'), rating, setRating, false, 'rating')}{input(t('comment'), comment, setComment, false, 'comment')}{button(t('send'), () => void perform(async () => { await api(`/veterinarian-appointments/${appointment.id}/review`, locale, 'POST', { rating: Number(rating), comment }); setReviewId(null); setComment(''); await load('appointments'); }))}</View>}
      </View>)}</View>}
      {screen === 'messages' && <View>{!conversations.length && <Text style={styles.text}>{t('empty')}</Text>}{conversations.map(conversation => <Pressable key={conversation.id} accessibilityRole="button" accessibilityLabel={conversation.participant.name} onPress={() => void perform(async () => { setSelectedConversation((await api<{ data: Conversation }>(`/conversations/${conversation.id}`, locale)).data); await api(`/conversations/${conversation.id}/read`, locale, 'PATCH'); setScreen('conversation'); })} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 80 }]}><Avatar name={conversation.participant.name} uri={conversation.participant.avatar} /><View style={{ flex: 1 }}><Text style={styles.heading}>{conversation.participant.name}</Text><Text numberOfLines={2} style={styles.text}>{conversation.latestMessage?.body}</Text><Text style={styles.label}>{conversation.updatedAt && new Date(conversation.updatedAt).toLocaleString(locale)}</Text></View>{!!conversation.unreadCount && <Text accessibilityLabel={`${t('unread')} ${conversation.unreadCount}`} style={{ color: colors.brandText, fontWeight: '700' }}>{conversation.unreadCount}</Text>}</Pressable>)}</View>}
      {screen === 'conversation' && selectedConversation && <View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Avatar name={selectedConversation.participant.name} uri={selectedConversation.participant.avatar} /><Text style={[styles.heading, textStyle]}>{selectedConversation.participant.name}</Text></View>{selectedConversation.messages?.map(message => <View key={message.id} style={[styles.card, { alignSelf: message.isOwn ? 'flex-end' : 'flex-start', maxWidth: '88%', backgroundColor: message.isOwn ? colors.muted : colors.surface }]}><Text style={[styles.label, textStyle]}>{message.sender?.name}</Text><Text style={[styles.text, textStyle]}>{message.body}</Text><Text style={styles.label}>{message.createdAt && new Date(message.createdAt).toLocaleTimeString(locale)}</Text></View>)}{input(t('message'), body, setBody, false, 'body')}{button(t('send'), () => void perform(async () => { if (!body.trim() || body.trim().length > 5000) throw new ApiError(422, { body: [t('validation')] }); await api(`/conversations/${selectedConversation.id}/messages`, locale, 'POST', { body: body.trim() }); setBody(''); await load('conversation'); }))}</View>}
      {screen === 'settings' && <View style={styles.card}><Text style={styles.heading}>{t('language')}</Text>{languages}<Avatar name={session.user.name} uri={session.user.avatar} size={64} /><Text style={[styles.heading, textStyle]}>{session.user.name}</Text><Text style={[styles.text, textStyle]}>{session.user.email}</Text><Text style={[styles.text, textStyle]}>{session.user.city}</Text><Text style={[styles.heading, textStyle]}>{t('theme')}</Text>{(['system', 'light', 'dark'] as const).map(value => <View key={value}>{button(`${t(value)}${preference === value ? ' ✓' : ''}`, () => void perform(() => setPreference(value)), true)}</View>)}<Text style={[styles.text, textStyle]}>{t('secure')}</Text>{button(t('logout'), () => void perform(async () => { await api('/auth/logout', locale, 'POST'); await clearSession(); invalidate(); }))}</View>}
    </View>
    <Text style={[styles.text, textStyle]}>{t('demo')}</Text>{button(t('privacy'), () => void openLegal('/privacy'), true)}{button(t('terms'), () => void openLegal('/cgu'), true)}
  </ScrollView></KeyboardAvoidingView>;
  return provideScreen(session ? <YaZooShell backEnabled={!['feed', 'reels', 'messages'].includes(screen) && (screen !== 'user-profile' || !social.isOwnProfile)} onBack={() => { Keyboard.dismiss(); if (router.canGoBack()) router.back(); else router.replace('/feed'); }} screen={screen} user={session.user} rtl={rtl} label={key => t(key)} navigate={target => void navigate(target)} communitiesEnabled={social.flags.communities} openWeb={path => void social.openWeb(path)} webLinks={[{ label: t('reservationsWeb'), path: '/reservations' }, { label: t('ordersWeb'), path: '/orders/history' }, { label: t('verificationWeb'), path: '/settings/professional-verification' }]}>{content}</YaZooShell> : <SafeAreaView style={styles.container}>{content}</SafeAreaView>);
  async function transition(id: number, status: string) { await perform(async () => { await api(`/veterinarian-appointments/${id}/status`, locale, 'PATCH', { status }); await load('appointments'); }); }
  async function openLegal(path: string) { try { const config = await api<{ frontendUrl: string }>('/legal/config', locale); const url = new URL(config.frontendUrl); if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid legal URL'); await Linking.openURL(`${url.origin}${path}?lang=${locale}`); } catch (failure) { setError(t(failureKey(failure))); } }
}
function createStyles(colors: Colors) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.page }, content: { padding: 16, paddingBottom: 28, width: '100%', maxWidth: 720, alignSelf: 'center' }, title: { fontSize: 32, fontWeight: '800', color: colors.brandText, marginBottom: 8 }, subtitle: { fontSize: 20, color: colors.text, marginBottom: 12 }, heading: { fontSize: 20, fontWeight: '700', color: colors.text, marginVertical: 10 }, text: { fontSize: 16, color: colors.text, lineHeight: 25, marginVertical: 6 }, secondary: { backgroundColor: colors.muted }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, language: { minHeight: 48, minWidth: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 16 }, field: { marginVertical: 8 }, label: { color: colors.secondary, fontSize: 13, marginBottom: 6 }, input: { minHeight: 48, backgroundColor: colors.form, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 12, fontSize: 16, color: colors.text }, card: { backgroundColor: colors.surface, borderRadius: 28, padding: 16, marginVertical: 8, borderWidth: 1, borderColor: colors.border }, error: { color: colors.danger, fontSize: 16, lineHeight: 24, marginVertical: 8 }
}); }
