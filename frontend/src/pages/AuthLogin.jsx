import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaGoogle, FaEye, FaEyeSlash, FaArrowRight } from 'react-icons/fa';
import { useTheme } from '../theme/ThemeContext';

const AuthLogin = () => {
  const { isLight } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const persistLocally = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch (e) {
      // ignore
    }
  };

  const upsertUserRoleBestEffort = async (user, preferredRole = 'attendee') => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      let userRole = preferredRole;
      if (userDoc.exists()) {
        userRole = userDoc.data().role || preferredRole;
      } else {
        await setDoc(userRef, { email: user.email || '', role: userRole, createdAt: new Date() }, { merge: true });
      }
      localStorage.setItem('role', userRole);
    } catch (_) {
      localStorage.setItem('role', preferredRole);
    }
  };

  const onAuthSuccess = async (user) => {
    navigate('/dashboard');
    upsertUserRoleBestEffort(user).catch(() => {});
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await persistLocally();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await onAuthSuccess(user);
    } catch (error) {
      setError(error.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await persistLocally();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await onAuthSuccess(user);
    } catch (err) {
      const code = err && err.code ? String(err.code) : '';
      if (code.includes('popup-blocked') || code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request')) {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirErr) {
          setError(String(redirErr.message || redirErr).replace('Firebase: ', ''));
        }
      } else {
        setError(String(err.message || err).replace('Firebase: ', ''));
      }
      setGoogleLoading(false);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result) return;
        const user = result.user;
        await onAuthSuccess(user);
      } catch (err) {
        if (isMounted) setError(String(err.message || err).replace('Firebase: ', ''));
      } finally {
        if (isMounted) setGoogleLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [navigate]);

  return (
    <div className={`min-h-screen h-screen relative overflow-hidden overflow-x-hidden ${
      isLight
        ? 'bg-gradient-to-br from-white via-slate-50 to-white text-slate-800'
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200'
    }`}>
      <div className="absolute inset-0">
        <div className={`${`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse`} ${isLight ? 'bg-sky-400/20' : 'bg-sky-400/10'}`}></div>
        <div className={`${`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000`} ${isLight ? 'bg-purple-400/20' : 'bg-purple-400/10'}`}></div>
        <div className={`${`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl animate-pulse delay-2000`} ${isLight ? 'bg-emerald-400/10' : 'bg-emerald-400/5'}`}></div>
      </div>

      <div className="relative z-10 min-h-screen h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`backdrop-blur-sm p-8 rounded-2xl border shadow-2xl w-full max-w-md mx-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className={`text-3xl font-bold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}
              >
                Welcome Back
              </motion.h2>
              <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Sign in to access your secure photo sharing account
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm backdrop-blur-sm mb-6"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  className={`block w-full pl-12 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500'
                      : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className={`block w-full pl-12 pr-12 py-4 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500'
                      : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${isLight ? 'text-slate-500 hover:text-sky-600' : 'text-slate-400 hover:text-sky-400'}`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className={`h-4 w-4 text-sky-400 focus:ring-sky-400 rounded ${isLight ? 'border-slate-300 bg-white' : 'border-slate-600 bg-slate-700'}`}
                  />
                  <label className={`ml-3 block text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Remember me</label>
                </div>
                <div className="text-sm">
                  <a href="#" className={`font-medium transition-colors ${isLight ? 'text-sky-600 hover:text-sky-700' : 'text-sky-400 hover:text-sky-300'}`}>
                    Forgot password?
                  </a>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full flex justify-center items-center gap-3 py-4 px-6 bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-sky-400/25 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-300 group"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Sign In
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </motion.button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-slate-600'}`}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-4 backdrop-blur-sm ${isLight ? 'bg-white text-slate-500' : 'bg-slate-800/50 text-slate-400'}`}>Or continue with</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className={`w-full flex items-center justify-center py-4 px-6 rounded-xl font-medium transition-all duration-300 backdrop-blur-sm ${
                  isLight
                    ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border border-slate-600/50 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500'
                }`}
                onClick={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <svg className="animate-spin h-5 w-5 text-red-400 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <FaGoogle className="h-5 w-5 text-red-400 mr-3" />
                )}
                {googleLoading ? 'Signing in...' : 'Sign in with Google'}
              </motion.button>

              <p className={`text-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Don't have an account{' '}
                <Link to="/signup" className={`font-semibold transition-colors ${isLight ? 'text-sky-600 hover:text-sky-700' : 'text-sky-400 hover:text-sky-300'}`}>
                  Sign up
                </Link>
              </p>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLogin;


