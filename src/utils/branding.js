import platformDefaultMark from '../assets/platform-default-mark.png'

export const DEFAULT_APP_MARK = platformDefaultMark
export const DEFAULT_LOGIN_MARK = platformDefaultMark

function cleanString(value) {
  return String(value ?? '').trim()
}

function isDeveloperUser(user) {
  return user?.role === 'developer'
}

export function companyHasDedicatedLogo(company) {
  return cleanString(company?.logo_path) !== ''
}

function shouldUseCompanyBrand(user) {
  return Boolean(user?.company?.id) && !isDeveloperUser(user)
}

export function resolveCompanyBrandLogo(company) {
  if (companyHasDedicatedLogo(company)) {
    return cleanString(company?.logo_url) || DEFAULT_APP_MARK
  }

  return DEFAULT_APP_MARK
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

function setMetaContent(name, content) {
  if (typeof document === 'undefined' || !content) {
    return
  }

  const tag = document.querySelector(`meta[name="${name}"]`)

  if (tag) {
    tag.setAttribute('content', content)
  }
}

function setLinkHref(selector, href) {
  if (typeof document === 'undefined' || !href) {
    return
  }

  document.querySelectorAll(selector).forEach((tag) => {
    tag.setAttribute('href', href)
  })
}

export function applyDocumentBranding({
  title,
  appName,
  description,
  iconHref,
}) {
  if (typeof document === 'undefined') {
    return
  }

  if (title) {
    document.title = title
  }

  setMetaContent('application-name', appName)
  setMetaContent('apple-mobile-web-app-title', appName)
  setMetaContent('description', description)
  setLinkHref('link[rel="icon"]', iconHref)
  setLinkHref('link[rel="apple-touch-icon"]', iconHref)
}
