import { SearchBar } from './SearchBar';
import { ApiError, errorKey } from '../../api/errors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api } from '../../api/client';
import { dictionaries, type Locale, type TranslationKey } from '../../i18n/messages';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, Button, Card, Empty, Label } from '../ui';
import { Media, type VideoPlayback } from '../Media';
import { ProfessionalCard } from '../ProfessionalCard';
import { StoriesRail } from './StoriesRail';
import { feedRows, searchSections, mergeProfessionals, TOP_THRESHOLD, type FeedRow, type SearchResult, type SearchResults } from '../../features/social/feedModel';
import type { Collection, Vet } from '../../features/types';
import type { Person, Post, StoryGroup } from '../../features/social/types';

type Listing = SearchResult & { title?: string; media?: (string | { url?: string; path?: string })[]; provider?: { name?: string; isProfessionalVerified?: boolean } };
type FeedListRow = FeedRow | { key: string; kind: 'heading'; category: keyof typeof categoryLabels } | { key: string; kind: 'result'; category: keyof typeof categoryLabels; result: SearchResult };
const categoryLabels = { veterinarians: 'professionals', services: 'services', products: 'offers', posts: 'searchPosts', users: 'searchUsers', communities: 'communities' } as const;
const videoViewability = { itemVisiblePercentThreshold: 65, minimumViewTime: 200 };
type Props = { locale: Locale; user: Person; posts: Post[]; groups: StoryGroup[]; marketplace: boolean; communities: boolean; playbackEnabled?: boolean; renderPost: (post: Post, playback: VideoPlayback) => React.ReactNode; refresh: () => Promise<void>; more: () => Promise<void>; hasMore: boolean; onStory: (group: StoryGroup) => void; createStory: () => void; compose: () => void; discover: () => void; openVet: (id: number) => void; openResult: (category: string, result: SearchResult) => void; initialError?: string; initialBusy?: boolean };
export function FeedScreen(props: Props) {
  const { colors } = useTheme();
  const t = (key: TranslationKey) => dictionaries[props.locale][key];
  const list = useRef<FlatList<FeedListRow>>(null);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const onVisible = useCallback(({ viewableItems }: { viewableItems: { item: FeedListRow }[] }) => { const row = viewableItems.find(value => value.item.kind === 'post' && value.item.post.mediaKind === 'video')?.item; setActiveVideo(row?.kind === 'post' ? row.post.id : null); }, []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({});
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [above, setAbove] = useState(false);
  const [mediaGeneration, setMediaGeneration] = useState(0);
  const [vets, setVets] = useState<Vet[]>([]);
  const [services, setServices] = useState<Listing[]>([]);
  const [offers, setOffers] = useState<Listing[]>([]);
  const discoveryPending = useRef<Promise<void> | null>(null);
  const discoveryVersion = useRef(0);
  const mounted = useRef(true);
  const refreshPending = useRef(false);
  const morePending = useRef(false);
  const searchVersion = useRef(0);
  const locale = props.locale;
  const marketplace = props.marketplace;
  async function discovery() {
    if (discoveryPending.current) return discoveryPending.current;
    const version = discoveryVersion.current;
    const request = Promise.allSettled([api<Collection<Vet>>('/veterinarians?per_page=6', locale), api<Collection<Listing>>('/services/feed?per_page=6', locale), marketplace ? api<Collection<Listing>>('/products?per_page=6', locale) : Promise.resolve({ data: [] })]).then(([professionals, serviceData, productData]) => {
      if (!mounted.current || discoveryVersion.current !== version) return;
      if (professionals.status === 'fulfilled') setVets([...professionals.value.data].sort((a, b) => Number(!!b.owner?.isProfessionalVerified) - Number(!!a.owner?.isProfessionalVerified)));
      if (serviceData.status === 'fulfilled') setServices([...serviceData.value.data].sort((a, b) => Number(!!b.provider?.isProfessionalVerified) - Number(!!a.provider?.isProfessionalVerified)));
      if (productData.status === 'fulfilled') setOffers(productData.value.data);
    }).finally(() => { if (discoveryPending.current === request) discoveryPending.current = null; });
    discoveryPending.current = request;
    return request;
  }
  useEffect(() => { mounted.current = true; discoveryVersion.current++; discoveryPending.current = null; void discovery(); return () => { mounted.current = false; discoveryVersion.current++; }; }, [locale, marketplace]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const version = ++searchVersion.current;
    const value = query.trim();
    if (value.length < 2) return;
    let active = true;
    const timer = setTimeout(() => { setSearching(true); setSearchError(''); void Promise.allSettled([api<{ data: SearchResults }>(`/search?q=${encodeURIComponent(value)}&type=all`, locale), api<Collection<Vet>>(`/veterinarians?specialty=${encodeURIComponent(value.charAt(0).toLocaleUpperCase(locale) + value.slice(1))}&per_page=8`, locale)]).then(([search, specialties]) => { if (search.status === 'rejected') throw search.reason; const response = search.value; if (active && searchVersion.current === version) setResults({ ...response.data, veterinarians: mergeProfessionals(response.data.veterinarians || [], specialties.status === 'fulfilled' ? specialties.value.data : []) }); }).catch(failure => { if (__DEV__) console.warn('[YaZoo search]', failure instanceof ApiError ? failure.status : 'invalid response'); if (active && searchVersion.current === version) setSearchError(t(errorKey(failure instanceof ApiError ? failure.status : 0))); }).finally(() => { if (active && searchVersion.current === version) setSearching(false); }); }, 300);
    return () => { clearTimeout(timer); active = false; };
  }, [query, locale]); // eslint-disable-line react-hooks/exhaustive-deps -- translations are selected by locale, not by the render-time function
  async function refresh() {
    if (refreshPending.current) return;
    refreshPending.current = true;
    setRefreshing(true);
    try { await Promise.all([props.refresh(), discovery()]); if (mounted.current) setMediaGeneration(current => current + 1); } finally { refreshPending.current = false; if (mounted.current) setRefreshing(false); }
  }
  const sections = searchSections(results, marketplace).filter(section => section.key !== 'communities' || props.communities);
  function listingImage(item: Listing) { const first = item.media?.[0]; return item.imageUrl || (typeof first === 'string' ? first : first?.url || first?.path); }
  function rail(kind: 'vets' | 'services' | 'offers') {
    const items = kind === 'services' ? services : offers;
    return <View style={{ marginBottom: 16 }}><Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '700', color: colors.text, marginBottom: 10 }}>{t(kind === 'vets' ? 'professionals' : kind)}</Text>{kind === 'vets' ? <FlatList horizontal data={vets} keyExtractor={item => String(item.id)} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <View style={{ width: 270, marginEnd: 12 }}><ProfessionalCard professional={item} trust={t('trust')} action={t('profile')} onPress={() => props.openVet(item.id)} /></View>} /> : <FlatList horizontal data={items} keyExtractor={item => String(item.id)} showsHorizontalScrollIndicator={false} renderItem={({ item }) => <View style={{ width: 250, marginEnd: 12 }}><Card><Media uri={listingImage(item)} label={item.title || item.name} maxHeight={160} fallback={t('mediaFailed')} /><Label>{item.title || item.name}</Label><Label small muted>{[item.provider?.name, item.city].filter(Boolean).join(' · ')}</Label>{item.price != null && <Label small>{item.price.toLocaleString(props.locale)} MAD</Label>}<Button label={t(kind === 'services' ? 'services' : 'offers')} secondary onPress={() => props.openResult(kind === 'services' ? 'services' : 'products', item)} /></Card></View>} />}</View>;
  }
  function resultCard(category: keyof typeof categoryLabels, item: SearchResult) {
    return <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => props.openResult(category, item)}>{category === 'veterinarians' ? <ProfessionalCard professional={item} trust={t('trust')} action={t('profile')} onPress={() => props.openVet(item.id)} /> : <Card><Media uri={item.imageUrl || item.avatarUrl} label={item.name} maxHeight={180} fallback={t('mediaFailed')} /><Label>{item.name}</Label><Label small muted>{[item.clinicName, item.city, item.specialties?.join(' \u00b7 ')].filter(Boolean).join(' \u00b7 ')}</Label><Label small muted>{item.description}</Label>{item.price != null && <Label small>{item.price.toLocaleString(props.locale)} MAD</Label>}</Card>}</Pressable>;
  }
  const searchRows: FeedListRow[] = sections.flatMap(section => [{ key: `heading-${section.key}`, kind: 'heading' as const, category: section.key }, ...section.data.map(result => ({ key: `${section.key}-${result.id}`, kind: 'result' as const, category: section.key, result }))]);
  const searchingMode = query.trim().length > 0;
  const rows = feedRows(props.posts, [...(vets.length ? ['vets' as const] : []), ...(services.length ? ['services' as const] : []), ...(marketplace && offers.length ? ['offers' as const] : [])]);
  const searchBar = <SearchBar value={query} placeholder={t('searchYaZoo')} clearLabel={t('clearSearch')} rtl={props.locale === 'ar'} onChange={value => { if (value === query) return; searchVersion.current++; setResults({}); setSearchError(''); setSearching(value.trim().length >= 2); setQuery(value); list.current?.scrollToOffset({ offset: 0, animated: false }); }} onClear={() => { searchVersion.current++; setQuery(''); setResults({}); setSearching(false); }} />;
  const header = <>
    {searchingMode ? <>{searching && <ActivityIndicator accessibilityLabel={t('loading')} color={colors.brandText} />}{searchError && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{searchError}</Text>}{!searching && !searchError && !sections.length && <Empty label={t('empty')} />}</> : <>
      <StoriesRail key={mediaGeneration} groups={props.groups} user={props.user} ownLabel={t('yourStory')} createLabel={t('createStory')} openLabel={t('stories')} onOpen={props.onStory} onCreate={props.createStory} />
      <Button label={t('discover')} secondary onPress={props.discover} />
      <Card><Pressable accessibilityRole="button" accessibilityLabel={t('writePost')} onPress={props.compose} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}><Avatar name={props.user.name} uri={props.user.avatar} /><Label muted>{t('writePost')}</Label></Pressable></Card>
      {props.initialBusy && !props.posts.length && <ActivityIndicator accessibilityLabel={t('loading')} color={colors.brandText} />}{props.initialError && <Card><Text accessibilityRole="alert" style={{ color: colors.danger }}>{props.initialError}</Text>{!props.posts.length && <Button label={t('retry')} onPress={() => void refresh()} secondary />}</Card>}
    </>}
  </>;
  return <View style={{ flex: 1 }}><View style={{ paddingHorizontal: 16, paddingTop: 8, width: '100%', maxWidth: 720, alignSelf: 'center' }}>{searchBar}</View><FlatList ref={list} extraData={{ activeVideo, muted, playbackEnabled: props.playbackEnabled }} viewabilityConfig={videoViewability} onViewableItemsChanged={onVisible} data={searchingMode ? searchRows : rows} keyExtractor={item => `${item.key}:${mediaGeneration}`} ListHeaderComponent={header} renderItem={({ item }) => item.kind === 'post' ? <>{props.renderPost(item.post, { active: item.post.id === activeVideo && props.playbackEnabled !== false, muted, onMute: () => setMuted(value => !value), onRequestPlay: () => setActiveVideo(item.post.id) })}</> : item.kind === 'result' ? resultCard(item.category, item.result) : item.kind === 'heading' ? <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 19, fontWeight: '700', marginVertical: 12 }}>{t(categoryLabels[item.category])}</Text> : rail(item.kind)} contentContainerStyle={{ padding: 16, paddingBottom: 72, width: '100%', maxWidth: 720, alignSelf: 'center' }} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.brandText} colors={[colors.brandText]} />} onScroll={event => setAbove(event.nativeEvent.contentOffset.y > TOP_THRESHOLD)} scrollEventThrottle={100} onEndReachedThreshold={0.4} onEndReached={() => { if (!searchingMode && props.hasMore && !morePending.current && !refreshPending.current) { morePending.current = true; setLoadingMore(true); void props.more().finally(() => { morePending.current = false; setLoadingMore(false); }); } }} ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.brandText} /> : null} ListEmptyComponent={!searchingMode && !props.initialBusy && !props.posts.length ? <Empty label={t('empty')} /> : null} initialNumToRender={4} maxToRenderPerBatch={4} windowSize={7} />{above && <Pressable accessibilityRole="button" accessibilityLabel={t('scrollTop')} onPress={() => list.current?.scrollToOffset({ offset: 0, animated: true })} style={{ position: 'absolute', bottom: 16, end: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, elevation: 5, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.brandText, fontSize: 27 }}>↑</Text></Pressable>}</View>;
}
