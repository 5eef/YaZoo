export function safeAuthDestination(value) {
  if (typeof value !== 'string' || /[\\\s%]/u.test(value.split('?')[0]) || [...value].some((character) => character.charCodeAt(0) < 32)) return '/feed'
  if (!/^\/(?:discover\/veterinarians\/\d+|veterinarian-appointments|messages|profile(?:\/\d+)?|feed|marketplace(?:\/(?:animals|products|services|veterinarians)(?:\/\d+)?)?|favorites|notifications|reservations(?:\/\d+\/invoice)?|orders\/history|communities(?:\/\d+)?|search|settings(?:\/(?:privacy|professional-verification))?)(?:[?#]|$)/u.test(value)) return '/feed'
  return value
}

export const loginFor = (destination) => `/login?returnTo=${encodeURIComponent(safeAuthDestination(destination))}`
