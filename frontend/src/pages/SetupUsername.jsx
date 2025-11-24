import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FaUser, FaCheck, FaTimes, FaArrowRight } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { updateUsername } from '../api';

const SetupUsername = () => {
  const { currentUser } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // If user already has username, redirect to dashboard
    if (currentUser?.username) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    // Validate username as user types
    if (username.trim().length === 0) {
      setIsValid(false);
      return;
    }

    if (username.trim().length < 3) {
      setIsValid(false);
      return;
    }

    if (username.trim().length > 30) {
      setIsValid(false);
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setIsValid(false);
      return;
    }

    setIsValid(true);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    setError('');

    try {
      const data = await updateUsername(username.trim());
      
      // Update stored user data and token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className={`min-h-screen h-screen relative overflow-hidden ${isLight
      ? 'bg-gradient-to-br from-white via-slate-50 to-white text-slate-800'
      : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200'
      }`}>
      <div className="absolute inset-0">
        <div className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse ${isLight ? 'bg-sky-400/20' : 'bg-sky-400/10'}`}></div>
        <div className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 ${isLight ? 'bg-purple-400/20' : 'bg-purple-400/10'}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl animate-pulse delay-2000 ${isLight ? 'bg-sky-400/10' : 'bg-sky-400/5'}`}></div>
      </div>

      <div className="relative z-10 min-h-screen h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md mx-auto"
        >
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`backdrop-blur-sm p-8 rounded-2xl border shadow-2xl w-full max-w-md mx-auto ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800/50 border-slate-700/50'
              }`}
          >
            <div className="text-center mb-8">
              <Motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-500/10 mb-4"
              >
                <FaUser className="w-8 h-8 text-sky-400" />
              </Motion.div>
              <Motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className={`text-3xl font-bold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}
              >
                Choose Your Username
              </Motion.h2>
              <Motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}
              >
                Let's personalize your experience
              </Motion.p>
            </div>

            {error && (
              <Motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm backdrop-blur-sm mb-6 flex items-center gap-2"
              >
                <FaTimes className="flex-shrink-0" />
                <span>{error}</span>
              </Motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  maxLength={30}
                  autoFocus
                  className={`block w-full pl-12 pr-12 py-4 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    isValid && username.trim().length > 0
                      ? 'border-emerald-500'
                      : username.trim().length > 0
                      ? 'border-red-500'
                      : ''
                  } ${isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500'
                    : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                    }`}
                  required
                />
                {isValid && username.trim().length > 0 && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <FaCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                )}
              </div>

              <div className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <p>• 3-30 characters</p>
                <p>• Letters, numbers, underscores, and hyphens only</p>
                <p className="mt-1">• This will be displayed on your dashboard</p>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex-1 h-1 rounded-full ${isLight ? 'bg-slate-200' : 'bg-slate-700'}`}>
                  <Motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((username.trim().length / 30) * 100, 100)}%` }}
                    className={`h-full rounded-full ${
                      isValid ? 'bg-emerald-500' : username.trim().length > 0 ? 'bg-red-500' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <span className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {username.trim().length}/30
                </span>
              </div>

              <Motion.button
                whileHover={{ scale: isValid && !loading ? 1.02 : 1, y: isValid && !loading ? -2 : 0 }}
                whileTap={{ scale: isValid && !loading ? 0.98 : 1 }}
                type="submit"
                disabled={!isValid || loading}
                className="w-full flex justify-center items-center gap-3 py-4 px-6 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-sky-400/25 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Continue
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </Motion.button>
            </form>
          </Motion.div>
        </Motion.div>
      </div>
    </div>
  );
};

export default SetupUsername;

