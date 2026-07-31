import api from './client'

export function getConversationsRequest() {
  return api.get('/conversations')
}

export function getUnreadMessagesCountRequest() {
  return api.get('/messages/unread-count')
}

export function createDirectConversationRequest(payload) {
  return api.post('/conversations/direct', payload)
}

export function getConversationRequest(conversationId) {
  return api.get(`/conversations/${conversationId}`)
}

export function markConversationReadRequest(conversationId) {
  return api.patch(`/conversations/${conversationId}/read`)
}

export function createMessageRequest(conversationId, payload) {
  return api.post(`/conversations/${conversationId}/messages`, payload)
}
