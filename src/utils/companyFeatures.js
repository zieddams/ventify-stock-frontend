function hasCompanyFeature(user, key) {
  return user?.company?.features?.[key] === true
}

export function isCustomerGeolocationEnabled(user) {
  return hasCompanyFeature(user, 'customer_geolocation_enabled')
}

export function isTerrainTrackingEnabled(user) {
  return hasCompanyFeature(user, 'terrain_tracking_enabled')
}

export function isAnyMapExperienceEnabled(user) {
  return isCustomerGeolocationEnabled(user) || isTerrainTrackingEnabled(user)
}
