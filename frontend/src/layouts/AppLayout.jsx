import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function AppLayout({ children }) {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isAuth = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/setup-username'

  return (
    <div className="min-h-screen bg-slate-900">
      {!isHome && !isAuth && <Navbar />}
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


