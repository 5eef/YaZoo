import PropTypes from 'prop-types'

import DesktopMessagesDock from '../messages/DesktopMessagesDock'
import DesktopMarketplacePublishButton from './DesktopMarketplacePublishButton'

function DesktopFloatingActions({
  activeConversation,
  conversations,
  conversationError,
  isConversationLoading,
  isLoading,
  isMessagesOpen,
  isRtl,
  marketplacePublishing,
  onBackFromConversation,
  onOpenConversation,
  onSendMessage,
  onToggleMessages,
  refObject,
  t,
  unreadCount,
}) {
  return (
    <div
      data-testid="desktop-floating-actions"
      className="fixed bottom-6 right-6 z-40 hidden items-end gap-3 xl:flex"
      dir="ltr"
    >
      <DesktopMessagesDock
        activeConversation={activeConversation}
        conversations={conversations}
        conversationError={conversationError}
        isConversationLoading={isConversationLoading}
        isLoading={isLoading}
        isOpen={isMessagesOpen}
        isRtl={isRtl}
        onBack={onBackFromConversation}
        onOpenConversation={onOpenConversation}
        onSendMessage={onSendMessage}
        onToggle={onToggleMessages}
        refObject={refObject}
        t={t}
        unreadCount={unreadCount}
      />
      <DesktopMarketplacePublishButton
        capability={marketplacePublishing}
        t={t}
      />
    </div>
  )
}

DesktopFloatingActions.propTypes = {
  activeConversation: PropTypes.object,
  conversations: PropTypes.array,
  conversationError: PropTypes.string,
  isConversationLoading: PropTypes.bool,
  isLoading: PropTypes.bool,
  isMessagesOpen: PropTypes.bool,
  isRtl: PropTypes.bool,
  marketplacePublishing: PropTypes.object,
  onBackFromConversation: PropTypes.func.isRequired,
  onOpenConversation: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onToggleMessages: PropTypes.func.isRequired,
  refObject: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
  t: PropTypes.func.isRequired,
  unreadCount: PropTypes.number,
}

export default DesktopFloatingActions
