export function formatBadgeCount(count) {
  return count > 99 ? '99+' : String(count)
}
