import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echoInstance = null

function resolveConfig() {
  if (typeof window === 'undefined') {
    return null
  }

  const appKey = import.meta.env.VITE_REVERB_APP_KEY
    || (window.location.hostname === 'irtiwaa.ziedtech.com' ? '78dp9ud63xntwmvmjybc' : null)

  if (!appKey) {
    return null
  }

  const scheme = import.meta.env.VITE_REVERB_SCHEME || window.location.protocol.replace(':', '')
  const secure = scheme === 'https'
  const port = Number(import.meta.env.VITE_REVERB_PORT || (secure ? 443 : 80))

  return {
    appKey,
    host: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    port,
    secure,
    authEndpoint: `${import.meta.env.VITE_REVERB_AUTH_URL || ''}/api/broadcasting/auth`,
  }
}

export function getEcho() {
  if (echoInstance) {
    return echoInstance
  }

  const token = localStorage.getItem('ventify_token')
  const config = resolveConfig()

  if (!token || !config) {
    return null
  }

  window.Pusher = Pusher

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: config.appKey,
    wsHost: config.host,
    wsPort: config.port,
    wssPort: config.port,
    forceTLS: config.secure,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: config.authEndpoint,
    auth: {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  })

  return echoInstance
}

export function subscribeToOpsMonitor(callback) {
  const echo = getEcho()
  if (!echo) {
    return () => {}
  }

  const channel = echo.private('ops-monitor')
  channel.listen('.ops.monitor.updated', callback)

  return () => {
    channel.stopListening('.ops.monitor.updated', callback)
  }
}

export function closeEcho() {
  if (!echoInstance) {
    return
  }

  echoInstance.disconnect()
  echoInstance = null
}
