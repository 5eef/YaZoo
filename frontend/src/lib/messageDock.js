export const OPEN_MESSAGE_DOCK_EVENT = 'yazoo:open-message-dock'

export function openMessageDock(conversation) {
  if (!conversation?.id) {
    return
  }

  globalThis.dispatchEvent?.(
    new CustomEvent(OPEN_MESSAGE_DOCK_EVENT, {
      detail: { conversation },
    }),
  )
}
