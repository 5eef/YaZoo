import { describe, expect, it } from 'vitest'

import {
  appendUniqueMessage,
  filterMessageConversations,
  sortMessageConversations,
  upsertMessageConversation,
} from './messages'

describe('message collection utilities', () => {
  it('sorts and upserts conversations without duplicates', () => {
    const older = { id: 1, updatedAt: '2026-01-01T10:00:00Z' }
    const newer = { id: 2, updatedAt: '2026-01-02T10:00:00Z' }

    expect(sortMessageConversations([older, newer]).map(({ id }) => id)).toEqual([2, 1])
    expect(
      upsertMessageConversation([older, newer], {
        ...older,
        updatedAt: '2026-01-03T10:00:00Z',
      }).map(({ id }) => id),
    ).toEqual([1, 2])
  })

  it('deduplicates messages and filters accent-insensitively', () => {
    const message = { id: 7, body: 'Bonjour' }
    expect(appendUniqueMessage([message], message)).toEqual([message])
    expect(appendUniqueMessage([], message)).toEqual([message])

    const conversations = [
      { id: 1, participant: { name: 'Élodie' }, latestMessage: { body: 'Bonjour' } },
      { id: 2, participant: { name: 'Omar' }, latestMessage: { body: 'Salam' } },
    ]

    expect(filterMessageConversations(conversations, 'elodie').map(({ id }) => id)).toEqual([1])
    expect(filterMessageConversations(conversations, 'sal').map(({ id }) => id)).toEqual([2])
  })
})
