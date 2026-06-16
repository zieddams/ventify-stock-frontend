import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-fade-in`}
        style={{
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: '1.25rem',
          boxShadow:    '0 24px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h3 className="text-base font-semibold text-base-color">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-muted-color hover:text-base-color"
            style={{ background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
