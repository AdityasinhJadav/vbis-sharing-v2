import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUsers, FaCrown, FaUser, FaArrowRight, FaCheck } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const AuthSignup = () => {
  const { signup } = useAuth();
  const { isLight } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('attendee');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usernameValid, setUsernameValid] = useState(false);

  // Validate username in real-time
  useEffect(() => {
    if (username.trim().length === 0) {
      setUsernameValid(false);
      return;
    }
    if (username.trim().length >= 3 && username.trim().length <= 30 && /^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setUsernameValid(true);
    } else {
      setUsernameValid(false);
    }
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters long');
      return;
    }

    if (username && username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (username && !/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    setLoading(true);
    try {
      const user = await signup(email, password, role, username.trim() || undefined);
      // Check if user has username, if not redirect to setup
      if (!user.username) {
        navigate('/setup-username');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen h-screen relative overflow-hidden overflow-x-hidden ${isLight
      ? 'bg-gradient-to-br from-white via-slate-50 to-white text-slate-800'
      : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200'
      }`}>
      <div className="absolute inset-0">
        <div className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse ${isLight ? 'bg-sky-400/20' : 'bg-sky-400/10'}`}></div>
        <div className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 ${isLight ? 'bg-purple-400/20' : 'bg-purple-400/10'}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl animate-pulse delay-2000 ${isLight ? 'bg-sky-400/10' : 'bg-sky-400/5'}`}></div>
      </div>

      <div className="relative z-10 min-h-screen h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-y-auto py-8">
        <Motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md mx-auto my-auto"
        >
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className={`backdrop-blur-sm p-8 rounded-2xl border shadow-2xl w-full max-w-md mx-auto ${isLight ? 'bg-white border-slate-200' : 'bg-slate-800/50 border-slate-700/50'
              }`}
          >
            <div className="text-center mb-8">
              <Motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className={`text-3xl font-bold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}
              >
                Create Account
              </Motion.h2>
              <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Join FaceMatch to organize or enjoy event photos
              </p>
            </div>

            {error && (
              <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm backdrop-blur-sm mb-6"
              >
                {error}
              </Motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`block w-full pl-12 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500'
                    : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                    }`}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type="text"
                  placeholder="Username (optional)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className={`block w-full pl-12 pr-12 py-4 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    username && (usernameValid ? 'border-emerald-500' : 'border-red-500')
                  } ${isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500'
                    : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                    }`}
                />
                {username && usernameValid && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <FaCheck className="h-5 w-5 text-emerald-400" />
                  </div>
                )}
                {username && (
                  <p className={`text-xs mt-1.5 ml-1 ${usernameValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {usernameValid 
                      ? '✓ Valid username' 
                      : username.trim().length > 0 
                        ? '3-30 chars, letters, numbers, _, - only'
                        : 'Optional: 3-30 characters'
                    }
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`block w-full pl-12 pr-12 py-4 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500'
                    : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                    }`}
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

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`block w-full pl-12 pr-12 py-4 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    confirmPassword && password === confirmPassword ? 'border-emerald-500' : confirmPassword ? 'border-red-500' : ''
                  } ${isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500'
                    : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                    }`}
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 right-0 pr-4 flex items-center transition-colors ${isLight ? 'text-slate-500 hover:text-sky-600' : 'text-slate-400 hover:text-sky-400'}`}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
                {confirmPassword && (
                  <p className={`text-xs mt-1.5 ml-1 ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                    {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-3 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Choose your role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRole('attendee')}
                    className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                      role === 'attendee'
                        ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                        : isLight 
                          ? 'border-slate-300 bg-white hover:border-slate-400' 
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <FaUsers className={role === 'attendee' ? 'text-sky-400' : isLight ? 'text-slate-500' : 'text-slate-400'} />
                    <span className={`font-medium ${role === 'attendee' ? 'text-sky-400' : isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Attendee
                    </span>
                  </Motion.button>
                  <Motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRole('organizer')}
                    className={`flex items-center justify-center gap-3 rounded-xl border px-4 py-3.5 transition-all duration-200 ${
                      role === 'organizer'
                        ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                        : isLight 
                          ? 'border-slate-300 bg-white hover:border-slate-400' 
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <FaCrown className={role === 'organizer' ? 'text-purple-500' : isLight ? 'text-slate-500' : 'text-slate-400'} />
                    <span className={`font-medium ${role === 'organizer' ? 'text-purple-500' : isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      Organizer
                    </span>
                  </Motion.button>
                </div>
              </div>

              <Motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full flex justify-center items-center gap-3 py-4 px-6 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-bold rounded-xl shadow-2xl hover:shadow-sky-400/25 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-300 group"
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Create Account
                    <FaArrowRight className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </Motion.button>

              <p className={`text-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Already have an account?{' '}
                <Link to="/login" className={`font-semibold transition-colors ${isLight ? 'text-sky-600 hover:text-sky-700' : 'text-sky-400 hover:text-sky-300'}`}>
                  Sign in
                </Link>
              </p>
            </form>
          </Motion.div>
        </Motion.div>
      </div>
    </div>
  );
};

export default AuthSignup;

