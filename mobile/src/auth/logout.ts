// Start revocation with the current Bearer, then immediately detach private UI
// and API state. A cold backend must never keep the local user signed in.
export async function endSession(revoke: () => Promise<unknown>, clear: () => Promise<void>, invalidate: () => void) {
  // The executor starts immediately and converts synchronous failures to rejection.
  const remote = new Promise<unknown>(resolve => resolve(revoke())).then(() => true, () => false);
  invalidate();
  const local = clear().then(() => true, () => false);
  const [remoteRevoked, localCleared] = await Promise.all([remote, local]);
  return { remoteRevoked, localCleared };
}
