import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PARTICLES = Array.from({ length: 22 }, (_, index) => ({
  left: `${4 + ((index * 19) % 92)}%`,
  top: `${6 + ((index * 11) % 82)}%`,
  size: `${index % 4 === 0 ? 16 : index % 4 === 1 ? 11 : index % 4 === 2 ? 8 : 5}px`,
  delay: `${(index % 7) * 0.45}s`,
  duration: `${8 + (index % 6) * 1.25}s`,
  opacity: 0.12 + (index % 5) * 0.035,
}))

const HIGHLIGHTS = ['Stock', 'Sessions terrain', 'Facturation']

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
    <div className="relative min-h-screen overflow-hidden bg-[#041018]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 18% 18%, rgba(20,184,166,0.22) 0%, rgba(20,184,166,0) 36%),
            radial-gradient(circle at 82% 18%, rgba(56,189,248,0.16) 0%, rgba(56,189,248,0) 32%),
            radial-gradient(circle at 50% 100%, rgba(13,148,136,0.18) 0%, rgba(13,148,136,0) 42%),
            linear-gradient(180deg, #031019 0%, #07141f 48%, #041018 100%)
          `,
        }}
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-glow login-glow-left" />
        <div className="login-glow login-glow-right" />
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

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="login-shell w-full max-w-md rounded-[30px] px-6 py-7 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal-400 via-teal-500 to-teal-700 shadow-[0_18px_42px_rgba(13,148,136,0.32)]">
              <i className="fa-solid fa-droplet text-xl text-white" />
              <div className="absolute inset-0 rounded-[20px] bg-[linear-gradient(135deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_62%)]" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-200/80">El Irtiwaa</div>
              <div className="text-xl font-bold text-white">Connexion plateforme</div>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-slate-300">
            Acces direct au stock, aux sessions terrain, a la facturation et au suivi mobile.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm text-red-100"
              style={{
                borderColor: 'rgba(248,113,113,0.28)',
                background: 'rgba(127,29,29,0.32)',
              }}
            >
              <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0 text-red-300" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Email
              </label>
              <div className="relative">
                <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
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
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Mot de passe
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-white/6 hover:text-white"
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

          <div className="mt-6 flex flex-wrap gap-2">
            {HIGHLIGHTS.map((item) => (
              <span
                key={item}
                className="rounded-full border px-3 py-1 text-[11px] font-semibold text-slate-200/90"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes particleDrift {
          from { transform: translate3d(0, 0, 0) scale(0.92); }
          to { transform: translate3d(0, -26px, 0) scale(1.1); }
        }

        @keyframes glowPulse {
          from { transform: scale(0.96); opacity: 0.52; }
          to { transform: scale(1.06); opacity: 0.82; }
        }

        .login-shell {
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(180deg, rgba(4,15,24,0.8) 0%, rgba(7,19,30,0.72) 100%);
          box-shadow: 0 28px 90px rgba(2,12,22,0.55);
          backdrop-filter: blur(26px);
          -webkit-backdrop-filter: blur(26px);
        }

        .login-glow {
          position: absolute;
          width: 24rem;
          height: 24rem;
          border-radius: 999px;
          filter: blur(80px);
          animation: glowPulse 7.2s ease-in-out infinite alternate;
        }

        .login-glow-left {
          left: -7rem;
          top: -6rem;
          background: rgba(20,184,166,0.16);
        }

        .login-glow-right {
          right: -8rem;
          bottom: -7rem;
          background: rgba(56,189,248,0.14);
          animation-delay: 1.2s;
        }

        .login-particle {
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(125,211,252,0.52) 35%, rgba(45,212,191,0) 74%);
          box-shadow: 0 0 24px rgba(45,212,191,0.14);
          animation: particleDrift var(--particle-duration) ease-in-out var(--particle-delay) infinite alternate;
        }

        .login-input {
          width: 100%;
          border-radius: 1rem;
          padding: 0.95rem 0.95rem 0.95rem 2.9rem;
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #f8fafc !important;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .login-input:focus {
          border-color: rgba(45,212,191,0.52) !important;
          box-shadow: 0 0 0 4px rgba(20,184,166,0.12) !important;
        }

        .login-input::placeholder {
          color: rgba(148,163,184,0.78) !important;
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
          filter: saturate(1.04);
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
