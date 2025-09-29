import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { auth } from '../firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'

export default function AppLayout({ children }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isAuth = location.pathname === '/login' || location.pathname === '/signup'
  const [user, setUser] = useState(null)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser)
    return () => unsub()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900">
      {!isHome && (
        <Navbar user={user} onLogout={() => signOut(auth)} />
      )}
      <main className={
        isHome
          ? ''
          : (isAuth
              ? ''
              : ((location.pathname.startsWith('/photos') || location.pathname.startsWith('/dashboard'))
                  ? 'w-full p-2' 
                  : 'max-w-5xl mx-auto px-4 py-8'))
      }>
        {children}
      </main>
    </div>
  )
}


