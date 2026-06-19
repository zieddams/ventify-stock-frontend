import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Circle, MapContainer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.gridlayer.googlemutant'
import PageHeader from '../../components/PageHeader'
import { PageLoader } from '../../components/Spinner'
import api from '../../services/api'
import { subscribeToOpsMonitor } from '../../services/realtime'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const ZONE_COLORS = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#f97316', '#06b6d4', '#10b981']
const TUNISIA_BOUNDS = [
  [30.0, 7.0],
  [37.6, 11.8],
]
const DEFAULT_CENTER = [34.2, 9.6]
const DEFAULT_ZOOM = 6
const HEARTBEAT_REFRESH_MS = 20 * 1000
const GOOGLE_MAP_PROVIDERS = new Set(['google_roadmap', 'google_satellite'])
const GOOGLE_MAP_TYPES = new Set(['roadmap', 'satellite', 'terrain', 'hybrid'])
const GOOGLE_MAPS_SCRIPT_ID = 'irtiwaa-google-maps-sdk'
const MAP_PROVIDER_CONFIG = {
  openstreetmap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    options: { subdomains: ['a', 'b', 'c'] },
  },
  carto_light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    options: { subdomains: ['a', 'b', 'c', 'd'] },
  },
  open_topo_map: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
    options: { subdomains: ['a', 'b', 'c'] },
  },
  esri_world_imagery: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    options: {},
  },
}
let googleMapsLoaderPromise = null
let googleMapsLoaderKey = ''

function usesGoogleProvider(mapSettings) {
  return GOOGLE_MAP_PROVIDERS.has(mapSettings.provider)
}

function resolveGoogleMapType(mapSettings) {
  const fallbackType = mapSettings.provider === 'google_satellite' ? 'satellite' : 'roadmap'
  const requestedType = String(mapSettings.googleMapType || fallbackType).toLowerCase()

  return GOOGLE_MAP_TYPES.has(requestedType) ? requestedType : fallbackType
}

