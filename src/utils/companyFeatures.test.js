import { describe, expect, it } from 'vitest'

import {
  isAnyMapExperienceEnabled,
  isCustomerGeolocationEnabled,
  isTerrainTrackingEnabled,
} from './companyFeatures'

describe('company feature helpers', () => {
  it('detects individual map feature flags', () => {
    const user = {
      company: {
        features: {
          customer_geolocation_enabled: true,
          terrain_tracking_enabled: false,
        },
      },
    }

    expect(isCustomerGeolocationEnabled(user)).toBe(true)
    expect(isTerrainTrackingEnabled(user)).toBe(false)
    expect(isAnyMapExperienceEnabled(user)).toBe(true)
  })

  it('returns false when the company feature bag is missing', () => {
    expect(isCustomerGeolocationEnabled(null)).toBe(false)
    expect(isTerrainTrackingEnabled({})).toBe(false)
    expect(isAnyMapExperienceEnabled({ company: {} })).toBe(false)
  })
})
