import type { ReelsSnapshot } from '../../components/reels/ReelsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeedScreen } from '../../components/feed/FeedScreen';
import { EdgeSwipeBack } from '../../components/EdgeSwipeBack';
import { PostHeaderActions } from '../../components/PostHeaderActions';
import { PostActions } from '../../components/PostActions';
import { publicPostLink } from './reelsModel';
import type { VideoPlayback } from '../../components/Media';
import { BackButton } from '../../components/BackButton';
import type { SearchResult } from './feedModel';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api/client';
import { ApiError, errorKey } from '../../api/errors';
import { Avatar, Button, Card, Empty, Input, Label, Loading, mediaUrl } from '../../components/ui';
import { Media } from '../../components/Media';
import { dictionaries, type Locale, type TranslationKey } from '../../i18n/messages';
import { useTheme } from '../../theme/ThemeProvider';
import type { Screen } from '../../navigation/destinations';
import type { User } from '../../auth/session';
import type { Collection } from '../types';
import type { Community, Notification, Post, Product, Profile, Story, StoryGroup } from './types';

export function useSocial(locale: Locale, user: User | undefined, navigate: (screen: Screen) => void, contactUser: (id: number) => Promise<void>, openVet: (id: number) => void, initialError = '', initialBusy = false) {
  const { colors } = useTheme();
  const t = (key: TranslationKey) => dictionaries[locale][key];
  const [posts, setPosts] = useState<Post[]>([]);
  const [ownProfileSelected, setOwnProfileSelected] = useState(true);
  const [reactionPost, setReactionPost] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [community, setCommunity] = useState<Community | null>(null);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [story, setStory] = useState<Story | null>(null);
  const [storyPlaylist, setStoryPlaylist] = useState<Story[]>([]);
  const [storyIndex, setStoryIndex] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [content, setContent] = useState('');
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [newStory, setNewStory] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [communityDescription, setCommunityDescription] = useState('');
  const [showCommunityForm, setShowCommunityForm] = useState(false);
  const [reportPost, setReportPost] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('other');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const profileId = useRef<number | null>(null);
  const [flags, setFlags] = useState({ social_feed: true, communities: true, product_marketplace: true, animal_listings_public: false });
  const reelsSnapshot = useRef<ReelsSnapshot | null>(null);
  const getReelsSnapshot = useCallback(() => reelsSnapshot.current, []);
  const saveReelsSnapshot = useCallback((value: ReelsSnapshot) => { reelsSnapshot.current = value; }, []);
  const reset = useCallback(() => { reelsSnapshot.current = null; profileId.current = null; setPosts([]); setCommunities([]); setStoryGroups([]); setStoryPlaylist([]); setProducts([]); setNotifications([]); setReportPost(null); setReportDetails(''); setCommunityName(''); setCommunityDescription(''); setEditing(null); setNewStory(false); setReplyTo(null); setPage(1); setLastPage(1); setProfile(null); setEditingProfile(false); setSelectedPost(null); setCommunity(null); setStory(null); setContent(''); setComment(''); setAsset(null); setError(''); }, []);
  const clearError = useCallback(() => setError(''), []);
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try { await action(); } catch (failure) { if (__DEV__ && !(failure instanceof ApiError)) { const code = (failure as { code?: unknown })?.code; console.warn('[YaZoo] Native action failed:', typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code) ? code : 'UNKNOWN_NATIVE_ERROR'); } setError(t(errorKey(failure instanceof ApiError ? failure.status : 0))); }
    finally { pending.current = false; setBusy(false); }
  }
  async function loadPosts(targetPage = 1, communityId?: number, lang = locale, authorId?: number, append = false) {
    const response = await api<Collection<Post>>(`/posts?page=${targetPage}${communityId ? `&community_id=${communityId}` : ''}${authorId ? `&author_id=${authorId}` : ''}`, lang);
    setPosts(current => append ? [...current, ...response.data.filter(value => !current.some(post => post.id === value.id))] : response.data); setPage(targetPage); setLastPage(response.meta?.last_page || 1);
  }
  async function load(target: Screen, targetPage = 1, lang = locale) {
    setReportSent(false);
    if (target === 'feed') {
      await loadPosts(targetPage, undefined, lang);
      const [stories, config] = await Promise.allSettled([api<Collection<StoryGroup>>('/stories', lang), api<{ features?: typeof flags }>('/legal/config', lang)]);
      if (stories.status === 'fulfilled') setStoryGroups(stories.value.data);
      if (config.status === 'fulfilled' && config.value.features) setFlags(config.value.features);
    } else if (target === 'communities') {
      const response = await api<Collection<Community>>(`/communities?page=${targetPage}`, lang); setCommunities(response.data); setPage(targetPage); setLastPage(response.meta?.last_page || 1);
    } else if (target === 'community' && community) {
      setCommunity((await api<{ data: Community }>(`/communities/${community.id}`, lang)).data);
      await loadPosts(targetPage, community.id, lang);
    } else if (target === 'user-profile' && user) {
      const authorId = profileId.current || user.id;
      setProfile((await api<{ data: Profile }>(`/users/${authorId}`, lang)).data); await loadPosts(targetPage, undefined, lang, authorId);
    } else if (target === 'notifications') {
      const response = await api<Collection<Notification>>(`/notifications?page=${targetPage}`, lang); setNotifications(response.data); setPage(targetPage); setLastPage(response.meta?.last_page || 1);
    } else if (target === 'marketplace' || target === 'favorites') {
      if (target === 'marketplace' && !flags.product_marketplace) { setProducts([]); return; }
      const response = await api<Collection<Product>>(`/${target === 'favorites' ? 'favorites' : 'products'}?page=${targetPage}`, lang); setProducts(response.data); setPage(targetPage); setLastPage(response.meta?.last_page || 1);
    }
  }
  async function openProfile(id: number) { profileId.current = id; setOwnProfileSelected(id === user?.id); await run(async () => { setProfile((await api<{ data: Profile }>(`/users/${id}`, locale)).data); await loadPosts(1, undefined, locale, id); navigate('user-profile'); }); }
  const button = (label: string, action: () => void, secondary = false) => <Button key={label} label={label} onPress={action} secondary={secondary} disabled={busy} />;
  async function pick() {
    await run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.85 });
      if (!result.canceled) {
        const value = result.assets[0];
        if (value.fileSize && value.fileSize > 20 * 1024 * 1024) { setError(t('mediaLimit')); return; }
        setAsset(value);
      }
    });
  }
  function payload() {
    if (!asset) return { content, visibility, ...(community ? { community_id: community.id } : {}) };
    const form = new FormData(); form.append('content', content); form.append('visibility', visibility);
    if (community && !newStory) form.append('community_id', String(community.id));
    form.append('media_file', { uri: asset.uri, name: asset.fileName || `upload.${asset.type === 'video' ? 'mp4' : 'jpg'}`, type: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg') } as unknown as Blob);
    return form;
  }
  async function pickProfileMedia(field: 'avatar_file' | 'cover_photo_file') {
    if (!profile?.isOwner) return;
    await run(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled) return;
      const value = result.assets[0];
      if (value.fileSize && value.fileSize > 5 * 1024 * 1024) { setError(t('profileMediaLimit')); return; }
      const form = new FormData(); form.append('_method', 'PATCH'); form.append('name', profile.name);
      form.append(field, { uri: value.uri, name: value.fileName || 'profile.jpg', type: value.mimeType || 'image/jpeg' } as unknown as Blob);
      setProfile((await api<{ data: Profile }>(`/users/${profile.id}`, locale, 'POST', form)).data);
    });
  }
  async function publish() {
    if (newStory && !asset) { setError(t('mediaRequired')); return; }
    await run(async () => {
      await api(editing ? `/posts/${editing}` : newStory ? '/stories' : '/posts', locale, editing ? 'PATCH' : 'POST', editing ? { content, visibility } : payload());
      setContent(''); setAsset(null); setEditing(null); setNewStory(false); navigate(community ? 'community' : 'feed'); await loadPosts(1, community?.id);
      if (newStory) setStoryGroups((await api<Collection<StoryGroup>>('/stories', locale)).data);
    });
  }
  async function web(path: string) { await run(async () => { const config = await api<{ frontendUrl: string }>('/legal/config', locale); const origin = mediaUrl(config.frontendUrl); if (!origin) throw new Error('Invalid public URL'); await Linking.openURL(`${new URL(origin).origin}${path}`); }); }
  function pager(target: Screen) { return <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>{page > 1 && button(t('previous'), () => void run(() => load(target, page - 1)), true)}{page < lastPage && button(t('next'), () => void run(() => load(target, page + 1)), true)}</View>; }
  async function react(post: Post, reaction: 'like' | 'love' | 'happy' | 'wow') {
    await run(async () => { const response = await api<{ data: Post }>(`/posts/${post.id}/like`, locale, 'POST', { reaction }); setPosts(current => current.map(value => value.id === post.id ? response.data : value)); if (selectedPost?.id === post.id) setSelectedPost(response.data); });
  }
  function postCard(post: Post, detail = false, commentsOnly = false, playback?: VideoPlayback) {
    return <Card key={post.id}><View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}><Pressable accessibilityRole="button" accessibilityLabel={`${t('profile')} ${post.author.name}`} onPress={() => void openProfile(post.author.id)} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flex: 1, minWidth: 0 }}><Avatar name={post.author.name} uri={post.author.avatar} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{post.author.name}</Text><Label small muted>{new Date(post.createdAt).toLocaleString(locale)} · {t((post.visibility || 'public') as 'public')}</Label></View></Pressable>{!commentsOnly && <PostHeaderActions locale={locale} owner={post.author.id === user?.id} following={!!post.author.isFollowing} disabled={busy} onEdit={() => { setEditing(post.id); setContent(post.content); setVisibility((post.visibility || 'public') as typeof visibility); setAsset(null); navigate('create-post'); }} onDelete={() => Alert.alert(t('deleteConfirm'), '', [{ text: t('close'), style: 'cancel' }, { text: t('delete'), style: 'destructive', onPress: () => void run(async () => { await api(`/posts/${post.id}`, locale, 'DELETE'); setPosts(current => current.filter(value => value.id !== post.id)); setSelectedPost(null); navigate('feed'); }) }])} onFollow={() => void run(async () => { await api(`/users/${post.author.id}/follow`, locale, post.author.isFollowing ? 'DELETE' : 'POST'); const update = (value: Post) => value.author.id === post.author.id ? { ...value, author: { ...value.author, isFollowing: !post.author.isFollowing } } : value; setPosts(current => current.map(update)); setSelectedPost(current => current ? update(current) : current); })} onReport={() => { setError(''); setReportPost(post.id); setReportReason('other'); setReportSent(false); setReportDetails(''); }} />}</View>
      <Label>{post.content}</Label>{!commentsOnly && <Media locale={locale} playback={playback} uri={post.mediaUrl || post.imageUrl} kind={post.mediaKind} label={post.content} fallback={t('mediaFailed')} />}
      {commentsOnly ? <Label small muted>{post.commentsCount} {t('comments')}</Label> : <PostActions locale={locale} liked={post.liked || !!post.userReaction} likes={post.likes} comments={post.commentsCount} disabled={busy} onLike={() => void react(post, 'like')} onReactions={() => setReactionPost(post)} onComment={() => { setSelectedPost(post); if (!detail) navigate('post'); }} onShare={() => void run(async () => { const config = await api<{ frontendUrl: string }>('/legal/config', locale); const link = publicPostLink(config.frontendUrl, post.id); await Share.share({ message: link ? `${post.content}\n${link}` : post.content }); })} />}

      {detail && <View>{post.comments?.map(item => <View key={item.id} style={{ padding: 12, marginVertical: 5, backgroundColor: colors.muted, borderRadius: 18 }}><Label small>{item.author.name}</Label><Label>{item.body} {item.reaction}</Label>{button(t('reply'), () => setReplyTo(item.id), true)}{item.author.id === user?.id && button(t('like'), () => void run(async () => { await api(`/comments/${item.id}/reaction`, locale, 'POST', { reaction: item.reaction ? null : '👍' }); const updated = { ...post, comments: post.comments?.map(value => value.id === item.id ? { ...value, reaction: item.reaction ? undefined : '👍' } : value) }; setSelectedPost(updated); }), true)}{item.replies?.map(reply => <View key={reply.id} style={{ marginStart: 16, marginTop: 8 }}><Label small>{reply.author.name}</Label><Label>{reply.body}</Label></View>)}</View>)}{replyTo && <>{<Label small>{t('reply')}</Label>}{button(t('close'), () => setReplyTo(null), true)}</>}<Input label={t('comment')} value={comment} onChangeText={setComment} multiline maxLength={2000} />{button(t('send'), () => void run(async () => { const response = await api<{ data: NonNullable<Post['comments']>[number] }>(`/posts/${post.id}/comments`, locale, 'POST', { body: comment, ...(replyTo ? { parent_id: replyTo } : {}) }); const updated = { ...post, comments: replyTo ? post.comments?.map(item => item.id === replyTo ? { ...item, replies: [...(item.replies || []), response.data] } : item) : [...(post.comments || []), response.data], commentsCount: post.commentsCount + 1 }; setSelectedPost(updated); setPosts(current => current.map(value => value.id === post.id ? updated : value)); setComment(''); setReplyTo(null); }))}</View>}
    </Card>;
  }
  async function markStory(value: Story) {
    if (value.isOwn) return;
    const response = await api<{ data: Story }>(`/stories/${value.id}/view`, locale, 'POST');
    setStoryGroups(current => current.map(group => { const stories = group.stories.map(item => item.id === value.id ? { ...item, ...response.data, isViewed: true } : item); return { ...group, stories, hasUnviewed: stories.some(item => !item.isViewed && !item.isOwn) }; }));
  }
  async function openStory(group: StoryGroup) { const first = group.stories[0]; if (!first) return; setStoryPlaylist(group.stories); setStoryIndex(0); setStory(first); await run(() => markStory(first)); }
  async function changeStory(index: number) { const next = storyPlaylist[index]; setStoryIndex(index); setStory(next); await run(() => markStory(next)); }
  async function openResult(category: string, result: SearchResult) {
    if (category === 'veterinarians') { openVet(result.id); return; }
    if (category === 'users') { await openProfile(result.id); return; }
    if (category === 'posts') { await run(async () => {
      let found = posts.find(post => post.id === result.id);
      if (!found && result.author) {
        let currentPage = 1, finalPage = 1;
        do { const response = await api<Collection<Post>>(`/posts?author_id=${result.author.id}&per_page=30&page=${currentPage}`, locale); found = response.data.find(post => post.id === result.id); finalPage = response.meta?.last_page || 1; currentPage++; } while (!found && currentPage <= finalPage);
      }
      if (found) { setSelectedPost(found); navigate('post'); } else { setError(t('empty')); }
    }); return; }
    if (category === 'communities') { await run(async () => { setCommunity((await api<{ data: Community }>(`/communities/${result.id}`, locale)).data); await loadPosts(1, result.id); navigate('community'); }); return; }
    await web(category === 'services' ? `/marketplace/services?service=${result.id}` : `/marketplace/products/${result.id}`);
  }
  function render(target: Screen) {
    let view: React.ReactNode;
    if (target === 'feed') view = user ? <FeedScreen locale={locale} user={user} posts={posts} groups={storyGroups} marketplace={flags.product_marketplace} communities={flags.communities} playbackEnabled={!story && reportPost === null && !reactionPost} renderPost={(post, playback) => postCard(post, false, false, playback)} refresh={() => run(() => load('feed'))} more={() => run(() => loadPosts(page + 1, undefined, locale, undefined, true))} hasMore={page < lastPage} onStory={group => void openStory(group)} createStory={() => { setCommunity(null); setNewStory(true); setEditing(null); setContent(''); setAsset(null); navigate('create-post'); }} compose={() => { preparePost(); navigate('create-post'); }} discover={() => navigate('discover')} openVet={openVet} openResult={(category, result) => void openResult(category, result)} initialError={initialError || error} initialBusy={initialBusy || busy} /> : null;
    else if (target === 'create-post') view = <Card><Label>{newStory ? t('createStory') : t('writePost')}</Label><Input label={newStory ? t('storyText') : t('writePost')} value={content} onChangeText={setContent} multiline maxLength={newStory ? 1200 : 5000} style={{ minHeight: 130 }} />{!newStory && <><Label small>{t('visibility')}</Label><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{(['public', 'followers', 'private'] as const).map(value => button(`${t(value)}${visibility === value ? ' ✓' : ''}`, () => setVisibility(value), true))}</View></>}{!editing && button(t('media'), () => void pick(), true)}{asset && <><Label small>{asset.fileName || t('media')}</Label>{asset.type === 'image' && <Image source={{ uri: asset.uri }} style={{ height: 180, width: '100%', borderRadius: 18 }} />}{button(t('removeMedia'), () => setAsset(null), true)}</>}{button(editing ? t('save') : t('publish'), () => void publish())}</Card>;
    else if (target === 'post') view = selectedPost ? postCard(selectedPost, true) : <Empty label={t('empty')} />;
    else if (target === 'user-profile') view = profile ? <><View style={{ borderRadius: 28, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><LinearGradient colors={['#5b21b6', '#8b5cf6', '#ddd6fe']} style={{ height: 150 }}>{mediaUrl(profile.coverPhoto) && <Image source={{ uri: mediaUrl(profile.coverPhoto) }} style={{ width: '100%', height: '100%' }} />}</LinearGradient><View style={{ padding: 20 }}><View style={{ marginTop: -54, marginBottom: 12 }}><Avatar name={profile.name} uri={profile.avatar} size={80} /></View><Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{profile.name}</Text><Label muted>{profile.city}</Label><Label>{profile.bio}</Label>{profile.isProfessionalVerified && <Label small>{t('trust')}</Label>}<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginVertical: 12 }}><Label small>{profile.postsCount} {t('posts')}</Label><Label small>{profile.followersCount} {t('followers')}</Label><Label small>{profile.followingCount} {t('following')}</Label></View>{profile.isOwner ? <>{button(t('avatar'), () => void pickProfileMedia('avatar_file'), true)}{button(t('cover'), () => void pickProfileMedia('cover_photo_file'), true)}{button(t('edit'), () => { setProfileName(profile.name); setProfileBio(profile.bio || ''); setProfileCity(profile.city || ''); setEditingProfile(true); }, true)}{button(t('settings'), () => navigate('settings'), true)}</> : button(profile.isFollowing ? t('unfollow') : t('follow'), () => void run(async () => { await api(`/users/${profile.id}/follow`, locale, profile.isFollowing ? 'DELETE' : 'POST'); setProfile((await api<{ data: Profile }>(`/users/${profile.id}`, locale)).data); }), true)}{!profile.isOwner && button(t('messages'), () => void run(() => contactUser(profile.id)), true)}{button(t('viewWeb'), () => void web(`/profile/${profile.id}`), true)}</View></View>{editingProfile && <Card><Input label={t('name')} value={profileName} onChangeText={setProfileName} maxLength={120} /><Input label={t('bio')} value={profileBio} onChangeText={setProfileBio} multiline maxLength={2000} /><Input label={t('city')} value={profileCity} onChangeText={setProfileCity} maxLength={100} />{button(t('save'), () => void run(async () => { const response = await api<{ data: Profile }>(`/users/${profile.id}`, locale, 'PATCH', { name: profileName, bio: profileBio, city: profileCity }); setProfile(response.data); setEditingProfile(false); }))}{button(t('close'), () => setEditingProfile(false), true)}{button(t('viewWeb'), () => void web(`/profile/${profile.id}`), true)}</Card>}{posts.filter(post => post.author.id === profile.id).map(post => postCard(post))}{!posts.some(post => post.author.id === profile.id) && <Empty label={t('noProfilePosts')} />}{pager('user-profile')}</> : <Empty label={t('empty')} />;
    else if (target === 'communities') view = <>{button(t('createCommunity'), () => setShowCommunityForm(!showCommunityForm), true)}{showCommunityForm && <Card><Input label={t('name')} value={communityName} onChangeText={setCommunityName} /><Input label={t('description')} value={communityDescription} onChangeText={setCommunityDescription} multiline />{button(t('createCommunity'), () => void run(async () => { await api('/communities', locale, 'POST', { name: communityName, description: communityDescription, is_private: false }); setShowCommunityForm(false); setCommunityName(''); setCommunityDescription(''); await load('communities'); }))}</Card>}{communities.map(value => <Card key={value.id}><Media uri={value.imageUrl} label={value.name} /><Label>{value.name}</Label><Label muted>{value.description}</Label><Label small>{value.membersCount} {t('members')}</Label>{button(t('community'), () => void run(async () => { setCommunity((await api<{ data: Community }>(`/communities/${value.id}`, locale)).data); await loadPosts(1, value.id); navigate('community'); }), true)}</Card>)}{!communities.length && <Empty label={t('empty')} />}{pager('communities')}</>;
    else if (target === 'community') view = community ? <><Card><Media uri={community.imageUrl} label={community.name} /><Label>{community.name}</Label><Label muted>{community.description}</Label><Label small>{community.membersCount} {t('members')}</Label>{community.membershipStatus === 'pending' && <Label>{t('pending')}</Label>}{!community.isOwner && button(community.isMember ? t('leave') : t('join'), () => void run(async () => { await api(`/communities/${community.id}/${community.isMember ? 'leave' : 'join'}`, locale, community.isMember ? 'DELETE' : 'POST'); setCommunity((await api<{ data: Community }>(`/communities/${community.id}`, locale)).data); }), true)}{(community.isMember || community.isOwner) && button(t('publish'), () => { setNewStory(false); setEditing(null); navigate('create-post'); })}</Card>{posts.map(value => postCard(value))}{pager('community')}</> : <Empty label={t('empty')} />;
    else if (target === 'marketplace' || target === 'favorites') view = <>{target === 'marketplace' && <Card>{button(t('discover'), () => navigate('discover'))}{button(t('services'), () => navigate('services'), true)}{flags.animal_listings_public && button(t('animals'), () => void web('/marketplace/animals'), true)}</Card>}{products.map(value => { const item = value.item || value; if ('item' in value && !value.item) return null; return <Card key={value.id}><Media uri={item.imageUrl} label={item.name || item.title} /><Label>{item.name || item.title}</Label><Label muted>{item.description}</Label><Label small>{item.location}{item.price !== undefined ? ` · ${item.price} MAD` : ''}</Label>{button(t('favorites'), () => void run(async () => { const type = value.type || 'products'; const saved = target === 'favorites' || item.isFavorited; await api(saved ? `/favorites/${type}/${item.id}` : '/favorites', locale, saved ? 'DELETE' : 'POST', saved ? undefined : { type, id: item.id }); await load(target, page); }), true)}{button(t('viewWeb'), () => void web(`/marketplace/${value.type || 'products'}/${item.id}`), true)}</Card>; })}{!products.length && <Empty label={t('empty')} />}{pager(target)}</>;
    else if (target === 'notifications') view = <>{button(t('markRead'), () => void run(async () => { await api('/notifications/read-all', locale, 'POST'); await load('notifications'); }), true)}{notifications.map(value => <Card key={value.id}><Label>{value.title || value.message || value.body}</Label>{value.title && value.body && <Label muted>{value.body}</Label>}<Label small muted>{value.createdAt && new Date(value.createdAt).toLocaleString(locale)}</Label>{!value.isRead && button(t('markRead'), () => void run(async () => { await api(`/notifications/${value.id}/read`, locale, 'POST'); await load('notifications'); }), true)}</Card>)}{!notifications.length && <Empty label={t('empty')} />}{pager('notifications')}</>;
    return <>{target !== 'feed' && !!error && <Card><Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 16 }}>{error}</Text>{button(t('retry'), () => void run(() => load(target)), true)}</Card>}{target !== 'feed' && busy && <Loading label={t('loading')} />}{story && <Modal visible animationType="fade" onRequestClose={() => setStory(null)}><EdgeSwipeBack onBack={() => setStory(null)}><SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}><View style={{ flexDirection: 'row', alignItems: 'center' }}><Label>{t('stories')}</Label></View><ScrollView contentContainerStyle={{ padding: 16 }}><Label>{story.content}</Label><Media locale={locale} uri={story.mediaUrl} kind={story.mediaKind} fallback={t('mediaFailed')} /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{storyIndex > 0 && <BackButton rtl={locale === 'ar'} label={t('previous')} onPress={() => void changeStory(storyIndex - 1)} />}{storyIndex < storyPlaylist.length - 1 && <BackButton rtl={locale !== 'ar'} label={t('next')} onPress={() => void changeStory(storyIndex + 1)} />}</View>{story.isOwn && button(t('delete'), () => void run(async () => { await api(`/stories/${story.id}`, locale, 'DELETE'); setStory(null); setStoryGroups((await api<Collection<StoryGroup>>('/stories', locale)).data); }), true)}</ScrollView></SafeAreaView></EdgeSwipeBack></Modal>}{reactionPost && <Modal transparent animationType="fade" onRequestClose={() => setReactionPost(null)}><Pressable accessibilityRole="button" accessibilityLabel={t('close')} onPress={() => setReactionPost(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}><Card><View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>{(['like', 'love', 'happy', 'wow'] as const).map((reaction, index) => <Pressable key={reaction} accessibilityRole="button" accessibilityLabel={t(reaction)} onPress={() => { void react(reactionPost, reaction); setReactionPost(null); }} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 24 }}>{['👍', '❤️', '😊', '😮'][index]}</Text></Pressable>)}</View></Card></Pressable></Modal>}{reportPost !== null && <Modal transparent animationType="slide" onRequestClose={() => { if (!busy) setReportPost(null); }}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}><SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.page, maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}><Card><Label>{t('reportReason')}</Label>{(['offensive_content', 'scam', 'animal_welfare', 'other'] as const).map(reason => button(`${t(`reason_${reason}`)}${reportReason === reason ? ' ✓' : ''}`, () => setReportReason(reason), true))}<Input label={t('reportDetails')} value={reportDetails} onChangeText={setReportDetails} multiline />{!!error && <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text>}{button(t('report'), () => void run(async () => { await api('/reports', locale, 'POST', { reportable_type: 'post', reportable_id: reportPost, reason: reportReason, details: reportDetails }); setReportPost(null); setReportSent(true); }))}{button(t('close'), () => setReportPost(null), true)}</Card></ScrollView></SafeAreaView></View></Modal>}{reportSent && <Card><Label>{t('reportSent')}</Label></Card>}{view}</>;
  }
  function latestReelPost(post: Post) { return selectedPost?.id === post.id ? selectedPost : posts.find(value => value.id === post.id) || post; }
  function reelComments(post: Post) { return postCard(selectedPost?.id === post.id ? selectedPost : post, true, true); }
  const selectOwnProfile = () => { setOwnProfileSelected(true); profileId.current = user?.id || null; };
  const preparePost = () => { setCommunity(null); setEditing(null); setNewStory(false); setContent(''); setAsset(null); };
  return { isOwnProfile: ownProfileSelected, prepareReelComments: setSelectedPost, latestReelPost, getReelsSnapshot, saveReelsSnapshot, openProfile, reelComments, load, render, flags, reset, clearError, selectOwnProfile, preparePost, openWeb: web };
}
