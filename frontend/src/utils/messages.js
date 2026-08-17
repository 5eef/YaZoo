import { asArray } from './apiData'
import { formatDate } from './formatDate'

export function sortMessageConversations(items) {
  return [...asArray(items)].sort(
    (firstConversation, secondConversation) =>
      new Date(secondConversation.updatedAt ?? secondConversation.updated_at ?? 0).getTime() -
      new Date(firstConversation.updatedAt ?? firstConversation.updated_at ?? 0).getTime(),
  )
}

export function upsertMessageConversation(currentConversations, nextConversation) {
  if (!nextConversation?.id) {
    return sortMessageConversations(currentConversations)
  }

  const remainingConversations = asArray(currentConversations).filter(
    (conversation) => conversation.id !== nextConversation.id,
  )

  return sortMessageConversations([nextConversation, ...remainingConversations])
}

export function appendUniqueMessage(messages, nextMessage) {
  const safeMessages = asArray(messages)

  if (!nextMessage?.id || safeMessages.some((message) => message.id === nextMessage.id)) {
    return safeMessages
  }

  return [...safeMessages, nextMessage]
}

export function filterMessageConversations(conversations, searchTerm) {
  const safeConversations = asArray(conversations)

  if (!searchTerm) {
    return safeConversations
  }

  const normalizedSearch = normalizeSearchText(searchTerm)

  return safeConversations.filter((conversation) =>
    [
      conversation.participant?.name,
      conversation.participant?.email,
      conversation.latestMessage?.body,
      conversation.updatedAt,
    ].some((value) => normalizeSearchText(value).includes(normalizedSearch)),
  )
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getMessageConversationDisplay(conversation, t) {
  const participant = conversation.participant ?? {}
  const participantName = participant.name ?? participant.username ?? t('common.user')
  const lastMessage =
    conversation.latestMessage?.body ??
    conversation.latest_message?.body ??
    conversation.last_message ??
    t('messages.readyToStart')
  const updatedAt =
    conversation.updatedAt ??
    conversation.updated_at ??
    conversation.latestMessage?.createdAt ??
    conversation.latest_message?.created_at

  return {
    avatar: participant.avatar ?? participant.avatarUrl ?? participant.avatar_url ?? '',
    lastMessage,
    name: participantName,
    updatedAt: updatedAt ? formatDate(updatedAt) : t('messages.dropdown.lastMessage'),
  }
}
