import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router'

import { getMessageConversationDisplay, sortMessageConversations } from '../../utils/messages'
import AppIcon from '../ui/AppIcon'
import Avatar from '../ui/Avatar'

function DesktopMessagesDock({
  activeConversation,
  conversations,
  conversationError,
  isConversationLoading,
  isLoading,
  isOpen,
  isRtl = false,
  onBack,
  onOpenConversation,
  onSendMessage,
  onToggle,
  refObject,
  t,
  unreadCount,
}) {
  const closeButtonRef = useRef(null)
  const messagesEndRef = useRef(null)
  const triggerRef = useRef(null)
  const wasOpenRef = useRef(false)
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const safeConversations = sortMessageConversations(conversations)
  const recentAvatars = safeConversations
    .map((conversation) => ({
      ...getMessageConversationDisplay(conversation, t),
      conversationId: conversation.id,
    }))
    .filter((display) => display.avatar)
    .slice(0, 3)

  useEffect(() => {
    if (isOpen) {
      const focusTimerId = globalThis.setTimeout(() => closeButtonRef.current?.focus(), 0)
      wasOpenRef.current = true

      return () => globalThis.clearTimeout(focusTimerId)
    }

    if (wasOpenRef.current) {
      triggerRef.current?.focus()
      wasOpenRef.current = false
    }

    return undefined
  }, [isOpen])

  useEffect(() => {
    setDraft('')
    setSendError('')
  }, [activeConversation?.id])

  useEffect(() => {
    if (activeConversation?.id) {
      messagesEndRef.current?.scrollIntoView?.({ block: 'end' })
    }
  }, [activeConversation?.id, activeConversation?.messages])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const body = draft.trim()

    if (!body || !activeConversation?.id || isSending) {
      return
    }

    setIsSending(true)
    setSendError('')

    try {
      await onSendMessage(activeConversation.id, body)
      setDraft('')
    } catch {
      setSendError(t('messages.sendError'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      ref={refObject}
      className="relative"
      data-testid="desktop-messages-dock"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {isOpen ? (
        <section
          role="dialog"
          aria-modal="false"
          aria-label={t('messages.dropdown.title')}
          className="absolute bottom-[calc(100%+0.75rem)] right-0 flex max-h-[min(70vh,38rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white/96 text-start shadow-[0_30px_80px_rgba(35,13,68,0.24)] backdrop-blur-2xl dark:border-violet-300/16 dark:bg-[#150c23]/96"
        >
          {activeConversation || isConversationLoading ? (
            <ConversationPanel
              conversation={activeConversation}
              error={conversationError}
              isLoading={isConversationLoading}
              isSending={isSending}
              messagesEndRef={messagesEndRef}
              onBack={onBack}
              onClose={onToggle}
              onDraftChange={setDraft}
              onSubmit={handleSubmit}
              closeButtonRef={closeButtonRef}
              draft={draft}
              sendError={sendError}
              t={t}
            />
          ) : (
            <>
          <header className="flex items-center justify-between gap-3 border-b border-violet-100/70 px-4 py-4 dark:border-violet-300/14">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-stone-950 dark:text-violet-50">
                {t('messages.dropdown.title')}
              </h2>
              {unreadCount > 0 ? (
                <p className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-200" dir="ltr">
                  {t('messages.dropdown.unreadCount', { count: unreadCount })}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              ref={closeButtonRef}
              onClick={onToggle}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-800 transition hover:bg-violet-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 dark:border-violet-300/16 dark:bg-white/10 dark:text-violet-50 dark:hover:bg-white/14"
              aria-label={t('layout.menuClose')}
            >
              <AppIcon name="close" className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {isLoading ? <DockState>{t('common.loading')}</DockState> : null}
            {!isLoading && safeConversations.length === 0 ? (
              <DockState>{t('messages.dropdown.empty')}</DockState>
            ) : null}
            {!isLoading && safeConversations.length > 0 ? (
              <div className="space-y-1">
                {safeConversations.map((conversation) => {
                  const display = getMessageConversationDisplay(conversation, t)
                  const unreadConversationCount = conversation.unreadCount ?? 0

                  return (
                    <button
                      type="button"
                      key={conversation.id}
                      onClick={() => onOpenConversation(conversation)}
                      className={`flex w-full min-w-0 gap-3 rounded-[22px] px-3 py-3 text-start transition hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 dark:hover:bg-white/10 ${
                        unreadConversationCount > 0
                          ? 'bg-violet-50/70 dark:bg-violet-500/12'
                          : ''
                      }`}
                      aria-label={t('messages.dropdown.openConversation')}
                    >
                      <Avatar
                        name={display.name}
                        src={display.avatar}
                        className="h-11 w-11 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center justify-between gap-3">
                          <span className="truncate text-sm font-semibold text-stone-950 dark:text-violet-50">
                            {display.name}
                          </span>
                          {unreadConversationCount > 0 ? (
                            <span
                              className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-bold text-white"
                              dir="ltr"
                            >
                              {formatBadgeCount(unreadConversationCount)}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block break-words text-xs leading-5 text-stone-600 dark:text-violet-100/72">
                          {display.lastMessage}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-violet-700 dark:text-violet-200">
                          {display.updatedAt}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <footer className="border-t border-violet-100/70 p-3 dark:border-violet-300/14">
            <Link
              to="/messages"
              onClick={onToggle}
              className="block rounded-[18px] bg-[linear-gradient(135deg,#7c3aed,#a855f7,#c4b5fd)] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_12px_26px_rgba(124,58,237,0.2)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              {t('messages.dropdown.viewAll')}
            </Link>
          </footer>
            </>
          )}
        </section>
      ) : null}

      <button
        type="button"
        ref={triggerRef}
        onClick={onToggle}
        className="ms-auto flex min-h-12 items-center gap-3 rounded-full border border-white/65 bg-[linear-gradient(135deg,_rgba(255,255,255,0.92),_rgba(246,239,255,0.86))] px-4 py-2 text-stone-800 shadow-[0_20px_48px_rgba(76,29,149,0.18)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:border-violet-200 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 dark:border-violet-300/18 dark:bg-[linear-gradient(135deg,_rgba(24,16,38,0.96),_rgba(49,24,83,0.9))] dark:text-violet-50 dark:shadow-[0_24px_56px_rgba(0,0,0,0.36)]"
        aria-label={t('common.messages')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-800 dark:bg-violet-500/24 dark:text-violet-50">
          <AppIcon name="chat" className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span
              className="absolute -end-2 -top-2 min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white ring-2 ring-white dark:ring-[#160d24]"
              aria-label={t('messages.unreadAria', { count: unreadCount })}
              dir="ltr"
            >
              {formatBadgeCount(unreadCount)}
            </span>
          ) : null}
        </span>
        <span className="text-sm font-semibold">{t('common.messages')}</span>
        {recentAvatars.length > 0 ? (
          <span className="flex -space-x-2 rtl:space-x-reverse" aria-hidden="true">
            {recentAvatars.map((display, index) => (
              <Avatar
                key={display.conversationId ?? `${display.avatar}-${index}`}
                name={display.name}
                src={display.avatar}
                className="h-7 w-7 border-2 border-white text-[9px] dark:border-[#160d24]"
              />
            ))}
          </span>
        ) : null}
      </button>
    </div>
  )
}

function ConversationPanel({
  closeButtonRef,
  conversation,
  draft,
  error,
  isLoading,
  isSending,
  messagesEndRef,
  onBack,
  onClose,
  onDraftChange,
  onSubmit,
  sendError,
  t,
}) {
  const participant = conversation?.participant ?? {}
  const messages = Array.isArray(conversation?.messages) ? conversation.messages : []

  return (
    <>
      <header className="flex items-center gap-2 border-b border-violet-100/70 px-3 py-3 dark:border-violet-300/14">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-violet-800 transition hover:bg-violet-50 dark:text-violet-50 dark:hover:bg-white/10"
          aria-label={t('messages.dropdown.backToList')}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Avatar name={participant.name} src={participant.avatar} className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-stone-950 dark:text-violet-50">
            {participant.name || t('common.user')}
          </h2>
          <p className="truncate text-xs text-stone-500 dark:text-violet-100/65">
            {t('messages.openConversation')}
          </p>
        </div>
        <button
          type="button"
          ref={closeButtonRef}
          onClick={onClose}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-800 transition hover:bg-violet-100 dark:border-violet-300/16 dark:bg-white/10 dark:text-violet-50 dark:hover:bg-white/14"
          aria-label={t('layout.menuClose')}
        >
          <AppIcon name="close" className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-[16rem] flex-1 space-y-2 overflow-y-auto bg-violet-50/45 px-3 py-4 dark:bg-black/10">
        {isLoading ? <DockState>{t('common.loading')}</DockState> : null}
        {!isLoading && error ? (
          <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/12 dark:text-rose-100">
            {error}
          </p>
        ) : null}
        {!isLoading && !error && messages.length === 0 ? (
          <DockState>{t('messages.noMessageYet')}</DockState>
        ) : null}
        {!isLoading && !error ? messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isOwn ?? message.is_own ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[82%] rounded-[20px] px-3 py-2 text-sm leading-5 ${
              message.isOwn ?? message.is_own
                ? 'rounded-br-md bg-violet-600 text-white'
                : 'rounded-bl-md bg-white text-stone-800 shadow-sm dark:bg-white/10 dark:text-violet-50'
            }`}>
              <p className="break-words whitespace-pre-wrap">{message.body}</p>
              <time className={`mt-1 block text-[10px] ${message.isOwn ?? message.is_own ? 'text-violet-100' : 'text-stone-400 dark:text-violet-100/55'}`}>
                {formatMessageTime(message.createdAt ?? message.created_at)}
              </time>
            </div>
          </div>
        )) : null}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-violet-100/70 p-3 dark:border-violet-300/14">
        {sendError ? <p role="alert" className="mb-2 text-xs text-rose-600 dark:text-rose-200">{sendError}</p> : null}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={t('messages.writePlaceholder')}
            maxLength={2000}
            disabled={!conversation?.id || isLoading || isSending}
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-[18px] border border-violet-100 bg-violet-50/70 px-3 py-2.5 text-sm text-stone-800 outline-none transition focus:border-violet-400 dark:border-violet-300/16 dark:bg-white/10 dark:text-violet-50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !conversation?.id || isLoading || isSending}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-[18px] bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? t('common.sending') : t('messages.send')}
          </button>
        </div>
      </form>
    </>
  )
}

function formatMessageTime(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function DockState({ children }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-stone-500 dark:text-violet-100/70">
      {children}
    </div>
  )
}

function formatBadgeCount(count) {
  return count > 99 ? '99+' : String(count)
}

DesktopMessagesDock.propTypes = {
  activeConversation: PropTypes.object,
  conversations: PropTypes.array,
  conversationError: PropTypes.string,
  isConversationLoading: PropTypes.bool,
  isLoading: PropTypes.bool,
  isOpen: PropTypes.bool,
  isRtl: PropTypes.bool,
  onBack: PropTypes.func.isRequired,
  onOpenConversation: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  refObject: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  t: PropTypes.func.isRequired,
  unreadCount: PropTypes.number,
}

ConversationPanel.propTypes = {
  closeButtonRef: PropTypes.object,
  conversation: PropTypes.object,
  draft: PropTypes.string.isRequired,
  error: PropTypes.string,
  isLoading: PropTypes.bool,
  isSending: PropTypes.bool,
  messagesEndRef: PropTypes.object,
  onBack: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  sendError: PropTypes.string,
  t: PropTypes.func.isRequired,
}

DockState.propTypes = {
  children: PropTypes.node,
}

export default DesktopMessagesDock