function loadGoogleMapsApi(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error('missing_google_maps_api_key'))
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }

  if (googleMapsLoaderPromise && googleMapsLoaderKey === apiKey) {
    return googleMapsLoaderPromise
  }

  googleMapsLoaderKey = apiKey
  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    const handleSuccess = (script) => {
      script.dataset.loaded = '1'

      if (window.google?.maps) {
        resolve(window.google)
        return
      }

      googleMapsLoaderPromise = null
      reject(new Error('google_maps_not_available'))
    }

    const handleFailure = () => {
      googleMapsLoaderPromise = null
      reject(new Error('google_maps_load_failed'))
    }

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)

    if (existingScript) {
      if (window.google?.maps || existingScript.dataset.loaded === '1') {
        handleSuccess(existingScript)
        return
      }

      existingScript.addEventListener('load', () => handleSuccess(existingScript), { once: true })
      existingScript.addEventListener('error', handleFailure, { once: true })
      return
    }

    const query = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      loading: 'async',
    })

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?${query.toString()}`
    script.async = true
    script.defer = true
    script.addEventListener('load', () => handleSuccess(script), { once: true })
    script.addEventListener('error', handleFailure, { once: true })
    document.head.appendChild(script)
  })

  return googleMapsLoaderPromise
}

function normalizeMapSettings(settings = []) {
  return {
    provider: 'openstreetmap',
    googleMapsApiKey: '',
    googleMapType: 'roadmap',
    googleMapId: '',
    customTileUrl: '',
    customTileAttribution: '',
  }
}

function resolveProviderConfig(mapSettings) {
  return {
    provider: 'openstreetmap',
    ...MAP_PROVIDER_CONFIG.openstreetmap,
    warning: '',
  }
}

function MapBaseLayer({ mapSettings }) {
  const map = useMap()

  useEffect(() => {
    const config = resolveProviderConfig(mapSettings)
    const fallbackConfig = MAP_PROVIDER_CONFIG.openstreetmap
    let layer = null
    let disposed = false

    const attachLayer = async () => {
      try {
        if (usesGoogleProvider(mapSettings) && mapSettings.googleMapsApiKey) {
          await loadGoogleMapsApi(mapSettings.googleMapsApiKey)

          if (disposed) {
            return
          }

          layer = L.gridLayer.googleMutant({
            type: resolveGoogleMapType(mapSettings),
            maxZoom: 21,
            ...(mapSettings.googleMapId ? { mapId: mapSettings.googleMapId } : {}),
          })
        } else {
          layer = L.tileLayer(config.url, {
            attribution: config.attribution,
            ...(config.options ?? {}),
          })
        }
      } catch {
        if (disposed) {
          return
        }

        layer = L.tileLayer(fallbackConfig.url, {
          attribution: fallbackConfig.attribution,
          ...(fallbackConfig.options ?? {}),
        })
      }

      layer.addTo(map)
    }

    attachLayer()

    return () => {
      disposed = true

      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
    }
  }, [map, mapSettings])

  return null
}

function getTunisiaPoint(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  if (
    lat < TUNISIA_BOUNDS[0][0]
    || lat > TUNISIA_BOUNDS[1][0]
    || lng < TUNISIA_BOUNDS[0][1]
    || lng > TUNISIA_BOUNDS[1][1]
  ) {
    return null
  }

  return [lat, lng]
}

function fitMapToTunisia(map) {
  map.fitBounds(TUNISIA_BOUNDS, {
    padding: [18, 18],
    maxZoom: DEFAULT_ZOOM,
  })
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-TN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(Number(value ?? 0))
}

function formatMoney(value) {
  return `${formatNumber(value)} TND`
}

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fr-FR')
}

function formatRelativeTime(value) {
  if (!value) return 'Aucune activite'

  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'A l\'instant'
  if (minutes < 60) return `Il y a ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Il y a ${hours}h`

  return `Il y a ${Math.floor(hours / 24)}j`
}

function formatRoleLabel(role) {
  if (role === 'rep') return 'Commercial'
  if (role === 'admin') return 'Admin'
  if (role === 'developer') return 'Developpeur'
  if (role === 'comptable') return 'Comptable'
  return role || 'Utilisateur'
}

function makeDotIcon(color, size = 10) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function makeRepIcon(color, selected = false) {
  const size = selected ? 34 : 28

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        background:${color};
        border:3px solid rgba(255,255,255,0.92);
        box-shadow:0 8px 18px rgba(15,23,42,0.28);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#fff;
      ">
        <i class="fa-solid fa-truck-fast" style="font-size:${selected ? 13 : 11}px;"></i>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

function getPresenceMeta(rep) {
  const state = rep?.presence?.state

  if (state === 'online' || rep?.presence?.is_online) {
    return {
      label: 'En ligne',
      color: '#059669',
      bg: 'rgba(5,150,105,0.12)',
      dot: 'bg-emerald-500',
    }
  }

  if (state === 'stale' || (rep?.presence?.alive && rep?.presence?.last_seen)) {
    return {
      label: 'Heartbeat en retard',
      color: '#d97706',
      bg: 'rgba(217,119,6,0.12)',
      dot: 'bg-amber-500',
    }
  }

  if (state === 'never_seen') {
    return {
      label: 'Aucune remontee',
      color: '#94a3b8',
      bg: 'rgba(148,163,184,0.14)',
      dot: 'bg-slate-300',
    }
  }

  return {
    label: 'Hors ligne',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.12)',
    dot: 'bg-slate-400',
  }
}

function getRouteMeta(session) {
  if (!session) {
    return {
      label: 'Sans session',
      color: '#64748b',
      bg: 'rgba(100,116,139,0.12)',
      icon: 'fa-solid fa-route',
    }
  }

  if (session.status === 'open') {
    return {
      label: 'Session ouverte',
      color: '#0d9488',
      bg: 'rgba(13,148,136,0.12)',
      icon: 'fa-solid fa-route',
    }
  }

  return {
    label: 'Session cloturee',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    icon: 'fa-solid fa-flag-checkered',
  }
}

function FitCustomersBounds({ customers }) {
  const map = useMap()

  useEffect(() => {
    const points = customers
      .map(customer => getTunisiaPoint(customer.lat, customer.lng))
      .filter(Boolean)

    if (points.length > 0) {
      try {
        map.fitBounds(points, { padding: [32, 32], maxZoom: 13 })
      } catch {}
    } else {
      try {
        fitMapToTunisia(map)
      } catch {}
    }
  }, [customers, map])

  return null
}

function distanceBetweenPointsKm([lat1, lng1], [lat2, lng2]) {
  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function FitTerrainBounds({ reps, routeTrace, selectedRep }) {
  const map = useMap()

  useEffect(() => {
    const tracePoints = routeTrace
      .map(item => getTunisiaPoint(item.latitude, item.longitude))
      .filter(Boolean)
    const repPoints = reps
      .map(rep => getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
      .filter(Boolean)
    const selectedPoint = getTunisiaPoint(selectedRep?.map_position?.latitude, selectedRep?.map_position?.longitude)

    let points = tracePoints.length > 1 ? tracePoints : repPoints

    if (selectedPoint && tracePoints.length <= 1) {
      const nearbyPoints = repPoints.filter(point => distanceBetweenPointsKm(selectedPoint, point) <= 150)
      points = nearbyPoints.length > 1 ? nearbyPoints : [selectedPoint]
    }

    if (points.length > 0) {
      try {
        if (points.length === 1) {
          map.setView(points[0], Math.max(map.getZoom(), 13))
        } else {
          map.fitBounds(points, { padding: [36, 36], maxZoom: 13 })
        }
      } catch {}
    } else {
      try {
        fitMapToTunisia(map)
      } catch {}
    }
  }, [map, reps, routeTrace, selectedRep])

  return null
}

function MetricCard({ label, value, icon, color, sub }) {
  return (
    <div className="card py-3 px-4 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1a` }}
      >
        <i className={`${icon} text-sm`} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-color">{label}</div>
        <div className="text-sm font-bold text-base-color">{value}</div>
        {sub && <div className="text-[11px] text-muted-color mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-xs text-muted-color">{label}</span>
      <span className="text-xs font-medium text-base-color text-right">{value ?? '—'}</span>
    </div>
  )
}

