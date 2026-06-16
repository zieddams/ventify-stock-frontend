/* Theme-aware badges using CSS variables — works in both light and dark mode */

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
  const map = {
    draft:     { color: 'slate',  label: 'Brouillon', icon: 'fa-solid fa-pencil'        },
    sent:      { color: 'blue',   label: 'Envoyée',   icon: 'fa-solid fa-paper-plane'   },
    paid:      { color: 'green',  label: 'Payée',     icon: 'fa-solid fa-circle-check'  },
    cancelled: { color: 'red',    label: 'Annulée',   icon: 'fa-solid fa-ban'            },
  }
  const { color, label, icon } = map[status] ?? { color: 'slate', label: status }
  return <Badge color={color} icon={icon}>{label}</Badge>
}

export function PaymentStatusBadge({ status }) {
  const map = {
    unpaid:  { color: 'red',    label: 'Impayée',  icon: 'fa-solid fa-clock'         },
    partial: { color: 'yellow', label: 'Partielle', icon: 'fa-solid fa-circle-half-stroke' },
    paid:    { color: 'green',  label: 'Payée',     icon: 'fa-solid fa-circle-check'  },
  }
  const { color, label, icon } = map[status] ?? { color: 'slate', label: status }
  return <Badge color={color} icon={icon}>{label}</Badge>
}

export function RoleBadge({ role }) {
  const map = {
    admin:     { color: 'teal',   label: 'Admin'       },
    developer: { color: 'violet', label: 'Développeur' },
    rep:       { color: 'blue',   label: 'Commercial'  },
    comptable: { color: 'yellow', label: 'Comptable'   },
  }
  const { color, label } = map[role] ?? { color: 'slate', label: role }
  return <Badge color={color}>{label}</Badge>
}
