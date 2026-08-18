import { asArray } from './apiData'
import { formatCurrency } from './formatDate'

export function buildStoryRowItems(storyGroups, user, t) {
  const safeStoryGroups = asArray(storyGroups)
  const ownGroup = safeStoryGroups.find((group) => group.isOwn)
  const otherGroups = safeStoryGroups.filter((group) => !group.isOwn)

  const normalizedOwnGroup = ownGroup ?? {
    id: `own-story-${user?.id ?? 'guest'}`,
    isOwn: true,
    hasUnviewed: false,
    user: user
      ? {
          id: user.id,
          name: user.name,
          avatar: user.avatar ?? '',
          city: user.city ?? '',
          country: user.country ?? '',
        }
      : null,
    stories: [],
    isComposerShortcut: true,
  }

  return [
    {
      ...normalizedOwnGroup,
      title: t('story.yourStory'),
      caption:
        (normalizedOwnGroup.stories?.length ?? 0) > 0
          ? t('story.activeCount', { count: normalizedOwnGroup.stories.length })
          : t('post.share'),
    },
    ...otherGroups.map((group) => ({
      ...group,
      title: group.user?.name ?? t('common.story'),
      caption: getStoryGroupCaption(group, t),
    })),
  ]
}

export function getStoryViewerKey(activeStoryIndex, viewerStories) {
  if (activeStoryIndex === null) {
    return 'story-viewer-closed'
  }

  return viewerStories[activeStoryIndex]?.id ?? 'story-viewer-open'
}

export function getStoryRingClass(storyGroup) {
  if (storyGroup.isOwn) {
    return 'bg-[linear-gradient(135deg,#7c3aed,#a855f7,#ddd6fe)]'
  }

  if (storyGroup.hasUnviewed) {
    return 'bg-[linear-gradient(135deg,#7c3aed,#9333ea,#f0abfc)]'
  }

  return 'bg-violet-100'
}

export function getStoryGroupCaption(group, t) {
  if (group.hasUnviewed) {
    return t('story.new')
  }

  const storyCount = group.stories?.length ?? 0

  return t('story.count', { count: storyCount })
}

export function mapStoryGroupForViewer(group, t) {
  const title = group.isOwn ? t('story.yourStory') : group.user?.name ?? t('common.story')

  return {
    id: group.id,
    title,
    caption: group.isOwn
      ? t('story.publishedByYou')
      : t('story.byUser', { name: group.user?.name ?? 'YaZoo' }),
    slides: (group.stories ?? []).map((story) => ({
      id: story.id,
      title: story.content ? truncateText(story.content, 72) : title,
      body:
        story.content ||
        t('story.defaultBody'),
      authorName: group.user?.name ?? 'YaZoo',
      authorAvatar: group.user?.avatar ?? '',
      location: story.location ?? '',
      createdAt: story.createdAt ?? '',
      mediaUrl: story.mediaUrl ?? '',
      mediaKind: story.mediaKind ?? '',
      surfaceClass:
        story.mediaKind === 'video'
          ? 'bg-[linear-gradient(180deg,#581c87,#7c3aed,#d8b4fe)]'
          : 'bg-[linear-gradient(180deg,#6d28d9,#8b5cf6,#ddd6fe)]',
      tags: [],
      isOwn: story.isOwn,
      isViewed: story.isViewed,
      viewsCount: story.viewsCount ?? 0,
      viewers: story.viewers ?? [],
    })),
  }
}

export function updateStoryInGroups(groups, nextStory) {
  return groups.map((group) => {
    const updatedStories = (group.stories ?? []).map((story) =>
      story.id === nextStory.id ? nextStory : story,
    )

    return {
      ...group,
      hasUnviewed: group.isOwn ? false : updatedStories.some((story) => !story.isViewed),
      stories: updatedStories,
    }
  })
}

export function truncateText(text, maxLength) {
  if (!text) {
    return ''
  }

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

export function getStoryInitials(name) {
  if (!name) return 'YZ'

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function buildMarketplaceHighlights(animals, products, userId, options = {}) {
  const onlyOwn = options.onlyOwn ?? true
  const ownAnimals = asArray(animals)
    .filter((animal) => onlyOwn ? String(animal.author?.id) === String(userId) || animal.isOwner : !animal.isOwner)
    .map((animal) => ({
      id: animal.id,
      kind: 'animal',
      title: animal.name,
      priceLabel: animal.isForAdoption ? options.t?.('animals.adoption') ?? 'Adoption' : formatCurrency(animal.price),
      location: animal.location,
      createdAt: animal.createdAt,
      href: `/marketplace/animals/${animal.id}`,
    }))

  const ownProducts = asArray(products)
    .filter((product) => onlyOwn ? String(product.author?.id) === String(userId) || product.isOwner : !product.isOwner)
    .map((product) => ({
      id: product.id,
      kind: 'product',
      title: product.name,
      priceLabel: formatCurrency(product.price),
      location: product.location,
      createdAt: product.createdAt,
      href: `/marketplace/products/${product.id}`,
    }))

  return [...ownAnimals, ...ownProducts]
    .sort((first, second) => new Date(second.createdAt ?? 0) - new Date(first.createdAt ?? 0))
    .slice(0, 3)
}

export function buildOrganicFeedItems(posts, suggestions) {
  const feedItems = []
  const organicSuggestions = [
    ...asArray(suggestions.marketplace).map((listing) => ({
      type: 'marketplace',
      key: `organic-marketplace-${listing.kind}-${listing.id}`,
      listing,
    })),
    ...asArray(suggestions.services).map((service) => ({
      type: 'service',
      key: `organic-service-${service.id}`,
      service,
    })),
    ...asArray(suggestions.communities).map((community) => ({
      type: 'community',
      key: `organic-community-${community.id}`,
      community,
    })),
  ]

  asArray(posts).forEach((post, index) => {
    feedItems.push({ type: 'post', key: `post-${post.id}`, post })

    if ((index + 1) % 2 === 0) {
      const suggestion = organicSuggestions.shift()

      if (suggestion) {
        feedItems.push(suggestion)
      }
    }
  })

  if (feedItems.length === 0) {
    return organicSuggestions.slice(0, 3)
  }

  // A short feed must still surface one YaZoo Market publication. Without
  // this tail insertion, a feed containing a single post showed no organic
  // recommendation at all.
  if (!feedItems.some((item) => item.type !== 'post') && organicSuggestions.length > 0) {
    feedItems.push(organicSuggestions.shift())
  }

  return feedItems
}
