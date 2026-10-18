// Responses belong to the account that issued the request, including 401s.
let epoch = 0
export const getSessionEpoch = () => epoch
export const invalidateSessionRequests = () => { epoch += 1 }
