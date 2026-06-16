import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { APP_VERSION } from '../config/appMeta'

/* Floating orb — pure CSS animation, no library */
function Orb({ size, color, top, left, delay, duration }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width:  size,
        height: size,
        background: color,
        top, left,
        filter: 'blur(60px)',
        opacity: 0.35,
        animation: `orbFloat ${duration}s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  )
}

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }   = useAuth()
  const navigate    = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c1a2e 40%, #071420 100%)' }}>

      {/* ── Ambient orbs (plastique / glassmorphism atmosphere) ─── */}
      <Orb size="520px" color="radial-gradient(circle, #0d9488 0%, transparent 70%)" top="-10%"  left="-8%"  delay={0}   duration={8} />
      <Orb size="400px" color="radial-gradient(circle, #3b82f6 0%, transparent 70%)" top="50%"  left="55%"  delay={2}   duration={10} />
      <Orb size="300px" color="radial-gradient(circle, #8b5cf6 0%, transparent 70%)" top="65%"  left="-5%"  delay={1}   duration={7} />
      <Orb size="200px" color="radial-gradient(circle, #0d9488 0%, transparent 70%)" top="20%"  left="70%"  delay={3}   duration={9} />

      {/* ── Grid overlay ─────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ── Main card (glass) ─────────────────────────────────────── */}
      <div className="relative w-full max-w-sm z-10" style={{ animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Glass card */}
        <div style={{
          background:     'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border:         '1px solid rgba(255,255,255,0.10)',
          borderRadius:   '24px',
          boxShadow:      '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          padding:        '2.5rem 2rem',
        }}>

          {/* Logo + brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative"
              style={{
                background:  'linear-gradient(135deg, #0d9488, #0891b2)',
                boxShadow:   '0 8px 32px rgba(13,148,136,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              }}>
              <i className="fa-solid fa-droplet text-white text-2xl" />
              {/* Shine */}
              <div className="absolute inset-0 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)' }} />
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              El Irtiwaa
            </h1>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.9)' }}>
              Gestion commerciale · Stocks · Finance
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(100,116,139,0.8)' }}>
              Facturation · Crédit · Rapports en temps réel
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm"
              style={{
                background: 'rgba(239,68,68,0.12)',
                border:     '1px solid rgba(239,68,68,0.25)',
                color:      '#fca5a5',
              }}>
              <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email field */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: 'rgba(148,163,184,0.7)' }}>
                Email
              </label>
              <div className="relative">
                <i className="fa-regular fa-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'rgba(100,116,139,0.8)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@irtiwaa.tn"
                  required
                  autoFocus
                  style={{
                    background:     'rgba(255,255,255,0.05) !important',
                    border:         '1px solid rgba(255,255,255,0.10) !important',
                    borderRadius:   '12px',
                    color:          '#f1f5f9 !important',
                    paddingLeft:    '2.5rem',
                    transition:     'border-color 0.2s, box-shadow 0.2s',
                  }}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: 'rgba(148,163,184,0.7)' }}>
                Mot de passe
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'rgba(100,116,139,0.8)' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    background:     'rgba(255,255,255,0.05) !important',
                    border:         '1px solid rgba(255,255,255,0.10) !important',
                    borderRadius:   '12px',
                    color:          '#f1f5f9 !important',
                    paddingLeft:    '2.5rem',
                    paddingRight:   '2.75rem',
                  }}
                  className="glass-input"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'rgba(100,116,139,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <i className={`fa-solid ${showPwd ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 font-semibold text-sm mt-2"
              style={{
                background:    loading
                  ? 'rgba(13,148,136,0.5)'
                  : 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)',
                color:         '#fff',
                border:        'none',
                borderRadius:  '12px',
                padding:       '0.8rem 1.25rem',
                cursor:        loading ? 'not-allowed' : 'pointer',
                boxShadow:     loading ? 'none' : '0 4px 20px rgba(13,148,136,0.4)',
                transition:    'all 0.2s',
                fontSize:      '0.9rem',
                letterSpacing: '0.01em',
              }}>
              {loading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Connexion en cours…</>
                : <><i className="fa-solid fa-right-to-bracket" /> Accéder à la plateforme</>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs" style={{ color: 'rgba(100,116,139,0.7)' }}>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-warehouse text-teal-600" style={{ fontSize: 9 }} />
                Gestion des stocks
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-file-invoice text-blue-500" style={{ fontSize: 9 }} />
                Facturation & crédit
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-truck-fast text-violet-500" style={{ fontSize: 9 }} />
                Tournées commerciales
              </span>
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-chart-line text-emerald-500" style={{ fontSize: 9 }} />
                Rapports financiers
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5 flex items-center justify-center gap-2">
          <span className="text-xs" style={{ color: 'rgba(71,85,105,0.8)' }}>
            El Irtiwaa · Société de distribution de boissons
          </span>
          <span className="w-1 h-1 rounded-full bg-slate-700" />
          <span className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              color:      'rgba(13,148,136,0.9)',
              background: 'rgba(13,148,136,0.08)',
              border:     '1px solid rgba(13,148,136,0.15)',
            }}>
            v{APP_VERSION}
          </span>
        </div>
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes orbFloat {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .glass-input {
          width: 100%;
          padding-top: 0.625rem;
          padding-bottom: 0.625rem;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          outline: none;
        }
        .glass-input:focus {
          border-color: rgba(13,148,136,0.6) !important;
          box-shadow: 0 0 0 3px rgba(13,148,136,0.15) !important;
        }
        .glass-input::placeholder {
          color: rgba(100,116,139,0.5) !important;
        }
      `}</style>
    </div>
  )
}

