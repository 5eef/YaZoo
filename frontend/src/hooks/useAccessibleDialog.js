import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useAccessibleDialog(isOpen, onClose, initialFocusRef) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const focusTimerId = globalThis.setTimeout(() => {
      const firstFocusable = dialog?.querySelector(FOCUSABLE_SELECTOR)
      ;(initialFocusRef?.current ?? firstFocusable)?.focus()
    }, 0)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      globalThis.clearTimeout(focusTimerId)
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [initialFocusRef, isOpen, onClose])

  return dialogRef
}
