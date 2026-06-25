import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, setRuntimeLocale, translate } from '../i18n/locales'
import {
  notificationChanges,
  resolveNotificationConfig,
  shouldRefreshNotificationsForEvent,
} from './notificationActivity'

describe('notificationActivity', () => {
  beforeEach(() => {
    setRuntimeLocale('fr-TN')
  })

  afterEach(() => {
    setRuntimeLocale(DEFAULT_LOCALE)
  })

  it('refreshes for actionable live events but skips noisy session heartbeats', () => {
    expect(shouldRefreshNotificationsForEvent('session.ping')).toBe(false)
    expect(shouldRefreshNotificationsForEvent('session.reported')).toBe(false)
    expect(shouldRefreshNotificationsForEvent('session.offline')).toBe(true)
    expect(shouldRefreshNotificationsForEvent('inventory.adjusted')).toBe(true)
    expect(shouldRefreshNotificationsForEvent('unknown.event')).toBe(false)
  })

  it('resolves ops activity config from the event kind and honors payload routes', () => {
    const notification = {
      type: 'OpsActivityNotification',
      data: {
        kind: 'route.session.opened',
        route: '/route-sessions/42',
      },
    }

    expect(resolveNotificationConfig(notification)).toMatchObject({
      icon: 'fa-solid fa-truck-fast',
      color: '#0d9488',
      route: '/route-sessions/42',
      label: translate('fr-TN', 'activity.kinds.routeSessionOpened'),
    })
  })

  it('formats explicit and stock-item notification changes with stable trimming', () => {
    expect(notificationChanges({
      data: {
        changes: [' Produit: Eau -> Jus ', '', '   ', 'Prix: 3 -> 4'],
      },
    }, 3)).toEqual([
      'Produit: Eau -> Jus',
      'Prix: 3 -> 4',
    ])

    const stockChanges = notificationChanges({
      data: {
        items: [
          { product_name: 'Eau plate', qty: 2, min_stock: 5 },
        ],
      },
    }, 1)

    expect(stockChanges).toHaveLength(1)
    expect(stockChanges[0]).toContain('Eau plate')
    expect(stockChanges[0]).toContain(translate('fr-TN', 'activity.defaultDepot'))
  })
})
