export const DEFAULT_CENTER = [34.2, 9.6]
export const DEFAULT_ZOOM = 6
export const DEFAULT_MIN_ZOOM = 2

export const MAP_PROVIDER_CONFIG = {
  openstreetmap: {
    tone: 'light',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    options: { subdomains: ['a', 'b', 'c'] },
  },
  carto_light: {
    tone: 'light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    options: { subdomains: ['a', 'b', 'c', 'd'] },
  },
  open_topo_map: {
    tone: 'topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
    options: { subdomains: ['a', 'b', 'c'] },
  },
  esri_world_imagery: {
    tone: 'satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    options: {},
  },
  esri_world_hybrid: {
    tone: 'satellite',
    layers: [
      {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Imagery &copy; Esri',
        options: {},
      },
      {
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Transportation &copy; Esri',
        options: { opacity: 0.92 },
      },
      {
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Boundaries & Places &copy; Esri',
        options: { opacity: 0.96 },
      },
    ],
  },
}

export const GOOGLE_MAP_PROVIDERS = new Set(['google_roadmap', 'google_satellite'])
export const GOOGLE_MAP_TYPES = new Set(['roadmap', 'satellite', 'terrain', 'hybrid'])

function readSettingEntries(settings = []) {
  if (Array.isArray(settings)) {
    return settings.reduce((carry, item) => {
      if (item?.key) {
        carry[item.key] = item.value
      }

      return carry
    }, {})
  }

  if (settings && typeof settings === 'object') {
    return Object.entries(settings).reduce((carry, [key, value]) => {
      carry[key] = value?.value ?? value
      return carry
    }, {})
  }

  return {}
}

function normalizeString(value, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function tileLayerOptionsForUrl(url) {
  return url.includes('{s}') ? { subdomains: ['a', 'b', 'c'] } : {}
}

export function normalizeMapSettings(settings = []) {
  if (settings && typeof settings === 'object' && !Array.isArray(settings) && (
    Object.prototype.hasOwnProperty.call(settings, 'provider')
    || Object.prototype.hasOwnProperty.call(settings, 'googleMapsApiKey')
    || Object.prototype.hasOwnProperty.call(settings, 'customTileUrl')
  )) {
    return {
      provider: normalizeString(settings.provider, 'openstreetmap').toLowerCase(),
      googleMapsApiKey: normalizeString(settings.googleMapsApiKey),
      googleMapType: normalizeString(settings.googleMapType, 'roadmap').toLowerCase(),
      googleMapId: normalizeString(settings.googleMapId),
      customTileUrl: normalizeString(settings.customTileUrl),
      customTileAttribution: normalizeString(settings.customTileAttribution),
    }
  }

  const values = readSettingEntries(settings)

  return {
    provider: normalizeString(values['map.provider'], 'openstreetmap').toLowerCase(),
    googleMapsApiKey: normalizeString(values['map.google_maps_api_key']),
    googleMapType: normalizeString(values['map.google_map_type'], 'roadmap').toLowerCase(),
    googleMapId: normalizeString(values['map.google_map_id']),
    customTileUrl: normalizeString(values['map.custom_tile_url']),
    customTileAttribution: normalizeString(values['map.custom_tile_attribution']),
  }
}

export function resolveGoogleMapType(mapSettings = {}) {
  const fallbackType = mapSettings.provider === 'google_satellite' ? 'satellite' : 'roadmap'
  const requestedType = normalizeString(mapSettings.googleMapType, fallbackType).toLowerCase()

  return GOOGLE_MAP_TYPES.has(requestedType) ? requestedType : fallbackType
}

export function resolveProviderConfig(mapSettings = {}) {
  const normalized = normalizeMapSettings(mapSettings)
  const fallback = {
    provider: 'openstreetmap',
    ...MAP_PROVIDER_CONFIG.openstreetmap,
    warningKey: '',
  }

  if (normalized.provider === 'custom') {
    if (!normalized.customTileUrl) {
      return {
        ...fallback,
        warningKey: 'customMissingUrl',
      }
    }

    return {
      provider: 'custom',
      tone: 'light',
      url: normalized.customTileUrl,
      attribution: normalized.customTileAttribution || MAP_PROVIDER_CONFIG.openstreetmap.attribution,
      options: tileLayerOptionsForUrl(normalized.customTileUrl),
      warningKey: '',
    }
  }

  if (GOOGLE_MAP_PROVIDERS.has(normalized.provider)) {
    if (!normalized.googleMapsApiKey) {
      return {
        ...fallback,
        warningKey: 'googleMissingKey',
      }
    }

    return {
      provider: normalized.provider,
      tone: normalized.provider === 'google_satellite' ? 'satellite' : 'light',
      warningKey: '',
    }
  }

  const provider = MAP_PROVIDER_CONFIG[normalized.provider]

  if (!provider) {
    return {
      ...fallback,
      warningKey: 'unknownProvider',
    }
  }

  return {
    provider: normalized.provider,
    ...provider,
    warningKey: '',
  }
}

export function getMapPoint(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return [lat, lng]
}

export function fitMapToDefaultViewport(map) {
  map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
}

export function resolveProviderWarning(warningKey, t) {
  if (!warningKey) {
    return ''
  }

  if (warningKey === 'googleMissingKey') {
    return t('liveMapPage.page.providerFallbackGoogle')
  }

  if (warningKey === 'customMissingUrl') {
    return t('liveMapPage.page.providerFallbackCustom')
  }

  return t('liveMapPage.page.providerFallbackUnknown')
}
