import { proxyRequest } from '../_shared/proxy.js'

export const onRequest = (context) => proxyRequest(context)
