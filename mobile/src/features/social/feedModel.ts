import type { Post, StoryGroup, Person } from './types';
import type { Vet } from '../types';
export const TOP_THRESHOLD = 600;
export function storyRail(groups: StoryGroup[], user: Person) {
  const own = groups.find(group => group.isOwn || group.user.id === user.id);
  return [own || { id: `own-${user.id}`, isOwn: true, user, stories: [], hasUnviewed: false }, ...groups.filter(group => group !== own)];
}
export type FeedRow = { key: string; kind: 'post'; post: Post } | { key: string; kind: 'vets' | 'services' | 'offers' };
export function feedRows(posts: Post[], available: ('vets' | 'services' | 'offers')[]): FeedRow[] {
  const rows: FeedRow[] = [];
  let block = 0;
  posts.forEach((post, index) => { rows.push({ key: `post-${post.id}`, kind: 'post', post }); if ((index + 1) % 2 === 0 && block < available.length) { const kind = available[block++]; rows.push({ key: kind, kind }); } });
  while (block < available.length) { const kind = available[block++]; rows.push({ key: kind, kind }); }
  return rows;
}
export const searchCategories = ['veterinarians', 'services', 'products', 'posts', 'users', 'communities'] as const;
export type SearchResult = Vet & { author?: { id: number }; avatarUrl?: string; price?: number | null; url?: string };
export type SearchResults = Partial<Record<typeof searchCategories[number], SearchResult[]>>;
export function searchSections(results: SearchResults, marketplace: boolean) { return searchCategories.filter(key => key !== 'products' || marketplace).flatMap(key => results[key]?.length ? [{ key, data: results[key]! }] : []); }
export function mergeProfessionals(results: SearchResult[], specialties: Vet[], known: Vet[] = []) {
  const unique = new Map<number, SearchResult>();
  [...results, ...specialties].forEach(item => unique.set(item.id, { ...unique.get(item.id), ...known.find(vet => vet.id === item.id), ...item }));
  return [...unique.values()].sort((a, b) => Number(!!b.owner?.isProfessionalVerified) - Number(!!a.owner?.isProfessionalVerified));
}
