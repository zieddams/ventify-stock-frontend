import platformDefaultMark from '../assets/platform-default-mark.png'
import irtiwaaLogo from '../assets/irtiwaa-logo.png'

export const DEFAULT_APP_MARK = platformDefaultMark
export const DEFAULT_LOGIN_MARK = platformDefaultMark

function cleanString(value) {
  return String(value ?? '').trim()
}

function isDeveloperUser(user) {
  return user?.role === 'developer'
}

function shouldUseCompanyBrand(user) {
  return Boolean(user?.company?.id) && !isDeveloperUser(user)
}

function resolveCompanyFallbackLogo(company) {
  return company?.slug === 'el-irtiwaa' ? irtiwaaLogo : DEFAULT_APP_MARK
}

export function resolveCompanyBrandLogo(company) {
  return cleanString(company?.logo_url) || resolveCompanyFallbackLogo(company)
}

export function resolveUserBrandLogo(user) {
  if (!shouldUseCompanyBrand(user)) {
    return DEFAULT_APP_MARK
  }

  return resolveCompanyBrandLogo(user?.company)
}

export function resolveUserBrandName(user) {
  if (!shouldUseCompanyBrand(user)) {
    return 'Gestion de vente'
  }

  return cleanString(user?.company?.name) || 'Gestion de vente'
}

export function resolveUserBrandCaption(user) {
  if (isDeveloperUser(user)) {
    return 'Compte developpeur'
  }

  if (shouldUseCompanyBrand(user)) {
    return 'Societe connectee'
  }

  return 'Plateforme'
}

export function resolveUserBrandHint(user) {
  if (shouldUseCompanyBrand(user)) {
    return 'Logo actif pour le compte connecte.'
  }

  return 'Icone plateforme par defaut.'
}
