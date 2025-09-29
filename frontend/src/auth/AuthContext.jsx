import { createContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'

export const AuthContext = createContext({ currentUser: null })

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setCurrentUser(user))
    return () => unsub()
  }, [])
  const value = useMemo(() => ({ currentUser }), [currentUser])
  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}


