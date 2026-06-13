import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { DownloadContext } from './lib/downloadContext'
import Login from './pages/Login'
import Home from './pages/Home'
import Upload from './pages/Upload'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'
import DownloadDrawer, { useDownloadManager } from './components/DownloadDrawer'

function ProtectedRoute({ children, adminOnly = false }) {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      setSession(session)
      if (session) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        if (!cancelled) setRole(data?.role || null)
      }
      if (!cancelled) setLoading(false)
    }

    checkAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => setRole(data?.role || null))
      } else {
        setRole(null)
      }
    })

    return () => { cancelled = true; listener.subscription.unsubscribe() }
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">Loading...</p></div>
  if (!session) return <Navigate to="/login" replace />
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const dm = useDownloadManager()

  return (
    <DownloadContext.Provider value={dm}>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          </Routes>
        </main>
        <DownloadDrawer manager={dm} />
      </div>
    </DownloadContext.Provider>
  )
}
