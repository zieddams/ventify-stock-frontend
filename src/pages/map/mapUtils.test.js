import { describe, expect, it } from 'vitest'

import {
  getMapPoint,
  normalizeMapSettings,
  resolveProviderConfig,
} from './mapUtils'

describe('mapUtils', () => {
  it('normalizes map settings from the API catalog payload', () => {
    const settings = normalizeMapSettings([
      { key: 'map.provider', value: 'custom' },
      { key: 'map.custom_tile_url', value: 'https://tiles.example.com/{z}/{x}/{y}.png' },
      { key: 'map.custom_tile_attribution', value: 'Tiles Example' },
      { key: 'map.google_map_type', value: 'hybrid' },
    ])

    expect(settings).toEqual({
      provider: 'custom',
      googleMapsApiKey: '',
      googleMapType: 'hybrid',
      googleMapId: '',
      customTileUrl: 'https://tiles.example.com/{z}/{x}/{y}.png',
      customTileAttribution: 'Tiles Example',
    })
  })

  it('resolves custom and fallback provider configurations correctly', () => {
    expect(resolveProviderConfig({
      provider: 'esri_world_hybrid',
    })).toMatchObject({
      provider: 'esri_world_hybrid',
      tone: 'satellite',
      warningKey: '',
    })
    expect(resolveProviderConfig({
      provider: 'esri_world_hybrid',
    }).layers).toHaveLength(3)

    expect(resolveProviderConfig({
      provider: 'custom',
      customTileUrl: 'https://tiles.example.com/{z}/{x}/{y}.png',
      customTileAttribution: 'Tiles Example',
    })).toMatchObject({
      provider: 'custom',
      url: 'https://tiles.example.com/{z}/{x}/{y}.png',
      attribution: 'Tiles Example',
      warningKey: '',
    })

    expect(resolveProviderConfig({
      provider: 'google_satellite',
      googleMapsApiKey: '',
    })).toMatchObject({
      provider: 'openstreetmap',
      warningKey: 'googleMissingKey',
    })
  })

  it('accepts valid global coordinates and rejects invalid ones', () => {
    expect(getMapPoint(48.8566, 2.3522)).toEqual([48.8566, 2.3522])
    expect(getMapPoint(-33.8688, 151.2093)).toEqual([-33.8688, 151.2093])
    expect(getMapPoint(91, 10)).toBeNull()
    expect(getMapPoint(10, -181)).toBeNull()
    expect(getMapPoint('abc', 10)).toBeNull()
  })
})
