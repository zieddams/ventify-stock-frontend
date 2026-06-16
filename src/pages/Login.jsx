import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { APP_VERSION } from '../config/appMeta'

const AMBIENT_ORBS = [
  {
    size: '34rem',
    color: 'radial-gradient(circle, rgba(20,184,166,0.44) 0%, rgba(20,184,166,0) 72%)',
    top: '-14%',
    left: '-10%',
    delay: 0,
    duration: 10,
  },
  {
    size: '28rem',
    color: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0) 72%)',
    top: '12%',
    left: '62%',
    delay: 2,
    duration: 11,
  },
  {
    size: '22rem',
    color: 'radial-gradient(circle, rgba(168,85,247,0.34) 0%, rgba(168,85,247,0) 70%)',
    top: '58%',
    left: '-2%',
    delay: 1,
    duration: 9,
  },
  {
    size: '16rem',
    color: 'radial-gradient(circle, rgba(45,212,191,0.3) 0%, rgba(45,212,191,0) 70%)',
    top: '62%',
    left: '74%',
    delay: 3,
    duration: 8,
  },
]

const PARTICLES = Array.from({ length: 18 }, (_, index) => ({
  left: `${5 + (index * 11) % 90}%`,
  top: `${8 + (index * 17) % 82}%`,
  size: `${index % 3 === 0 ? 0.95 : index % 3 === 1 ? 0.7 : 0.5}rem`,
  duration: `${12 + (index % 5) * 3}s`,
  delay: `${(index % 6) * 0.7}s`,
  opacity: 0.16 + (index % 4) * 0.07,
}))

const SUITE_STATUS = [
  {
    label: 'Web platform',
    value: 'Production OVH',
    note: '/web-platform active',
  },
  {
    label: 'API metier',
    value: 'Routes v1 alignees',
    note: 'Exports et config sync',
  },
  {
    label: 'Mobile app',
    value: 'Correctifs en cours',
    note: 'Meme coeur metier',
  },
]

const FEATURE_HIGHLIGHTS = [
  {
    icon: 'fa-sliders',
    title: 'Configuration dynamique',
    description: 'Paiements, categories de depense et gouvernorats restent pilotables depuis la plateforme.',
    background: 'linear-gradient(135deg, rgba(20,184,166,0.22), rgba(20,184,166,0.06))',
    iconColor: '#99f6e4',
  },
  {
    icon: 'fa-boxes-stacked',
    title: 'Inventaire auditable',
    description: 'Les mouvements, ajustements et seuils mini produits restent visibles et traces.',
    background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(59,130,246,0.06))',
    iconColor: '#bfdbfe',
  },
  {
    icon: 'fa-file-arrow-down',
    title: 'Exports et impressions',
    description: 'PDF, Excel et impression rapide couvrent les listings et rapports les plus utilises.',
    background: 'linear-gradient(135deg, rgba(234,179,8,0.22), rgba(234,179,8,0.06))',
    iconColor: '#fde68a',
  },
  {
    icon: 'fa-mobile-screen-button',
    title: 'Suite connectee',
    description: 'Web, API et mobile partagent la meme logique metier et la meme base de reference.',
    background: 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(168,85,247,0.06))',
    iconColor: '#ddd6fe',
  },
]

