import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock, FaGoogle, FaEye, FaEyeSlash, FaUserTag, FaArrowRight, FaUsers, FaCrown } from "react-icons/fa";
import { useTheme } from "../theme/ThemeContext";
import { setRoleInStorage, logRoleInfo } from '../utils/roleUtils';

export default function Signup() {
  const { isLight } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("attendee");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store user role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: role,
        createdAt: new Date()
      });
      
      setRoleInStorage(role);
      logRoleInfo('Signup - Email', role, user.email);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Store user role in Firestore (use the selected role from form)
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: role, // Use the role state from the form
        createdAt: new Date()
      }, { merge: true });
      
      setRoleInStorage(role);
      logRoleInfo('Signup - Google', role, user.email);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className={`h-screen relative overflow-hidden pt-10 ${
      isLight
        ? 'bg-gradient-to-br from-white via-slate-50 to-white text-slate-800'
        : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200'
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse ${isLight ? 'bg-sky-400/20' : 'bg-sky-400/10'}`}></div>
        <div className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 ${isLight ? 'bg-purple-400/20' : 'bg-purple-400/10'}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl animate-pulse delay-2000 ${isLight ? 'bg-emerald-400/10' : 'bg-emerald-400/5'}`}></div>
      </div>

      <div className="relative z-10 h-full flex items-center justify-center px-4 sm:px-6 lg:px-8">
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
            className={`backdrop-blur-sm p-7 rounded-2xl border shadow-2xl w-full max-w-md mx-auto ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            {/* Header */}
            <div className="text-center mb-4">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className={`text-2xl font-bold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}
              >
                Create Account
              </motion.h2>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm backdrop-blur-sm mb-3"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  className={`block w-full pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  className={`block w-full pl-11 pr-11 py-3.5 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${isLight ? 'text-slate-500 hover:text-sky-600' : 'text-slate-400 hover:text-sky-400'}`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Confirm Password Field */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className={`h-5 w-5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className={`block w-full pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all duration-300 backdrop-blur-sm ${
                    isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-500' : 'bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400'
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-3">
                <label className={`block text-sm font-medium mb-2 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  Choose your role
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Attendee Option */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer rounded-xl border-2 p-3.5 transition-all duration-300 ${
                      role === 'attendee'
                        ? (isLight ? 'border-sky-500 bg-sky-50 shadow-lg shadow-sky-200' : 'border-sky-400 bg-sky-400/10 shadow-lg shadow-sky-400/20')
                        : (isLight ? 'border-slate-300 bg-white hover:bg-slate-50' : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50')
                    }`}
                    onClick={() => setRole('attendee')}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`flex-shrink-0 p-1.5 rounded-lg ${
                        role === 'attendee' ? (isLight ? 'bg-sky-100 text-sky-600' : 'bg-sky-400/20 text-sky-400') : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-600/50 text-slate-400')
                      }`}>
                        <FaUsers className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          role === 'attendee' ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-slate-700' : 'text-slate-300')
                        }`}>
                          Attendee
                        </h3>
                        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          Join events and view shared photos
                        </p>
                      </div>
                      <div className={`flex-shrink-0 w-4.5 h-4.5 rounded-full border-2 ${
                        role === 'attendee'
                          ? (isLight ? 'border-sky-500 bg-sky-500' : 'border-sky-400 bg-sky-400')
                          : (isLight ? 'border-slate-400 bg-transparent' : 'border-slate-500 bg-transparent')
                      }`}>
                        {role === 'attendee' && (
                          <div className={`w-full h-full rounded-full transform scale-50 ${isLight ? 'bg-white' : 'bg-white'}`}></div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Organizer Option */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative cursor-pointer rounded-xl border-2 p-3.5 transition-all duration-300 ${
                      role === 'organizer'
                        ? (isLight ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-200' : 'border-purple-400 bg-purple-400/10 shadow-lg shadow-purple-400/20')
                        : (isLight ? 'border-slate-300 bg-white hover:bg-slate-50' : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500 hover:bg-slate-700/50')
                    }`}
                    onClick={() => setRole('organizer')}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`flex-shrink-0 p-1.5 rounded-lg ${
                        role === 'organizer' ? (isLight ? 'bg-purple-100 text-purple-600' : 'bg-purple-400/20 text-purple-400') : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-600/50 text-slate-400')
                      }`}>
                        <FaCrown className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${
                          role === 'organizer' ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-slate-700' : 'text-slate-300')
                        }`}>
                          Organizer
                        </h3>
                        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          Create events and manage photo sharing
                        </p>
                      </div>
                      <div className={`flex-shrink-0 w-4.5 h-4.5 rounded-full border-2 ${
                        role === 'organizer'
                          ? (isLight ? 'border-purple-500 bg-purple-500' : 'border-purple-400 bg-purple-400')
                          : (isLight ? 'border-slate-400 bg-transparent' : 'border-slate-500 bg-transparent')
                      }`}>
                        {role === 'organizer' && (
                          <div className={`w-full h-full rounded-full transform scale-50 ${isLight ? 'bg-white' : 'bg-white'}`}></div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`w-full flex justify-center items-center gap-2.5 py-3.5 px-5 font-bold rounded-xl shadow-2xl focus:outline-none focus:ring-2 transition-all duration-300 group ${
                  isLight
                    ? 'bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-white'
                    : 'bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:shadow-sky-400/25 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800'
                }`}
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
              </motion.button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isLight ? 'border-slate-200' : 'border-slate-600'}`}></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className={`px-3 backdrop-blur-sm ${isLight ? 'bg-white text-slate-500' : 'bg-slate-800/50 text-slate-400'}`}>Or continue with</span>
                </div>
              </div>

              {/* Social Sign Up */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className={`w-full flex items-center justify-center py-3.5 px-5 rounded-xl font-medium transition-all duration-300 backdrop-blur-sm ${
                  isLight ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' : 'border border-slate-600/50 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50 hover:border-slate-500'
                }`}
                onClick={handleGoogleSignup}
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
                {googleLoading ? 'Signing up...' : 'Sign up with Google'}
              </motion.button>

              {/* Login link */}
              <p className={`text-center ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Already have an account?{' '}
                <Link to="/login" className={`font-semibold transition-colors ${isLight ? 'text-sky-600 hover:text-sky-700' : 'text-sky-400 hover:text-sky-300'}`}>
                  Sign in
                </Link>
              </p>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
