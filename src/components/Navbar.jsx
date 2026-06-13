import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { HardDrive } from 'lucide-react'

export default function Navbar() {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchRole(session.user.id)
      else setRole(null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const fetchRole = async (userId) => {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).single()
    setRole(data?.role || null)
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-6">
        <div className="flex items-center gap-1 font-semibold text-sm mr-8">
          <HardDrive className="h-4 w-4" />
          <span>itsupport-repo</span>
        </div>
        <nav className="flex items-center gap-1 text-sm">
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
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleConnectDrive} className="text-xs">
            <HardDrive className="mr-1 h-3 w-3" />
            Connect Drive
          </Button>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {session.user.email}
          </span>
          <Separator orientation="vertical" className="h-4 hidden sm:block" />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
