import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { APP_VERSION } from '../config/appMeta'

const AMBIENT_ORBS = [
  {
    size: '32rem',
    color: 'radial-gradient(circle, rgba(20,184,166,0.42) 0%, rgba(20,184,166,0) 72%)',
    top: '-12%',
    left: '-10%',
    delay: 0,
    duration: 9,
  },
  {
    size: '26rem',
    color: 'radial-gradient(circle, rgba(14,165,233,0.36) 0%, rgba(14,165,233,0) 72%)',
    top: '14%',
    left: '68%',
    delay: 2,
    duration: 10,
  },
  {
    size: '20rem',
    color: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, rgba(99,102,241,0) 72%)',
    top: '68%',
    left: '-4%',
    delay: 1,
    duration: 8,
  },
  {
    size: '16rem',
    color: 'radial-gradient(circle, rgba(45,212,191,0.26) 0%, rgba(45,212,191,0) 72%)',
    top: '66%',
    left: '76%',
    delay: 3,
    duration: 7,
  },
]

const PARTICLES = Array.from({ length: 22 }, (_, index) => ({
  left: `${4 + (index * 13) % 92}%`,
  top: `${6 + (index * 19) % 86}%`,
  size: `${index % 3 === 0 ? 0.9 : index % 3 === 1 ? 0.65 : 0.45}rem`,
  duration: `${11 + (index % 5) * 2.5}s`,
  delay: `${(index % 6) * 0.6}s`,
  opacity: 0.12 + (index % 4) * 0.05,
}))

const PLATFORM_PILLS = [
  {
    icon: 'fa-warehouse',
    label: 'Realtime stock',
  },
  {
    icon: 'fa-file-invoice',
    label: 'Smart invoicing',
  },
  {
    icon: 'fa-route',
    label: 'Field tracking',
  },
  {
    icon: 'fa-chart-line',
    label: 'Live reporting',
  },
]

const FEATURE_LINES = [
  {
    icon: 'fa-layer-group',
    title: 'One commercial workspace',
    detail: 'Depot, customers, invoices, expenses and exports stay connected in the same flow.',
  },
  {
    icon: 'fa-mobile-screen-button',
    title: 'Web, API and mobile sync',
    detail: 'The platform keeps one shared data spine for the office team and the field team.',
  },
  {
    icon: 'fa-sparkles',
    title: '2030-ready SaaS messaging',
    detail: 'Clear product language focused on speed, visibility, control and connected operations.',
  },
]

function Orb({ size, color, top, left, delay, duration }) {
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        top,
        left,
        filter: 'blur(68px)',
        mixBlendMode: 'screen',
        opacity: 0.78,
        animation: `orbFloat ${duration}s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6"
      style={{
        background: 'linear-gradient(145deg, #04101f 0%, #081827 38%, #0b1f2d 70%, #06111d 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at top, rgba(56,189,248,0.14) 0%, rgba(56,189,248,0) 42%)',
        }}
      />

      {AMBIENT_ORBS.map((orb, index) => (
        <Orb key={index} {...orb} />
      ))}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="login-particle"
            style={{
              width: particle.size,
              height: particle.size,
              left: particle.left,
              top: particle.top,
              '--particle-duration': particle.duration,
              '--particle-delay': particle.delay,
              '--particle-opacity': particle.opacity,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div
          className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 p-6 sm:p-8"
          style={{
            background: 'linear-gradient(180deg, rgba(9,18,30,0.7) 0%, rgba(9,18,30,0.54) 100%)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: '0 34px 100px rgba(2,6,23,0.54), inset 0 1px 0 rgba(255,255,255,0.12)',
            animation: 'loginReveal 0.6s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-40"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 100%)',
            }}
          />

          <div className="relative z-10">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100/90">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                Connected commerce workspace
              </div>

              <div className="mt-6 inline-flex h-16 w-16 items-center justify-center rounded-[22px] relative"
                style={{
                  background: 'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
                  boxShadow: '0 16px 38px rgba(13,148,136,0.36)',
                }}>
                <i className="fa-solid fa-droplet text-2xl text-white" />
                <div
                  className="absolute inset-0 rounded-[22px]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 62%)',
                  }}
                />
              </div>

              <div className="mt-5 flex items-center justify-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-[2.1rem]">
                  El Irtiwaa
                </h1>
                <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-50">
                  v{APP_VERSION}
                </span>
              </div>

              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-[1.05rem]">
                One secure login for stock control, invoicing, route activity, mobile sync and live reporting.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Modern B2B SaaS positioning for a beverage distribution platform built around speed,
                visibility and connected field operations.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3">
              {PLATFORM_PILLS.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 px-3 py-3 text-sm text-slate-200"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <i className={`fa-solid ${item.icon} text-teal-300`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
              >
                <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Email
                </label>
                <div className="relative">
                  <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@irtiwaa.tn"
                    autoComplete="email"
                    required
                    autoFocus
                    className="login-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Mot de passe
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="********"
                    autoComplete="current-password"
                    required
                    className="login-input pr-12"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPwd((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
                  >
                    <i className={`fa-solid ${showPwd ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit mt-2">
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket" />
                    Acceder a la plateforme
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/25 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Product narrative
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-white">
                    Cleaner, simpler, sharper
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  Simple login
                </span>
              </div>

              <div className="space-y-3">
                {FEATURE_LINES.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white/5 text-teal-300">
                      <i className={`fa-solid ${item.icon} text-sm`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span>El Irtiwaa</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>Beverage distribution platform</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>Web + API + mobile sync</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orbFloat {
          from { transform: translate3d(0, 0, 0) scale(0.96); }
          to { transform: translate3d(0, -32px, 0) scale(1.06); }
        }

        @keyframes particleDrift {
          from { transform: translate3d(0, 0, 0) scale(0.88); }
          to { transform: translate3d(0, -20px, 0) scale(1.08); }
        }

        @keyframes loginReveal {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-particle {
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(125,211,252,0.62) 38%, rgba(45,212,191,0) 76%);
          box-shadow: 0 0 22px rgba(56,189,248,0.24);
          opacity: var(--particle-opacity);
          animation: particleDrift var(--particle-duration) ease-in-out var(--particle-delay) infinite alternate;
        }

        .login-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(148,163,184,0.18) !important;
          background: rgba(15,23,42,0.48) !important;
          color: #f8fafc !important;
          padding: 0.88rem 0.95rem 0.88rem 2.9rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .login-input:focus {
          border-color: rgba(45,212,191,0.72) !important;
          box-shadow: 0 0 0 4px rgba(13,148,136,0.14) !important;
          background: rgba(15,23,42,0.62) !important;
        }

        .login-input::placeholder {
          color: rgba(148,163,184,0.6) !important;
        }

        .login-submit {
          display: inline-flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          border: none;
          border-radius: 1rem;
          background: linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%);
          color: #ffffff;
          cursor: pointer;
          padding: 0.92rem 1.25rem;
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          box-shadow: 0 18px 40px rgba(13,148,136,0.26);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 22px 46px rgba(14,165,233,0.26);
          filter: saturate(1.05);
        }

        .login-submit:active:not(:disabled) {
          transform: translateY(1px) scale(0.995);
        }

        .login-submit:disabled {
          opacity: 0.72;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
    </div>
  )
}
