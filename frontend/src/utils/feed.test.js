import { describe, expect, it, vi } from 'vitest'

import {
  buildMarketplaceHighlights,
  buildOrganicFeedItems,
  buildStoryRowItems,
  getStoryViewerKey,
  mapStoryGroupForViewer,
  updateStoryInGroups,
} from './feed'

const t = (key, values = {}) => `${key}:${values.count ?? values.name ?? ''}`

describe('feed utilities', () => {
  it('builds the story shortcut and preserves other groups', () => {
    const rows = buildStoryRowItems(
      [{ id: 'other', user: { name: 'Amina' }, stories: [], hasUnviewed: false }],
      { id: 7, name: 'Owner' },
      t,
    )

    expect(rows[0]).toMatchObject({ id: 'own-story-7', isOwn: true, isComposerShortcut: true })
    expect(rows[1]).toMatchObject({ id: 'other', title: 'Amina', caption: 'story.count:0' })
    expect(getStoryViewerKey(null, rows)).toBe('story-viewer-closed')
  })

  it('maps and updates story view state without mutating the original group', () => {
    const group = {
      id: 1,
      isOwn: false,
      user: { name: 'Amina' },
      stories: [{ id: 2, content: 'Story content', isViewed: false }],
    }
    const viewerGroup = mapStoryGroupForViewer(group, t)
    const updated = updateStoryInGroups([group], { ...group.stories[0], isViewed: true })

    expect(viewerGroup.slides[0]).toMatchObject({ id: 2, title: 'Story content' })
    expect(updated[0].hasUnviewed).toBe(false)
    expect(group.stories[0].isViewed).toBe(false)
  })

  it('filters, sorts and limits marketplace highlights', () => {
    const translate = vi.fn(() => 'Adoption')
    const highlights = buildMarketplaceHighlights(
      [
        { id: 1, name: 'Own', isOwner: true, isForAdoption: true, createdAt: '2026-01-01' },
        { id: 2, name: 'Other', isOwner: false, createdAt: '2026-02-01' },
      ],
      [],
      9,
      { onlyOwn: false, t: translate },
    )

    expect(highlights).toHaveLength(1)
    expect(highlights[0]).toMatchObject({ id: 2, kind: 'animal' })
  })

  it('interleaves one organic suggestion after every two posts', () => {
    const items = buildOrganicFeedItems(
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      { services: [{ id: 8 }], communities: [], marketplace: [] },
    )

    expect(items.map((item) => item.type)).toEqual(['post', 'post', 'service', 'post'])
  })

  it('prioritizes a YaZoo Market publication in a short feed', () => {
    const items = buildOrganicFeedItems(
      [{ id: 1 }],
      {
        services: [{ id: 8 }],
        communities: [{ id: 9 }],
        marketplace: [{ id: 10, kind: 'product' }],
      },
    )

    expect(items.map((item) => item.type)).toEqual(['post', 'marketplace'])
    expect(items[1].listing).toMatchObject({ id: 10, kind: 'product' })
  })
})
