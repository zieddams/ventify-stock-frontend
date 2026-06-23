export default function Spinner({ className = 'w-6 h-6' }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(13,148,136,0.18) 0%, rgba(13,148,136,0) 68%)',
          filter: 'blur(6px)',
        }}
      />
      <svg className="absolute inset-0 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
        <path className="opacity-95" fill="currentColor" d="M12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6V2z" />
      </svg>
      <span
        className="relative w-2.5 h-2.5 rounded-full animate-pulse"
        style={{ background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)' }}
      />
    </span>
  )
}

export function PageLoader() {
  return (
    <div className="h-48 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="w-12 h-12" />
        <div className="text-xs font-medium tracking-[0.22em] uppercase text-muted-color">
          Chargement
        </div>
      </div>
    </div>
  )
}
