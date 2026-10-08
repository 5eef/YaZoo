import type { Post } from './types';
import type { Collection } from '../types';

export const REELS_SCAN_LIMIT = 5;
export async function nextReelsBatch(page: number, fetchPage: (page: number) => Promise<Collection<Post>>, active: () => boolean = () => true) {
  let posts: Post[] = [], hasMore = true, scanned = 0;
  while (active() && hasMore && posts.length < 3 && scanned < REELS_SCAN_LIMIT) {
    const next = page + 1;
    const response = await fetchPage(next);
    if (!active()) break;
    page = next;
    scanned++;
    hasMore = page < (response.meta?.last_page || page);
    posts = mergeReels(posts, response.data);
  }
  return { posts, page, hasMore, scanned };
}

export function videoPosts(posts: Post[]) {
  return posts.filter(post => post.mediaKind === 'video' && !!post.mediaUrl);
}
export function mergeReels(current: Post[], incoming: Post[]) {
  const merged = new Map(current.map(post => [post.id, post]));
  for (const post of incoming) {
    if (post.mediaKind === 'video' && post.mediaUrl) merged.set(post.id, post);
    else merged.delete(post.id);
  }
  return [...merged.values()];
}
export function canPlayReel(index: number, active: number, foreground: boolean, focused: boolean, comments: boolean) {
  return index === active && foreground && focused && !comments;
}
export function publicPostLink(origin: string, id: number) {
  try {
    const url = new URL(origin);
    if (!['https:', 'http:'].includes(url.protocol) || /^(localhost|127\.|10\.|192\.168\.|0\.|\[?::1)/.test(url.hostname) || url.username || url.password) return undefined;
    return `${url.origin}/feed?post=${id}`;
  } catch { return undefined; }
}