function TabButton({ active, icon, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
      style={active
        ? { background: 'rgba(13,148,136,0.12)', color: '#0d9488', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
        : { background: 'var(--surface)', color: 'var(--text-secondary)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
    >
      <i className={icon} />
      <span>{label}</span>
      {count != null && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={active
            ? { background: 'rgba(13,148,136,0.18)', color: '#0d9488' }
            : { background: 'rgba(100,116,139,0.12)', color: '#64748b' }}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function ClientsTab({
  customers,
  zones,
  loading,
  mapSettings,
  selectedCustomerId,
  onSelectCustomer,
  filterZone,
  onFilterZone,
  search,
  onSearch,
}) {
  const zoneColor = (zoneId) => {
    if (!zoneId) return '#94a3b8'
    const index = zones.findIndex(zone => zone.id === zoneId)
    return ZONE_COLORS[index % ZONE_COLORS.length] ?? '#94a3b8'
  }

  const filtered = customers.filter(customer => {
    if (filterZone && String(customer.zone_id) !== String(filterZone)) return false
    if (search && !customer.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const mapped = filtered.filter(customer => getTunisiaPoint(customer.lat, customer.lng))
  const unmapped = filtered.filter(customer => !getTunisiaPoint(customer.lat, customer.lng))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-1 space-y-3">
        <div className="card">
          <h2 className="text-sm font-semibold text-base-color mb-3">
            <i className="fa-solid fa-filter text-teal-500 mr-2" />
            Filtres
          </h2>
          <div className="space-y-2">
            <input
              placeholder="Rechercher un client..."
              value={search}
              onChange={event => onSearch(event.target.value)}
            />
            <select value={filterZone} onChange={event => onFilterZone(event.target.value)}>
              <option value="">Toutes les zones</option>
              {zones.map(zone => (
                <option key={zone.id} value={zone.id}>{zone.name}</option>
              ))}
            </select>
          </div>
        </div>

        {zones.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-3">Zones</h2>
            <div className="space-y-1.5">
              {zones.map((zone, index) => (
                <button
                  key={zone.id}
                  onClick={() => onFilterZone(filterZone === String(zone.id) ? '' : String(zone.id))}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors"
                  style={filterZone === String(zone.id)
                    ? { background: `${ZONE_COLORS[index % ZONE_COLORS.length]}15`, color: ZONE_COLORS[index % ZONE_COLORS.length] }
                    : { color: 'var(--text-secondary)' }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: ZONE_COLORS[index % ZONE_COLORS.length] }}
                  />
                  {zone.name}
                  <span className="ml-auto text-muted-color font-normal">
                    {customers.filter(customer => customer.zone_id === zone.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {unmapped.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-base-color mb-2 flex items-center gap-2">
              <i className="fa-solid fa-location-dot-slash text-amber-500" />
              Non geolocalises ({unmapped.length})
            </h2>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {unmapped.map(customer => (
                <div key={customer.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs text-secondary-color">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: zoneColor(customer.zone_id) }}
                  />
                  {customer.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-3">
        <div className="card overflow-hidden p-0" style={{ height: 560 }}>
          {loading ? (
            <PageLoader />
          ) : (
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              minZoom={DEFAULT_ZOOM}
              maxBounds={TUNISIA_BOUNDS}
              maxBoundsViscosity={1}
              style={{ height: '100%', width: '100%' }}
              zoomControl
            >
              <MapBaseLayer mapSettings={mapSettings} />
              <FitCustomersBounds customers={mapped} />

              {mapped.map(customer => {
                const point = getTunisiaPoint(customer.lat, customer.lng)
                if (!point) return null

                return (
                  <Marker
                    key={customer.id}
                    position={point}
                    icon={makeDotIcon(zoneColor(customer.zone_id), selectedCustomerId === customer.id ? 14 : 10)}
                    eventHandlers={{ click: () => onSelectCustomer(customer.id) }}
                  >
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{customer.name}</div>
                        {customer.phone && <div style={{ color: '#64748b', fontSize: 12 }}>{customer.phone}</div>}
                        {customer.address && <div style={{ color: '#64748b', fontSize: 12 }}>{customer.address}</div>}
                        {customer.credit_balance != null && Math.abs(customer.credit_balance) > 0 && (
                          <div
                            style={{
                              marginTop: 6,
                              fontWeight: 600,
                              fontSize: 12,
                              color: customer.credit_balance > 0 ? '#dc2626' : '#059669',
                            }}
                          >
                            Credit: {Number(customer.credit_balance).toFixed(3)} TND
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MapContainer>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <MetricCard label="Total clients" value={customers.length} color="#0d9488" icon="fa-solid fa-users" />
          <MetricCard label="Sur la carte" value={mapped.length} color="#3b82f6" icon="fa-solid fa-location-dot" />
          <MetricCard label="Sans position" value={unmapped.length} color="#f59e0b" icon="fa-solid fa-location-dot-slash" />
        </div>
      </div>
    </div>
  )
}

function TerrainTab({
  terrain,
  terrainLoading,
  terrainError,
  mapSettings,
  repSearch,
  onRepSearch,
  onlineOnly,
  onOnlineOnly,
  selectedRepId,
  onSelectRep,
  routeTrace,
  traceLoading,
}) {
  const filteredReps = (terrain.reps ?? []).filter(rep => {
    if (onlineOnly && !rep.presence?.is_online) return false

    const needle = repSearch.trim().toLowerCase()
    if (!needle) return true

    return [
      rep.name,
      rep.email,
      rep.zone?.name,
      rep.device?.brand,
      rep.device?.model,
      rep.device?.app_version,
    ].some(value => String(value ?? '').toLowerCase().includes(needle))
  })

  const selectedRep = (terrain.reps ?? []).find(rep => String(rep.id) === String(selectedRepId))
  const presenceMeta = getPresenceMeta(selectedRep)
  const routeMeta = getRouteMeta(selectedRep?.route_session)
  const routeTracePoints = routeTrace
    .map(item => getTunisiaPoint(item.latitude, item.longitude))
    .filter(Boolean)
  const terrainPositions = (terrain.reps ?? []).filter(rep => getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
  const selectedRepHasMapPosition = Boolean(getTunisiaPoint(selectedRep?.map_position?.latitude, selectedRep?.map_position?.longitude))
  const mapDisabledReason = selectedRep && !selectedRepHasMapPosition
    ? (selectedRep.presence?.last_seen
      ? 'Aucun point GPS exploitable en Tunisie n a encore ete remonte pour ce compte.'
      : 'Ce compte n a pas encore partage de position exploitable pour la carte terrain.')
    : ''

  if (terrainLoading && !terrain.reps?.length) {
    return <PageLoader />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <MetricCard
          label="Mobiles en ligne"
          value={terrain.stats?.online_users ?? terrain.stats?.online_reps ?? 0}
          sub={`${terrain.stats?.active_users ?? terrain.stats?.active_reps ?? 0} comptes actifs`}
          icon="fa-solid fa-signal"
          color="#0d9488"
        />
        <MetricCard
          label="Sessions ouvertes"
          value={terrain.stats?.open_sessions ?? 0}
          sub={`${terrain.stats?.users_total ?? terrain.stats?.reps_total ?? 0} comptes suivis`}
          icon="fa-solid fa-route"
          color="#3b82f6"
        />
        <MetricCard
          label="Factures du jour"
          value={terrain.stats?.today_invoices ?? 0}
          sub={formatMoney(terrain.stats?.today_revenue ?? 0)}
          icon="fa-solid fa-file-invoice"
          color="#8b5cf6"
        />
        <MetricCard
          label="Alertes camion"
          value={terrain.stats?.camion_low_stock ?? 0}
          sub="Références à surveiller"
          icon="fa-solid fa-triangle-exclamation"
          color="#f59e0b"
        />
        <MetricCard
          label="Derniere mise a jour"
          value={formatRelativeTime(terrain.generated_at)}
          sub={formatDateTime(terrain.generated_at)}
          icon="fa-solid fa-tower-broadcast"
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
                <i className="fa-solid fa-mobile-screen-button text-teal-500" />
                Equipe terrain
              </h2>
              <label className="flex items-center gap-2 text-xs text-muted-color cursor-pointer">
                <input type="checkbox" checked={onlineOnly} onChange={event => onOnlineOnly(event.target.checked)} />
                En ligne seulement
              </label>
            </div>
            <input
              placeholder="Rechercher un utilisateur, un role ou une version app..."
              value={repSearch}
              onChange={event => onRepSearch(event.target.value)}
            />
            <div className="mt-3 space-y-2 max-h-[26rem] overflow-y-auto">
              {filteredReps.map(rep => {
                const repPresence = getPresenceMeta(rep)
                const repRoute = getRouteMeta(rep.route_session)
                const selected = String(rep.id) === String(selectedRepId)

                return (
                  <button
                    key={rep.id}
                    onClick={() => onSelectRep(rep.id)}
                    className="w-full text-left rounded-2xl px-3 py-3 transition-all"
                    style={selected
                      ? { background: 'rgba(13,148,136,0.10)', boxShadow: 'inset 0 0 0 1px rgba(13,148,136,0.18)' }
                      : { background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-base-color truncate">{rep.name}</div>
                        <div className="text-[11px] uppercase tracking-wide text-muted-color mt-0.5">{formatRoleLabel(rep.role)}</div>
                        <div className="text-xs text-muted-color truncate">
                          {rep.zone?.name ?? 'Zone non définie'} · {rep.device?.brand || rep.device?.model
                            ? `${rep.device?.brand ?? ''} ${rep.device?.model ?? ''}`.trim()
                            : 'Aucun appareil remonte'}
                        </div>
                      </div>
                      <div
                        className="text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                        style={{ background: repPresence.bg, color: repPresence.color }}
                      >
                        {repPresence.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-color">
                      <span className={`w-2 h-2 rounded-full ${repPresence.dot}`} />
                      <span>{formatRelativeTime(rep.presence?.last_seen)}</span>
                      <span>·</span>
                      <span style={{ color: repRoute.color }}>{repRoute.label}</span>
                    </div>
                  </button>
                )
              })}

              {filteredReps.length === 0 && (
                <div className="rounded-2xl px-4 py-8 text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                  <i className="fa-solid fa-magnifying-glass text-muted-color opacity-50 mb-2 block" />
                  <p className="text-sm text-muted-color">Aucun compte mobile ne correspond aux filtres.</p>
                </div>
              )}
            </div>
          </div>

          {selectedRep ? (
            <>
              <div className="card">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-lg font-bold text-base-color">{selectedRep.name}</div>
                    <div className="text-sm text-muted-color">
                      {selectedRep.zone?.name ?? 'Zone non définie'} · {selectedRep.email}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: presenceMeta.bg, color: presenceMeta.color }}
                    >
                      {presenceMeta.label}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: routeMeta.bg, color: routeMeta.color }}
                    >
                      <i className={`${routeMeta.icon} mr-1`} />
                      {routeMeta.label}
                    </span>
                  </div>
                </div>

                <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
                  <DetailRow label="Role" value={formatRoleLabel(selectedRep.role)} />
                  <DetailRow label="Dernier ping" value={`${formatRelativeTime(selectedRep.presence?.last_seen)} · ${formatDateTime(selectedRep.presence?.last_seen)}`} />
                  <DetailRow label="Appareil" value={selectedRep.device?.device_name || `${selectedRep.device?.brand ?? ''} ${selectedRep.device?.model ?? ''}`.trim() || 'Non remonte'} />
                  <DetailRow label="Version mobile" value={selectedRep.device?.app_version || 'Non remontee'} />
                  <DetailRow label="OS / API" value={selectedRep.device?.os_version ? `Android ${selectedRep.device.os_version}${selectedRep.device.api_level ? ` (API ${selectedRep.device.api_level})` : ''}` : 'Non remonte'} />
                  <DetailRow label="Ecran / locale" value={[selectedRep.device?.screen_res, selectedRep.device?.locale, selectedRep.device?.timezone].filter(Boolean).join(' · ') || 'Non remonte'} />
                  <DetailRow label="Adresse IP" value={selectedRep.device?.ip || 'Non remontee'} />
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
                    <i className="fa-solid fa-box-open text-amber-500" />
                    Stock embarque
                  </h2>
                  <span className="text-xs text-muted-color">
                    {selectedRep.camion_stock?.items?.length ?? 0} reference(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-2xl px-3 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-[11px] text-muted-color">Quantité restante</div>
                    <div className="text-sm font-bold text-base-color mt-1">{formatNumber(selectedRep.camion_stock?.total_qty ?? 0)}</div>
                  </div>
                  <div className="rounded-2xl px-3 py-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                    <div className="text-[11px] text-muted-color">Valeur camion</div>
                    <div className="text-sm font-bold text-base-color mt-1">{formatMoney(selectedRep.camion_stock?.total_value ?? 0)}</div>
                  </div>
                </div>

                  <div className="text-[11px] text-muted-color mb-2">
                    Camion physique: {selectedRep.camion_stock?.configured_camion?.name ?? 'aucun camion assigne'}
                    {selectedRep.camion_stock?.configured_camion?.plate
                      ? ` - ${selectedRep.camion_stock.configured_camion.plate}`
                      : ''}
                  </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {(selectedRep.camion_stock?.items ?? []).map(item => (
                    <div key={item.product_id} className="rounded-2xl px-3 py-2.5 flex items-center gap-3" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-base-color truncate">{item.product?.name}</div>
                        <div className="text-[11px] text-muted-color truncate">
                          {item.product?.reference || 'Sans reference'} · {item.product?.unit || 'u'}
                          {item.product?.min_stock != null && ` · min ${formatNumber(item.product.min_stock)}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: item.is_low ? '#f59e0b' : '#0d9488' }}>
                          {formatNumber(item.qty)}
                        </div>
                        <div className="text-[11px] text-muted-color">{formatMoney(item.value)}</div>
                      </div>
                    </div>
                  ))}

                  {(selectedRep.camion_stock?.items ?? []).length === 0 && (
                    <div className="rounded-2xl px-4 py-6 text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <p className="text-sm text-muted-color">Aucun stock embarque pour ce commercial.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-10">
              <i className="fa-solid fa-location-dot text-3xl text-muted-color opacity-30 mb-3 block" />
              <p className="text-sm text-muted-color">Sélectionnez un compte mobile pour afficher ses détails terrain.</p>
            </div>
          )}
        </div>

        <div className="xl:col-span-8 space-y-4">
          <div className="card overflow-hidden p-0" style={{ height: 560 }}>
            {terrainError ? (
              <div className="flex items-center justify-center h-full text-center px-6">
                <div>
                  <i className="fa-solid fa-tower-broadcast text-2xl text-red-400 mb-3 block" />
                  <p className="text-sm text-base-color font-semibold">Impossible de charger le suivi terrain</p>
                  <p className="text-xs text-muted-color mt-1">{terrainError}</p>
                </div>
              </div>
            ) : mapDisabledReason ? (
              <div className="flex items-center justify-center h-full text-center px-6">
                <div className="max-w-md">
                  <i className="fa-solid fa-location-slash text-2xl text-amber-500 mb-3 block" />
                  <p className="text-sm text-base-color font-semibold">Carte desactive pour ce commercial</p>
                  <p className="text-xs text-muted-color mt-1">{mapDisabledReason}</p>
                  <p className="text-xs text-secondary-color mt-3">
                    Le suivi restera sur OpenStreetMap et se reactivera automatiquement des qu un point GPS valide sera recu.
                  </p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                minZoom={DEFAULT_ZOOM}
                maxBounds={TUNISIA_BOUNDS}
                maxBoundsViscosity={1}
                style={{ height: '100%', width: '100%' }}
                zoomControl
              >
                <MapBaseLayer mapSettings={mapSettings} />
                <FitTerrainBounds reps={terrainPositions} routeTrace={routeTrace} selectedRep={selectedRep} />

                {terrainPositions.map(rep => {
                  const presence = getPresenceMeta(rep)
                  const selected = String(rep.id) === String(selectedRepId)
                  const point = getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude)

                  if (!point) {
                    return null
                  }

                  return (
                    <Marker
                      key={rep.id}
                      position={point}
                      icon={makeRepIcon(selected ? '#2563eb' : presence.color, selected)}
                      eventHandlers={{ click: () => onSelectRep(rep.id) }}
                    >
                      <Popup>
                        <div style={{ minWidth: 180 }}>
                          <div style={{ fontWeight: 700 }}>{rep.name}</div>
                          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                            {presence.label} · {formatRelativeTime(rep.presence?.last_seen)}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                            {rep.route_session?.status === 'open' ? 'Session ouverte' : 'Pas de session active'}
                          </div>
                          {rep.device?.app_version && (
                            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                              App v{rep.device.app_version}
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}

                {selectedRepHasMapPosition && selectedRep?.map_position && selectedRep.map_position.accuracy > 0 && (
                  <Circle
                    center={getTunisiaPoint(selectedRep.map_position.latitude, selectedRep.map_position.longitude)}
                    radius={Number(selectedRep.map_position.accuracy)}
                    pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.08 }}
                  />
                )}

                {routeTracePoints.length > 1 && (
                  <Polyline positions={routeTracePoints} pathOptions={{ color: '#0d9488', weight: 4, opacity: 0.85 }} />
                )}
              </MapContainer>
            )}
          </div>

          {selectedRep && !selectedRepHasMapPosition && (
            <div className="card py-3 px-4">
              <div className="flex items-start gap-3">
                <i className="fa-solid fa-circle-info text-amber-500 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-base-color">Position introuvable pour ce compte</div>
                  <div className="text-xs text-muted-color mt-1">
                    La carte reste limitee a la Tunisie. Cette position est absente ou hors Tunisie, donc elle n'est pas affichee.
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedRep && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <MetricCard
                  label="CA du jour"
                  value={formatMoney(selectedRep.today?.invoices_total ?? 0)}
                  sub={`${selectedRep.today?.invoices_count ?? 0} facture(s)`}
                  icon="fa-solid fa-sack-dollar"
                  color="#0d9488"
                />
                <MetricCard
                  label="Charge du jour"
                  value={formatNumber(selectedRep.route_session?.loaded_qty_total ?? 0)}
                  sub={formatMoney(selectedRep.route_session?.loaded_value_total ?? 0)}
                  icon="fa-solid fa-truck-ramp-box"
                  color="#3b82f6"
                />
                <MetricCard
                  label="Derniere recharge"
                  value={selectedRep.route_session?.last_load?.qty_total != null
                    ? formatNumber(selectedRep.route_session.last_load.qty_total)
                    : 'Aucune'}
                  sub={selectedRep.route_session?.last_load?.at
                    ? `${formatDateTime(selectedRep.route_session.last_load.at)} · ${formatMoney(selectedRep.route_session.last_load.value_total ?? 0)}`
                    : 'Pas de mouvement dépôt > camion'}
                  icon="fa-solid fa-boxes-stacked"
                  color="#8b5cf6"
                />
                <MetricCard
                  label="Points GPS"
                  value={selectedRep.route_session?.locations_count ?? 0}
                  sub={traceLoading ? 'Trace en cours...' : `${routeTrace.length} point(s) charges`}
                  icon="fa-solid fa-location-crosshairs"
                  color="#f59e0b"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
                      <i className="fa-solid fa-route text-teal-500" />
                      Session du jour
                    </h2>
                    <span className="text-xs text-muted-color">
                      {selectedRep.route_session?.session_date || 'Aucune session'}
                    </span>
                  </div>
                  <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
                    <DetailRow label="Session #" value={selectedRep.route_session?.id ? `#${selectedRep.route_session.id}` : 'Aucune'} />
                    <DetailRow label="Ouverture" value={formatDateTime(selectedRep.route_session?.opened_at)} />
                    <DetailRow label="Cloture" value={formatDateTime(selectedRep.route_session?.closed_at)} />
                    <DetailRow label="Zone session" value={selectedRep.route_session?.zone?.name || selectedRep.zone?.name || '—'} />
                    <DetailRow label="Camion assigne" value={selectedRep.route_session?.camion?.name || selectedRep.camion_stock?.configured_camion?.name || 'Aucun'} />
                    <DetailRow label="Chargee / vendue / retour" value={`${formatNumber(selectedRep.route_session?.loaded_qty_total ?? 0)} / ${formatNumber(selectedRep.route_session?.sold_qty_total ?? 0)} / ${formatNumber(selectedRep.route_session?.returned_qty_total ?? 0)}`} />
                    <DetailRow label="Reste camion" value={formatNumber(selectedRep.route_session?.remaining_qty_total ?? 0)} />
                    <DetailRow label="Cash / credit" value={`${formatMoney(selectedRep.route_session?.cash_collected ?? 0)} / ${formatMoney(selectedRep.route_session?.credit_given ?? 0)}`} />
                    <DetailRow label="Precision GPS" value={selectedRep.map_position?.accuracy != null ? `${formatNumber(selectedRep.map_position.accuracy)} m` : '--'} />
                    <DetailRow label="Vitesse" value={selectedRep.map_position?.speed != null ? `${formatNumber(selectedRep.map_position.speed)} km/h` : '--'} />
                    <DetailRow label="Dernier point carte" value={selectedRep.map_position ? `${selectedRep.map_position.source === 'gps' ? 'GPS' : 'Facture'} · ${formatDateTime(selectedRep.map_position.recorded_at)}` : 'Aucun point'} />
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-sm font-semibold text-base-color flex items-center gap-2">
                      <i className="fa-solid fa-file-invoice text-indigo-500" />
                      Derniere facture / session terrain
                    </h2>
                    {selectedRep.today?.last_invoice && (
                      <span className="text-xs text-muted-color">{formatDateTime(selectedRep.today.last_invoice.created_at)}</span>
                    )}
                  </div>

                  {selectedRep.today?.last_invoice ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-base-color">{selectedRep.today.last_invoice.number}</div>
                            <div className="text-xs text-muted-color mt-0.5">
                              {selectedRep.today.last_invoice.customer_name || 'Client non défini'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-base-color">{formatMoney(selectedRep.today.last_invoice.total)}</div>
                            <div className="text-[11px] text-muted-color mt-0.5">
                              {selectedRep.today.last_invoice.payment_status || '—'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
                        <DetailRow label="Factures aujourd'hui" value={selectedRep.today.invoices_count} />
                        <DetailRow label="CA du terrain" value={formatMoney(selectedRep.today.invoices_total)} />
                        <DetailRow label="Version app" value={selectedRep.device?.app_version || selectedRep.device?.native_app_version || 'Non remontee'} />
                        <DetailRow label="Plateforme / build" value={[selectedRep.device?.platform, selectedRep.device?.native_build_version].filter(Boolean).join(' · ') || 'Non remonte'} />
                        <DetailRow label="Execution" value={[selectedRep.device?.app_ownership, selectedRep.device?.execution_environment].filter(Boolean).join(' · ') || 'Non remontee'} />
                        <DetailRow label="Dernier ping" value={selectedRep.presence?.last_seen ? `${formatRelativeTime(selectedRep.presence.last_seen)} · ${formatDateTime(selectedRep.presence.last_seen)}` : 'Aucune remontee'} />
                        <DetailRow label="Ecran / locale" value={[selectedRep.device?.screen_res, selectedRep.device?.locale].filter(Boolean).join(' · ') || 'Non remonte'} />
                        <DetailRow label="Trace chargee" value={routeTrace.length > 0 ? `${routeTrace.length} point(s)` : 'Aucune trace pour le moment'} />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl px-4 py-8 text-center" style={{ background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--border)' }}>
                      <i className="fa-solid fa-file-circle-xmark text-muted-color opacity-40 mb-2 block" />
                      <p className="text-sm text-muted-color">Aucune facture du jour pour ce commercial.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LiveMapIndex() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [customers, setCustomers] = useState([])
  const [zones, setZones] = useState([])
  const [mapSettings, setMapSettings] = useState(() => normalizeMapSettings())
  const [loadingClients, setLoadingClients] = useState(true)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [filterZone, setFilterZone] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [terrain, setTerrain] = useState({ generated_at: null, stats: {}, reps: [] })
  const [loadingTerrain, setLoadingTerrain] = useState(true)
  const [terrainError, setTerrainError] = useState('')
  const [repSearch, setRepSearch] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [routeTrace, setRouteTrace] = useState([])
  const [traceLoading, setTraceLoading] = useState(false)
  const initialClientsLoaded = useRef(false)
  const initialTerrainLoaded = useRef(false)
  const terrainReloadTimerRef = useRef(null)
  const traceReloadTimerRef = useRef(null)

  const activeTab = searchParams.get('tab') === 'clients' ? 'clients' : 'terrain'
  const selectedRepId = searchParams.get('rep') || ''

  const patchSearchParams = useCallback((patch) => {
    const next = new URLSearchParams(searchParams)

    Object.entries(patch).forEach(([key, value]) => {
      if (value == null || value === '') {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
    })

    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const loadClients = useCallback(async () => {
    if (!initialClientsLoaded.current) {
      setLoadingClients(true)
    }

    try {
      const [customersResponse, zonesResponse] = await Promise.all([
        api.get('/customers'),
        api.get('/zones'),
      ])

      setCustomers(customersResponse.data ?? [])
      setZones(zonesResponse.data ?? [])
      initialClientsLoaded.current = true
    } finally {
      setLoadingClients(false)
    }
  }, [])

  const loadMapSettings = useCallback(async () => {
    setMapSettings(normalizeMapSettings())
  }, [])

  const loadTerrain = useCallback(async () => {
    if (!initialTerrainLoaded.current) {
      setLoadingTerrain(true)
    }

    try {
      const response = await api.get('/monitor/terrain')
      setTerrain(response.data ?? { generated_at: null, stats: {}, reps: [] })
      setTerrainError('')
      initialTerrainLoaded.current = true
    } catch {
      setTerrainError('Le flux terrain n\'est pas encore disponible.')
    } finally {
      setLoadingTerrain(false)
    }
  }, [])

  const loadRouteTrace = useCallback(async (routeSessionId) => {
    if (!routeSessionId) {
      setRouteTrace([])
      return
    }

    setTraceLoading(true)

    try {
      const response = await api.get(`/route-sessions/${routeSessionId}/locations`, {
        params: { limit: 250 },
      })
      setRouteTrace(response.data ?? [])
    } catch {
      setRouteTrace([])
    } finally {
      setTraceLoading(false)
    }
  }, [])

  const queueTerrainReload = useCallback(() => {
    if (terrainReloadTimerRef.current) return

    terrainReloadTimerRef.current = window.setTimeout(() => {
      terrainReloadTimerRef.current = null
      loadTerrain()
    }, 1200)
  }, [loadTerrain])

  const queueTraceReload = useCallback((routeSessionId) => {
    if (!routeSessionId || traceReloadTimerRef.current) return

    traceReloadTimerRef.current = window.setTimeout(() => {
      traceReloadTimerRef.current = null
      loadRouteTrace(routeSessionId)
    }, 900)
  }, [loadRouteTrace])

  useEffect(() => {
    loadClients()
    loadTerrain()
    loadMapSettings()
  }, [loadClients, loadMapSettings, loadTerrain])

  useEffect(() => {
    if (activeTab !== 'terrain') {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      loadTerrain()
      if (selectedRepId) {
        const selectedRep = (terrain.reps ?? []).find(rep => String(rep.id) === String(selectedRepId))
        if (selectedRep?.route_session?.id) {
          loadRouteTrace(selectedRep.route_session.id)
        }
      }
    }, HEARTBEAT_REFRESH_MS)

    return () => window.clearInterval(intervalId)
  }, [activeTab, loadRouteTrace, loadTerrain, selectedRepId, terrain.reps])

  useEffect(() => {
    if (activeTab !== 'terrain' || terrain.reps.length === 0) {
      return
    }

    const selectedRepExists = terrain.reps.some(rep => String(rep.id) === String(selectedRepId))
    if (selectedRepExists) {
      return
    }

    const repCandidates = terrain.reps.filter(rep => rep.role === 'rep')
    const fallbackRep = repCandidates.find(rep => rep.route_session?.status === 'open' && getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
      || repCandidates.find(rep => rep.presence?.is_online && getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
      || repCandidates.find(rep => getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
      || terrain.reps.find(rep => rep.route_session?.status === 'open' && getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
      || terrain.reps.find(rep => rep.presence?.is_online && getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
      || terrain.reps.find(rep => getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude))
      || repCandidates.find(rep => rep.presence?.is_online)
      || terrain.reps.find(rep => rep.presence?.is_online)
      || terrain.reps.find(rep => rep.route_session?.status === 'open')
      || terrain.reps[0]

    if (fallbackRep) {
      patchSearchParams({ tab: 'terrain', rep: fallbackRep.id })
    }
  }, [activeTab, patchSearchParams, selectedRepId, terrain.reps])

  useEffect(() => {
    if (activeTab !== 'terrain') {
      return
    }

    const selectedRep = terrain.reps.find(rep => String(rep.id) === String(selectedRepId))
    if (!getTunisiaPoint(selectedRep?.map_position?.latitude, selectedRep?.map_position?.longitude)) {
      setRouteTrace([])
      return
    }

    loadRouteTrace(selectedRep?.route_session?.id)
  }, [activeTab, loadRouteTrace, selectedRepId, terrain.reps])

  useEffect(() => {
    if (activeTab !== 'terrain') {
      return undefined
    }

    return subscribeToOpsMonitor((event) => {
      queueTerrainReload()

      const selectedRep = terrain.reps.find(rep => String(rep.id) === String(selectedRepId))
      if (selectedRep?.route_session?.id && String(selectedRep.route_session.id) === String(event.route_session_id)) {
        queueTraceReload(selectedRep.route_session.id)
      }
    })
  }, [activeTab, queueTerrainReload, queueTraceReload, selectedRepId, terrain.reps])

  useEffect(() => () => {
    if (terrainReloadTimerRef.current) {
      window.clearTimeout(terrainReloadTimerRef.current)
    }
    if (traceReloadTimerRef.current) {
      window.clearTimeout(traceReloadTimerRef.current)
    }
  }, [])

  const customerSubtitle = `${customers.length} clients · ${customers.filter(customer => getTunisiaPoint(customer.lat, customer.lng)).length} geolocalises`
  const terrainTrackedCount = terrain.stats?.users_total ?? terrain.stats?.reps_total ?? 0
  const terrainMappedCount = terrain.reps.filter(rep => getTunisiaPoint(rep.map_position?.latitude, rep.map_position?.longitude)).length
  const terrainOnlineCount = terrain.stats?.online_users ?? terrain.stats?.online_reps ?? 0
  const providerConfig = resolveProviderConfig(mapSettings)
  const terrainSubtitle = terrain.generated_at
    ? `${terrain.stats?.reps_total ?? 0} commerciaux suivis · MAJ ${formatDateTime(terrain.generated_at)}`
    : 'Suivi mobile, GPS et stock terrain'

  return (
    <div>
      <PageHeader
        title="Carte & terrain"
        subtitle={activeTab === 'terrain'
          ? (terrain.generated_at
            ? `${terrainMappedCount}/${terrainTrackedCount} comptes positionnes - ${terrainOnlineCount} en ligne - MAJ ${formatDateTime(terrain.generated_at)}`
            : terrainSubtitle)
          : customerSubtitle}
        action={(
          <button
            onClick={() => {
              loadMapSettings()
              if (activeTab === 'terrain') {
                loadTerrain()
                const selectedRep = terrain.reps.find(rep => String(rep.id) === String(selectedRepId))
                if (selectedRep?.route_session?.id) {
                  loadRouteTrace(selectedRep.route_session.id)
                }
              } else {
                loadClients()
              }
            }}
            className="btn-secondary text-xs py-2"
          >
            <i className="fa-solid fa-rotate-right" /> Actualiser
          </button>
        )}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <TabButton
          active={activeTab === 'clients'}
          icon="fa-solid fa-users"
          label="Clients"
          count={customers.length}
          onClick={() => patchSearchParams({ tab: 'clients' })}
        />
        <TabButton
          active={activeTab === 'terrain'}
          icon="fa-solid fa-tower-broadcast"
          label="Terrain mobile"
          count={terrainMappedCount}
          onClick={() => patchSearchParams({ tab: 'terrain' })}
        />
      </div>

      {providerConfig.warning && (
        <div className="card py-3 px-4 mb-4">
          <div className="flex items-start gap-3">
            <i className="fa-solid fa-circle-info text-amber-500 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-base-color">Provider carte</div>
              <div className="text-xs text-secondary-color mt-1">{providerConfig.warning}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'terrain' ? (
        <TerrainTab
          terrain={terrain}
          terrainLoading={loadingTerrain}
          terrainError={terrainError}
          mapSettings={mapSettings}
          repSearch={repSearch}
          onRepSearch={setRepSearch}
          onlineOnly={onlineOnly}
          onOnlineOnly={setOnlineOnly}
          selectedRepId={selectedRepId}
          onSelectRep={(repId) => patchSearchParams({ tab: 'terrain', rep: repId })}
          routeTrace={routeTrace}
          traceLoading={traceLoading}
        />
      ) : (
        <ClientsTab
          customers={customers}
          zones={zones}
          loading={loadingClients}
          mapSettings={mapSettings}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={setSelectedCustomerId}
          filterZone={filterZone}
          onFilterZone={setFilterZone}
          search={customerSearch}
          onSearch={setCustomerSearch}
        />
      )}
    </div>
  )
}
