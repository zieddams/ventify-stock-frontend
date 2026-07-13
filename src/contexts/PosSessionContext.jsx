import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const PosSessionContext = createContext(null)

export function PosSessionProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const response = await api.get('/pos-sessions/today')
    setSession(response.data)
    return response.data
  }

  useEffect(() => {
    let cancelled = false

    api.get('/pos-sessions/today')
      .then((response) => {
        if (!cancelled) {
          setSession(response.data)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openSession = async (openingFloat) => {
    const response = await api.post('/pos-sessions', { opening_float: openingFloat })
    setSession(response.data)
    return response.data
  }

  const closeSession = async (closingCount) => {
    const response = await api.post(`/pos-sessions/${session.id}/close`, { closing_count: closingCount })
    setSession(response.data)
    return response.data
  }

  return (
    <PosSessionContext.Provider
      value={{
        session,
        loading,
        isOpen: session?.status === 'open',
        refresh,
        openSession,
        closeSession,
      }}
    >
      {children}
    </PosSessionContext.Provider>
  )
}

export const usePosSession = () => useContext(PosSessionContext)
