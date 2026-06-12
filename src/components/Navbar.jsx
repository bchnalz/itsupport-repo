import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Navbar() {
  const [session, setSession] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (!session) return null

  return (
    <nav>
      <div>
        <Link to="/">Home</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/admin">Admin</Link>
      </div>
      <div>
        <span style={{ marginRight: '1rem', fontSize: '13px', opacity: 0.8 }}>
          {session.user.email}
        </span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
