import irtiwaaMark from '../assets/irtiwaa-mark.png'

export const DEFAULT_APP_MARK = irtiwaaMark

function cleanString(value) {
  return String(value ?? '').trim()
}

export function resolveUserBrandLogo(user) {
  return cleanString(user?.company?.logo_url) || DEFAULT_APP_MARK
}

export function resolveUserBrandName(user) {
  return cleanString(user?.company?.name) || 'Gestion de vente'
}

export function resolveUserBrandCaption(user) {
  if (user?.company?.id) {
    return 'Societe connectee'
  }

  if (user?.role === 'developer') {
    return 'Compte developpeur'
  }

  return 'Plateforme'
}

export function resolveUserBrandHint(user) {
  if (user?.company?.id) {
    return 'Logo actif pour le compte connecte.'
  }

  return 'Icone plateforme par defaut.'
}
