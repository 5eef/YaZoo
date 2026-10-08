import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../api/client';
import { errorKey, ApiError } from '../../api/errors';
import { mediaUrl, Avatar, Button, Empty, Label } from '../ui';
import { EdgeSwipeBack } from '../EdgeSwipeBack';
import { SocialVideo } from '../SocialVideo';
import { Icon } from '../Icon';
import { dictionaries, type Locale } from '../../i18n/messages';
import { useTheme } from '../../theme/ThemeProvider';
import { canPlayReel, mergeReels, nextReelsBatch, publicPostLink } from '../../features/social/reelsModel';
import type { Post } from '../../features/social/types';
import type { Collection, Vet } from '../../features/types';

function Player({ post, active, muted, locale }: { post: Post; active: boolean; muted: boolean; locale: Locale }) {
  const uri = mediaUrl(post.mediaUrl);
  return uri ? <SocialVideo key={uri} uri={uri} active={active} muted={muted} locale={locale} fullscreen /> : <Text accessibilityRole="alert" style={{ color: '#ffffff' }}>{dictionaries[locale].videoUnavailable}</Text>;
}

const viewabilityConfig = { itemVisiblePercentThreshold: 70 };
export type ReelsSnapshot = { posts: Post[]; active: number; page: number; hasMore: boolean; muted: boolean };
export function ReelsScreen({ locale, openAuthor, renderComments, getSnapshot, saveSnapshot, openVet, latestPost, prepareComments, openFeed }: { openFeed: () => void; prepareComments: (post: Post) => void; latestPost: (post: Post) => Post; openVet: (id: number) => void; locale: Locale; openAuthor: (id: number) => Promise<void>; renderComments: (post: Post) => React.ReactNode; getSnapshot: () => ReelsSnapshot | null; saveSnapshot: (value: ReelsSnapshot) => void }) {
  const { colors } = useTheme();
  const t = dictionaries[locale];
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [snapshot] = useState(getSnapshot);
  const [posts, setPosts] = useState<Post[]>(snapshot?.posts || []);
  const [active, setActive] = useState(snapshot?.active || 0);
  const [height, setHeight] = useState(1);
  const [muted, setMuted] = useState(snapshot?.muted ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [comments, setComments] = useState<Post | null>(null);
  const [professionals, setProfessionals] = useState<Record<number, Vet>>({});
  const checkedAuthors = useRef(new Set<number>());
  const vetCatalog = useRef<Promise<Collection<Vet>> | null>(null);
  const page = useRef(snapshot?.page || 0);
  const [hasMore, setHasMore] = useState(snapshot?.hasMore ?? true);
  const pending = useRef(false);
  const alive = useRef(true);
  const likePending = useRef(false);
  const list = useRef<FlatList<Post>>(null);
  useEffect(() => { alive.current = true; const subscription = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => { alive.current = false; subscription.remove(); }; }, []);
  async function more() {
    if (pending.current || !hasMore) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const response = await nextReelsBatch(page.current, next => api<Collection<Post>>(`/posts?per_page=20&page=${next}`, locale), () => alive.current);
      if (!alive.current) return;
      page.current = response.page;
      setHasMore(response.hasMore);
      setPosts(current => mergeReels(current, response.posts));
    } catch (failure) { if (alive.current) setError(t[errorKey(failure instanceof ApiError ? failure.status : 0)]); }
    finally { pending.current = false; if (alive.current) setBusy(false); }
  }
  useEffect(() => { if (!snapshot) void more(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { saveSnapshot({ posts, active, page: page.current, hasMore, muted }); }, [posts, active, hasMore, muted, saveSnapshot]);
  useEffect(() => {
    const author = posts[active]?.author;
    if (!author || checkedAuthors.current.has(author.id)) return;
    checkedAuthors.current.add(author.id);
    // Clinic/professional names can differ from the social author's name. Match the real owner id.
    vetCatalog.current ||= api<Collection<Vet>>('/veterinarians?per_page=50', locale);
    void vetCatalog.current.then(response => { const vet = response.data.find(item => item.owner?.id === author.id); if (alive.current && vet) setProfessionals(current => ({ ...current, [author.id]: vet })); }).catch(() => { checkedAuthors.current.delete(author.id); vetCatalog.current = null; });
  }, [posts, active, locale]);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { index: number | null }[] }) => { const index = viewableItems[0]?.index; if (index != null) setActive(index); }, []);
  const action = (label: string, icon: string, press: () => void, count?: number, selected?: boolean) => <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ ...(selected != null ? { selected } : {}) }} onPress={press} style={{ width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 }}><Icon name={icon} filled={icon === 'heart' && selected} color={icon === 'heart' && selected ? colors.brandText : '#ffffff'} size={26} />{count != null && <Text style={{ color: '#ffffff', fontSize: 12 }}>{count}</Text>}</Pressable>;

  async function like(post: Post) {
    if (likePending.current) return;
    likePending.current = true;
    try { const result = await api<{ data: Post }>(`/posts/${post.id}/like`, locale, 'POST', { reaction: 'like' }); if (alive.current) setPosts(current => mergeReels(current, [result.data])); }
    catch (failure) { if (alive.current) { setError(t[errorKey(failure instanceof ApiError ? failure.status : 0)]); if (failure instanceof ApiError && failure.status === 404) setPosts(current => current.filter(value => value.id !== post.id)); } } finally { likePending.current = false; }
  }
  async function share(post: Post) {
    try { const config = await api<{ frontendUrl: string }>('/legal/config', locale); if (!alive.current) return; const link = publicPostLink(config.frontendUrl, post.id); await Share.share({ message: link ? `${post.content}\n${link}` : post.content }); } catch (failure) { if (alive.current) setError(t[errorKey(failure instanceof ApiError ? failure.status : 0)]); }
  }
  function closeComments() { if (comments) setPosts(current => mergeReels(current, [latestPost(comments)])); setComments(null); }
  return <View style={{ flex: 1, backgroundColor: colors.page }} onLayout={event => { const next = event.nativeEvent.layout.height; if (next > 0) setHeight(next); }}>
    {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, padding: 8 }}>{error}</Text>}
    {height > 1 && <FlatList ref={list} data={posts} initialScrollIndex={snapshot?.active || 0} keyExtractor={post => String(post.id)} pagingEnabled extraData={{ active, foreground, focused, muted, comments, height }} getItemLayout={(_, index) => ({ length: height, offset: height * index, index })} viewabilityConfig={viewabilityConfig} onViewableItemsChanged={onViewableItemsChanged} onEndReached={() => { if (posts.length) void more(); }} onEndReachedThreshold={0.6} initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3} renderItem={({ item: post, index }) => <View style={{ height, backgroundColor: '#000000' }}>
      {canPlayReel(index, active, foreground, focused, !!comments) && <Player post={post} active muted={muted} locale={locale} />}
      <View style={{ position: 'absolute', bottom: 20, start: locale === 'ar' ? 72 : 12, end: locale === 'ar' ? 12 : 72, padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)' }}><Pressable accessibilityRole="button" accessibilityLabel={`${t.profile} ${post.author.name}`} onPress={() => void openAuthor(post.author.id)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 48 }}><Avatar name={post.author.name} uri={post.author.avatar} size={36} /><Text style={{ color: 'white', flex: 1, fontWeight: '700', writingDirection: locale === 'ar' ? 'rtl' : 'ltr' }}>{post.author.name}</Text></Pressable>{professionals[post.author.id]?.owner?.isProfessionalVerified && <View accessible accessibilityLabel={t.trust}><Icon name="verified" color="#ffffff" size={18} /></View>}{professionals[post.author.id] && <Pressable accessibilityRole="button" accessibilityLabel={t.profile} onPress={() => openVet(professionals[post.author.id].id)} style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 18, marginVertical: 6 }}><Text style={{ color: '#ffffff', fontSize: 13 }}>{t.profile}</Text></Pressable>}<Text numberOfLines={3} style={{ color: 'white', writingDirection: locale === 'ar' ? 'rtl' : 'ltr' }}>{post.content}</Text></View>
      <View style={{ position: 'absolute', bottom: 20, ...(locale === 'ar' ? { start: 8 } : { end: 8 }), gap: 12, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 24 }}>{action(muted ? t.unmute : t.mute, muted ? 'muted' : 'sound', () => setMuted(value => !value), undefined, !muted)}{action(post.liked ? t.unlikePost : t.likePost, 'heart', () => void like(post), post.likes, post.liked)}{action(t.commentPost, 'messages', () => { prepareComments(post); setComments(post); }, post.commentsCount)}{post.visibility === 'public' && action(t.share, 'share', () => void share(post))}</View>

    </View>} ListEmptyComponent={!busy && !error ? <View><Empty label={hasMore ? t.noRecentReels : t.noReels} /><Button label={t.feed} onPress={openFeed} secondary /></View> : null} ListFooterComponent={<View style={{ padding: 12 }}>{busy ? <ActivityIndicator accessibilityLabel={t.loading} color={colors.brandText} /> : error ? <Button label={t.retry} onPress={() => void more()} /> : null}</View>} />}
    <Modal visible={!!comments} transparent animationType="slide" onRequestClose={closeComments}><View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}><View style={{ height: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: colors.page }}><EdgeSwipeBack onBack={closeComments}><SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.page }}><View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 }} /><View style={{ padding: 16 }}><Label>{t.comments}</Label></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>{comments && renderComments(comments)}</ScrollView></SafeAreaView></EdgeSwipeBack></View></View></Modal>

  </View>;
}