const CURRENT_STATUS = [
  {
    icon: 'fa-globe',
    label: 'Web platform',
    state: 'Live',
    detail: 'Production OVH active sur /web-platform avec la version courante.',
    iconBg: 'rgba(20,184,166,0.16)',
    iconColor: '#5eead4',
    badgeBg: 'rgba(20,184,166,0.16)',
    badgeColor: '#ccfbf1',
  },
  {
    icon: 'fa-server',
    label: 'API metier',
    state: 'Alignee',
    detail: 'Routes v1, exports et configuration dynamique restent synchronises.',
    iconBg: 'rgba(56,189,248,0.16)',
    iconColor: '#7dd3fc',
    badgeBg: 'rgba(56,189,248,0.16)',
    badgeColor: '#e0f2fe',
  },
  {
    icon: 'fa-mobile-screen-button',
    label: 'Mobile app',
    state: 'Suivi',
    detail: 'Correctifs et prochaines releases continuent sur le meme socle metier.',
    iconBg: 'rgba(168,85,247,0.16)',
    iconColor: '#c4b5fd',
    badgeBg: 'rgba(168,85,247,0.16)',
    badgeColor: '#ede9fe',
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
        filter: 'blur(72px)',
        mixBlendMode: 'screen',
        opacity: 0.8,
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
      className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(140deg, #020617 0%, #082032 34%, #0f172a 66%, #08131f 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at top, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0) 44%)',
        }}
      />

      {AMBIENT_ORBS.map((orb, index) => (
        <Orb key={index} {...orb} />
      ))}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
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

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,420px)] lg:gap-10">
          <section
            className="order-2 overflow-hidden rounded-[32px] border border-white/10 p-6 sm:p-8 lg:order-1 lg:p-10"
            style={{
              background: 'linear-gradient(180deg, rgba(15,23,42,0.58) 0%, rgba(15,23,42,0.34) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 24px 80px rgba(2,6,23,0.42)',
            }}
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-teal-100/90">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                Suite commerciale connectee
              </div>

              <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Stocks, facturation et operations terrain dans un seul cockpit.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                El Irtiwaa centralise depot, ventes, paiements, depenses, routes et reporting pour la
                web platform, l&apos;API metier et les prochaines releases mobiles.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {SUITE_STATUS.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                  >
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {FEATURE_HIGHLIGHTS.map((item) => (
                  <div
                    key={item.title}
                    className="h-full rounded-[26px] border border-white/10 p-5"
                    style={{ background: item.background }}
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: 'rgba(15,23,42,0.34)', color: item.iconColor }}
                    >
                      <i className={`fa-solid ${item.icon} text-base`} />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-white">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="order-1 w-full max-w-md justify-self-center lg:order-2 lg:max-w-none"
            style={{ animation: 'loginReveal 0.65s cubic-bezier(0.16,1,0.3,1) both' }}
          >
            <div
              className="relative overflow-hidden rounded-[30px] border border-white/10 p-6 sm:p-7"
              style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.56) 100%)',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                boxShadow: '0 30px 90px rgba(2,6,23,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-36"
                style={{
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)',
                }}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="relative flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{
                        background: 'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
                        boxShadow: '0 16px 36px rgba(13,148,136,0.35)',
                      }}
                    >
                      <i className="fa-solid fa-droplet text-xl text-white" />
                      <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 62%)',
                        }}
                      />
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100/80">
                        El Irtiwaa
                      </p>
                      <h2 className="text-lg font-semibold text-white">Web platform & API</h2>
                    </div>
                  </div>

                  <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-50">
                    v{APP_VERSION}
                  </span>
                </div>

                <div className="mt-8">
                  <h3 className="text-2xl font-semibold tracking-tight text-white">Connexion securisee</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Accedez au depot, a la facturation, aux exports et au suivi des operations depuis la
                    meme interface.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
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

                <div className="mt-6 rounded-[22px] border border-white/10 bg-slate-950/25 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                        Etat actuel
                      </p>
                      <h4 className="mt-1 text-sm font-semibold text-white">Suite produit alignee</h4>
                    </div>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-50">
                      Maj {APP_VERSION}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {CURRENT_STATUS.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                      >
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
                          style={{ background: item.iconBg, color: item.iconColor }}
                        >
                          <i className={`fa-solid ${item.icon} text-sm`} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-100">{item.label}</p>
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
                              style={{ background: item.badgeBg, color: item.badgeColor }}
                            >
                              {item.state}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
              <span>El Irtiwaa</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>Distribution de boissons</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>Production OVH synchronisee</span>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @keyframes orbFloat {
          from { transform: translate3d(0, 0, 0) scale(0.96); }
          to { transform: translate3d(0, -34px, 0) scale(1.06); }
        }

        @keyframes particleDrift {
          from { transform: translate3d(0, 0, 0) scale(0.9); }
          to { transform: translate3d(0, -22px, 0) scale(1.08); }
        }

        @keyframes loginReveal {
          from { opacity: 0; transform: translateY(18px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .login-particle {
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(125,211,252,0.6) 36%, rgba(45,212,191,0) 74%);
          box-shadow: 0 0 24px rgba(56,189,248,0.28);
          opacity: var(--particle-opacity);
          animation: particleDrift var(--particle-duration) ease-in-out var(--particle-delay) infinite alternate;
        }

        .login-input {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(148,163,184,0.2) !important;
          background: rgba(15,23,42,0.52) !important;
          color: #f8fafc !important;
          padding: 0.88rem 0.95rem 0.88rem 2.9rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .login-input:focus {
          border-color: rgba(45,212,191,0.72) !important;
          box-shadow: 0 0 0 4px rgba(13,148,136,0.16) !important;
          background: rgba(15,23,42,0.68) !important;
        }

        .login-input::placeholder {
          color: rgba(148,163,184,0.62) !important;
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
          box-shadow: 0 18px 40px rgba(13,148,136,0.28);
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 22px 46px rgba(14,165,233,0.28);
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
