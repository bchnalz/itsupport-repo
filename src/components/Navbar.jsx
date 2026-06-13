import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { HardDrive, CheckCircle2, Menu, X } from 'lucide-react'

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

  const [mobileOpen, setMobileOpen] = useState(false)

  if (!session) return null

  const navLinks = (
    <>
      <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
        <Link to="/">Home</Link>
      </Button>
      <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
        <Link to="/upload">Upload</Link>
      </Button>
      {role === 'admin' && (
        <Button variant="ghost" size="sm" asChild onClick={() => setMobileOpen(false)}>
          <Link to="/admin">Admin</Link>
        </Button>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-1 px-3 sm:px-6">
        <div className="flex items-center gap-1 font-semibold text-sm mr-2 sm:mr-6 shrink-0">
          <HardDrive className="h-4 w-4" />
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1 text-sm">
          {navLinks}
        </nav>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden ml-1 h-8 w-8 p-0"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <div className="fixed top-0 left-0 bottom-0 w-64 bg-background border-r shadow-xl flex flex-col pt-4 animate-in slide-in-from-left">
              <div className="flex items-center justify-between px-4 pb-3 border-b">
                <span className="text-sm font-semibold">Menu</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-col gap-1 p-3">
                {navLinks}
              </nav>
              <div className="mt-auto border-t p-3 space-y-2">
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleConnectDrive}>
                  <HardDrive className="mr-1 h-3 w-3" />
                  {driveConnected ? 'Drive Connected' : 'Connect Drive'}
                </Button>
                <Separator className="my-1" />
                <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Right section — desktop */}
        <div className="ml-auto hidden sm:flex items-center gap-2 shrink-0">
          {driveConnected ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Drive
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={handleConnectDrive} className="text-xs h-8 px-2.5">
              <HardDrive className="mr-1 h-3 w-3" />
              Drive
            </Button>
          )}
          <span className="text-xs text-muted-foreground hidden md:inline max-w-[120px] truncate">
            {session.user.email}
          </span>
          <Separator orientation="vertical" className="h-4 hidden md:block" />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs h-8">
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
