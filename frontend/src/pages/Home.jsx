import React from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../theme/ThemeContext";

export default function Home() {
  const { isLight, toggleTheme } = useTheme();

  const features = [
    {
      title: "Secure Face Recognition",
      description: "Advanced AI-powered facial recognition ensures only authorized users can access your precious memories",
      gradient: "from-sky-400 to-blue-500"
    },
    {
      title: "Smart Photo Sharing",
      description: "Effortlessly share photos with friends and family using intelligent facial verification technology",
      gradient: "from-emerald-400 to-teal-500"
    },
    {
      title: "Lightning Fast",
      description: "Get instant access to your photos with our cutting-edge matching algorithms",
      gradient: "from-purple-400 to-pink-500"
    }
  ];


  return (
    <div className={`min-h-screen relative overflow-hidden ${
      isLight
        ? "bg-gradient-to-br from-white via-slate-50 to-white text-slate-800"
        : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200"
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className={`absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl animate-pulse ${isLight ? "bg-sky-400/20" : "bg-sky-400/10"}`}></div>
        <div className={`absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 ${isLight ? "bg-purple-400/20" : "bg-purple-400/10"}`}></div>
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl animate-pulse delay-2000 ${isLight ? "bg-emerald-400/10" : "bg-emerald-400/5"}`}></div>
      </div>

      {/* Hero Section */}
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-20">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full border transition-colors duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 ${
              isLight
                ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                : "bg-slate-800/60 text-slate-200 border-slate-700 hover:bg-slate-700/60"
            }`}
            aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
            title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          >
            {isLight ? <FaMoon /> : <FaSun />}
          </button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center"
        >
          
          <h1 className={`text-7xl md:text-8xl font-bold mb-8 leading-tight ${
            isLight
              ? "text-slate-900"
              : "bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-purple-400 to-emerald-400"
          }`}>
            Face
            <span className={`${isLight ? "text-sky-700" : "text-white"}`}>Match</span>
          </h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className={`text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}
          >
            Revolutionary AI-powered photo sharing that recognizes faces and 
            <span className={`${isLight ? "text-sky-600" : "text-sky-400"} font-semibold`}> protects your memories</span> like never before.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-16"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group"
            >
              <Link
                to="/signup"
                className={`px-10 py-4 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 ${
                  isLight
                    ? "bg-sky-500 hover:bg-sky-600 text-white"
                    : "bg-gradient-to-r from-sky-400 to-blue-500 text-white hover:shadow-sky-400/25"
                }`}
              >
                Sign Up
              </Link>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to="/login"
                className={`px-10 py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 border ${
                  isLight
                    ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
                    : "bg-slate-800/50 backdrop-blur-sm text-slate-200 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500"
                }`}
              >
                Login
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <div className="mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${isLight ? "text-slate-900" : "text-white"}`}>
              Why Choose <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-purple-400">FaceMatch</span>?
            </h2>
            <p className={`text-xl max-w-2xl mx-auto ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Experience the next generation of secure photo sharing with cutting-edge technology
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 + index * 0.2 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative"
              >
                <div className={`${
                  isLight
                    ? "bg-white p-8 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all duration-300 h-full shadow-sm"
                    : "bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 h-full"
                }`}>
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                  
                  <div className="relative z-10">
                    
                    <h3 className={`text-2xl font-bold mb-4 text-center transition-colors duration-300 ${isLight ? "text-slate-900 group-hover:text-sky-700" : "text-white group-hover:text-sky-300"}`}>
                      {feature.title}
                    </h3>
                    
                    <p className={`text-center leading-relaxed transition-colors duration-300 ${isLight ? "text-slate-600 group-hover:text-slate-700" : "text-slate-400 group-hover:text-slate-300"}`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.8 }}
          className="mt-20 text-center"
        >
          <div className={`rounded-3xl p-12 max-w-4xl mx-auto border ${isLight ? "bg-white border-slate-200" : "bg-gradient-to-r from-sky-400/10 to-purple-400/10 backdrop-blur-sm border-sky-400/20"}`}>
            <h3 className={`text-3xl md:text-4xl font-bold mb-6 ${isLight ? "text-slate-900" : "text-white"}`}>
              Ready to Get Started?
            </h3>
            <p className={`text-xl mb-8 max-w-2xl mx-auto ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              Join FaceMatch and experience secure photo sharing with facial recognition.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                to="/signup"
                className={`px-12 py-4 rounded-xl font-bold text-xl shadow-2xl transition-all duration-300 ${
                  isLight
                    ? "bg-sky-500 hover:bg-sky-600 text-white"
                    : "bg-gradient-to-r from-sky-400 to-purple-500 text-white hover:shadow-sky-400/30"
                }`}
              >
                Sign Up Now
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


