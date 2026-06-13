import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, HardDrive, LogOut } from 'lucide-react'

export default function Navbar() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [driveConnected, setDriveConnected] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) { fetchRole(session.user.id); checkDrive(session.user.id) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) { fetchRole(session.user.id); checkDrive(session.user.id) }
      else { setRole(null); setDriveConnected(false) }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const fetchRole = async (userId) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
    setRole(data?.role || null)
  }

  const checkDrive = async (userId) => {
    const { data } = await supabase.from('user_tokens').select('user_id').eq('user_id', userId).single()
    setDriveConnected(!!data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleConnectDrive = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      window.open(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-auth?token=${session.access_token}`,
        '_blank'
      )
    }
  }

  if (!session) return null

  return (
    <>
      {/* Top bar — centered nav links only */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex items-center justify-center gap-1 h-12 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/upload">Upload</Link>
          </Button>
          {role === 'admin' && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Logout
          </Button>
        </nav>
      </header>

      {/* Bottom bar — drive status + user info */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col items-center py-2.5 px-4 text-xs text-muted-foreground gap-0.5">
          {driveConnected ? (
            <span className="text-emerald-600 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Drive connected
            </span>
          ) : (
            <button
              onClick={handleConnectDrive}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <HardDrive className="h-3.5 w-3.5" /> Connect Drive
            </button>
          )}
          <span className="truncate max-w-[90vw]">{session.user.email}</span>
        </div>
      </div>
    </>
  )
}
