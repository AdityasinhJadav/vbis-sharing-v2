import { createContext, useEffect, useMemo, useState, useContext } from 'react'
import { login as apiLogin, signup as apiSignup, verifyToken } from '../api'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext({
  currentUser: null,
  login: async () => { },
  signup: async () => { },
  logout: () => { }
})

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on mount and verify it
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      
      if (token && userStr) {
        try {
          // Verify token is still valid
          const verification = await verifyToken(token)
          if (verification && verification.valid) {
            // Use verified user data from backend (includes latest username)
            const verifiedUser = verification.user || JSON.parse(userStr)
            // Update stored user with latest data
            localStorage.setItem('user', JSON.stringify(verifiedUser))
            setCurrentUser(verifiedUser)
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            setCurrentUser(null)
          }
        } catch (e) {
          console.error('Failed to verify token', e)
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setCurrentUser(null)
        }
      }
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  const login = async (email, password) => {
    const data = await apiLogin({ email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setCurrentUser(data.user)
    return data.user
  }

  const signup = async (email, password, role, username) => {
    const data = await apiSignup({ email, password, role, username })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setCurrentUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setCurrentUser(null)
  }

  const value = useMemo(() => ({
    currentUser,
    login,
    signup,
    logout
  }), [currentUser])

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}


