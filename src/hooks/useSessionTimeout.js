import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function useSessionTimeout() {
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove']

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    }, TIMEOUT_MS)
  }

  useEffect(() => {
    // Start timer on mount
    resetTimer()

    // Listen for user activity
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }))

    // Also reset on auth state changes (e.g. token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') resetTimer()
      if (event === 'TOKEN_REFRESHED') resetTimer()
      if (event === 'SIGNED_OUT') {
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(event => window.removeEventListener(event, resetTimer))
      listener.subscription.unsubscribe()
    }
  }, [])
}
