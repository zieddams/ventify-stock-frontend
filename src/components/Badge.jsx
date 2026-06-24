/* Theme-aware badges using CSS variables — works in both light and dark mode */
import { useI18n } from '../contexts/I18nContext'

const STYLES = {
  green:  { bg: 'rgba(16,185,129,0.12)',  text: '#059669', border: 'rgba(16,185,129,0.25)' },
  red:    { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626', border: 'rgba(239,68,68,0.25)'  },
  yellow: { bg: 'rgba(245,158,11,0.12)',  text: '#d97706', border: 'rgba(245,158,11,0.25)' },
  blue:   { bg: 'rgba(59,130,246,0.12)',  text: '#2563eb', border: 'rgba(59,130,246,0.25)' },
  slate:  { bg: 'var(--surface-2)',        text: 'var(--text-muted)', border: 'var(--border)' },
  teal:   { bg: 'rgba(13,148,136,0.12)',  text: '#0d9488', border: 'rgba(13,148,136,0.25)' },
  violet: { bg: 'rgba(139,92,246,0.12)', text: '#7c3aed',  border: 'rgba(139,92,246,0.25)' },
}

export default function Badge({ color = 'slate', children, icon }) {
  const s = STYLES[color] ?? STYLES.slate
  return (
    <span
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold whitespace-nowrap">
      {icon && <i className={`${icon} text-[10px]`} />}
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const { t } = useI18n()
  const map = {
    draft:     { color: 'slate',  label: t('badges.invoiceStatus.draft'), icon: 'fa-solid fa-pencil' },
    sent:      { color: 'blue',   label: t('badges.invoiceStatus.sent'), icon: 'fa-solid fa-paper-plane' },
    paid:      { color: 'green',  label: t('badges.invoiceStatus.paid'), icon: 'fa-solid fa-circle-check' },
    cancelled: { color: 'red',    label: t('badges.invoiceStatus.cancelled'), icon: 'fa-solid fa-ban' },
  }
  const { color, label, icon } = map[status] ?? { color: 'slate', label: status }
  return <Badge color={color} icon={icon}>{label}</Badge>
}

export function PaymentStatusBadge({ status }) {
  const { t } = useI18n()
  const map = {
    unpaid:  { color: 'red', label: t('badges.paymentStatus.unpaid'), icon: 'fa-solid fa-clock' },
    partial: { color: 'yellow', label: t('badges.paymentStatus.partial'), icon: 'fa-solid fa-circle-half-stroke' },
    paid:    { color: 'green', label: t('badges.paymentStatus.paid'), icon: 'fa-solid fa-circle-check' },
  }
  const { color, label, icon } = map[status] ?? { color: 'slate', label: status }
  return <Badge color={color} icon={icon}>{label}</Badge>
}

export function RôleBadge({ role }) {
  const { t } = useI18n()
  const map = {
    admin:     { color: 'teal', label: t('badges.roles.admin') },
    developer: { color: 'violet', label: t('badges.roles.developer') },
    rep:       { color: 'blue', label: t('badges.roles.rep') },
    comptable: { color: 'yellow', label: t('badges.roles.comptable') },
  }
  const { color, label } = map[role] ?? { color: 'slate', label: role }
  return <Badge color={color}>{label}</Badge>
}
