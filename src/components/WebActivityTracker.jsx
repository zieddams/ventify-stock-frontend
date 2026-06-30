import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  getWebActivitySessionId,
  resolveWebActivityPath,
  resolveWebActivityTitle,
} from '../services/activityClient'

const HEARTBEAT_INTERVAL_MS = 60 * 1000

async function sendActivity(eventType) {
  const routePath = resolveWebActivityPath()

  await api.post('/activity/track', {
    event_type: eventType,
    event_name: eventType === 'heartbeat' ? 'heartbeat' : 'page-view',
    route_path: routePath,
    page_title: resolveWebActivityTitle(),
    channel: 'web',
    platform: 'web',
    client_session_id: getWebActivitySessionId(),
  })
}

export default function WebActivityTracker() {
  const { user } = useAuth()
  const location = useLocation()
  const routeSignature = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search],
  )
  const lastTrackedRouteRef = useRef('')

  useEffect(() => {
    if (!user?.id) {
      lastTrackedRouteRef.current = ''
      return undefined
    }

    if (lastTrackedRouteRef.current === routeSignature) {
      return undefined
    }

    lastTrackedRouteRef.current = routeSignature
    void sendActivity('navigation').catch(() => {})

    return undefined
  }, [routeSignature, user?.id])

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }

    const sendHeartbeat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      void sendActivity('heartbeat').catch(() => {})
    }

    const intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    const onFocus = () => sendHeartbeat()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [user?.id])

  return null
}
