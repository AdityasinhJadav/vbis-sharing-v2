import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Helpful runtime check so misconfigured envs are obvious
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
  // eslint-disable-next-line no-console
  console.error('[Firebase] Missing VITE_FIREBASE_* envs. Check apiKey, authDomain, projectId, appId')
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// Use initializeFirestore with long polling for environments that block WebChannel
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  // Force long-polling in case the network blocks streaming transports
  experimentalForceLongPolling: true,
  useFetchStreams: false,
})
export const googleProvider = new GoogleAuthProvider()


