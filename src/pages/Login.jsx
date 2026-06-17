import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { APP_VERSION } from '../config/appMeta'

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  left: `${6 + ((index * 17) % 86)}%`,
  top: `${8 + ((index * 13) % 78)}%`,
  size: `${index % 3 === 0 ? 12 : index % 3 === 1 ? 9 : 6}px`,
  delay: `${(index % 6) * 0.55}s`,
  duration: `${7 + (index % 5) * 1.4}s`,
  opacity: 0.14 + (index % 4) * 0.04,
}))

const FEATURE_CARDS = [
  {
    icon: 'fa-solid fa-file-invoice',
    title: 'Factures & paiements',
    detail: 'Facturation terrain, credit client, impressions et suivi des encaissements.',
  },
  {
    icon: 'fa-solid fa-truck-fast',
    title: 'Sessions & camions',
    detail: 'Affectation terrain, chargements, retours, stock embarque et suivi quotidien.',
  },
  {
    icon: 'fa-solid fa-bell',
    title: 'Carte & alertes',
    detail: 'Notifications, remontes mobiles, exports et controle temps reel des operations.',
  },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { isDark } = useTheme()
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
        background: isDark
          ? 'linear-gradient(160deg, #07131d 0%, #0c1b26 42%, #112435 100%)'
          : 'linear-gradient(160deg, #ecf7f6 0%, #f8fbfd 45%, #eef4ff 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(circle at top left, rgba(45,212,191,0.16) 0%, rgba(45,212,191,0) 42%)'
            : 'radial-gradient(circle at top left, rgba(20,184,166,0.16) 0%, rgba(20,184,166,0) 42%)',
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="login-particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              opacity: particle.opacity,
              '--particle-delay': particle.delay,
              '--particle-duration': particle.duration,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full grid-cols-1 overflow-hidden rounded-[32px] border border-white/30 shadow-[0_30px_80px_rgba(15,23,42,0.14)] lg:grid-cols-[0.95fr,1.05fr]">
          <div
            className="px-6 py-8 sm:px-8 lg:px-10"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(7,18,28,0.84) 0%, rgba(9,22,33,0.78) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.78) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal-500 to-teal-700 shadow-[0_18px_40px_rgba(13,148,136,0.26)]">
                <i className="fa-solid fa-droplet text-xl text-white" />
                <div
                  className="absolute inset-0 rounded-[20px]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0) 62%)',
                  }}
                />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-color">El Irtiwaa</div>
                <div className="text-xl font-bold text-base-color">Connexion plateforme</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ borderColor: 'rgba(13,148,136,0.18)', background: 'rgba(13,148,136,0.08)', color: '#0d9488' }}>
                Web + API + mobile
              </span>
              <span className="rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ borderColor: 'rgba(59,130,246,0.14)', background: 'rgba(59,130,246,0.08)', color: '#2563eb' }}>
                v{APP_VERSION}
              </span>
            </div>

            <p className="mt-5 text-sm leading-7 text-secondary-color">
              Connectez-vous pour gerer le stock, la facturation, les sessions terrain, les notifications
              et le suivi operationnel depuis une meme interface.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm"
                style={{ borderColor: 'rgba(239,68,68,0.18)', background: 'rgba(239,68,68,0.08)', color: '#b91c1c' }}
              >
                <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-color">
                  Email
                </label>
                <div className="relative">
                  <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-color" />
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
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-muted-color">
                  Mot de passe
                </label>
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-color" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-color transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-base-color"
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
          </div>

          <div
            className="px-6 py-8 sm:px-8 lg:px-10"
            style={{
              background: isDark
                ? 'linear-gradient(180deg, rgba(11,29,43,0.74) 0%, rgba(10,24,37,0.70) 100%)'
                : 'linear-gradient(180deg, rgba(244,250,255,0.86) 0%, rgba(239,247,252,0.84) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderLeft: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.55)',
            }}
          >
            <div className="rounded-[28px] border px-5 py-5" style={{ borderColor: 'rgba(255,255,255,0.22)', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.58)' }}>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-color">Fonctionnalites</div>
              <h2 className="mt-2 text-2xl font-bold text-base-color">Un acces simple a l essentiel</h2>
              <p className="mt-3 text-sm leading-7 text-secondary-color">
                Cette page reste volontairement sobre: juste la connexion, le contexte produit et les blocs utiles
                pour rappeler les capacites actives de la plateforme.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {FEATURE_CARDS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[24px] border px-5 py-5"
                  style={{
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.58)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: 'rgba(13,148,136,0.10)', color: '#0d9488' }}>
                      <i className={item.icon} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-base-color">{item.title}</div>
                      <div className="mt-2 text-sm leading-6 text-secondary-color">{item.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border px-5 py-4 text-sm text-secondary-color" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.58)' }}>
              Besoin d un diagnostic rapide apres connexion ? Le centre de notifications, la page support et la carte terrain
              sont accessibles directement depuis l en-tete de l application.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes particleDrift {
          from { transform: translate3d(0, 0, 0) scale(0.95); }
          to { transform: translate3d(0, -18px, 0) scale(1.08); }
        }

        .login-particle {
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(125,211,252,0.54) 38%, rgba(45,212,191,0) 76%);
          box-shadow: 0 0 18px rgba(56,189,248,0.16);
          animation: particleDrift var(--particle-duration) ease-in-out var(--particle-delay) infinite alternate;
        }

        .login-input {
          width: 100%;
          border-radius: 1rem;
          padding: 0.9rem 0.95rem 0.9rem 2.9rem;
          background: rgba(255,255,255,0.66) !important;
          border: 1px solid rgba(148,163,184,0.22) !important;
          color: #0f172a !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        html.dark .login-input {
          background: rgba(15,23,42,0.42) !important;
          border-color: rgba(148,163,184,0.18) !important;
          color: #f8fafc !important;
        }

        .login-input:focus {
          border-color: rgba(13,148,136,0.64) !important;
          box-shadow: 0 0 0 4px rgba(13,148,136,0.12) !important;
        }

        .login-input::placeholder {
          color: rgba(100,116,139,0.78) !important;
        }

        .login-submit {
          display: inline-flex;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          border: none;
          border-radius: 1rem;
          background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);
          color: #ffffff;
          cursor: pointer;
          padding: 0.95rem 1.25rem;
          font-size: 0.95rem;
          font-weight: 600;
          box-shadow: 0 18px 40px rgba(13,148,136,0.24);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 22px 44px rgba(13,148,136,0.28);
          filter: saturate(1.03);
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
