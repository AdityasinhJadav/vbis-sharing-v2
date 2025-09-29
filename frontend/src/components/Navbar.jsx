import { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaFingerprint, FaBars, FaTimes, FaTachometerAlt, FaSignInAlt, FaUserPlus, FaSun, FaMoon, FaCamera } from 'react-icons/fa';
import { AuthContext } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { currentUser } = useContext(AuthContext);
  const { isLight, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Navigation links based on authentication status
  const navLinks = currentUser
    ? [
        { path: '/dashboard', label: 'Dashboard', icon: <FaTachometerAlt /> },
      ]
    : [
        { path: '/login', label: 'Login', icon: <FaSignInAlt /> },
        { path: '/signup', label: 'Sign Up', icon: <FaUserPlus /> },
      ];

  const isActive = (path) => location.pathname === path;

  const getButtonStyles = (isActiveVal) => {
    if (scrolled) {
      return isActiveVal
        ? 'bg-sky-400 text-white font-nunito'
        : 'text-slate-900 hover:bg-slate-200 font-nunito';
    }
    return isActiveVal
      ? 'bg-sky-400 text-white font-nunito'
      : 'text-slate-200 hover:bg-slate-800 font-nunito';
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed w-full z-50 transition-all duration-300 bg-slate-900/95 backdrop-blur-sm
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <FaCamera className="h-8 w-8 text-sky-400" />
            </motion.div>
            <span className="text-xl font-bold text-white">
              FaceMatch
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-4 py-2 rounded-lg transition-all duration-300 ${getButtonStyles(isActive(link.path))}`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className={`p-2 rounded-full border transition-colors duration-300 ${
                scrolled
                  ? (isLight ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-100')
                  : (isLight ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100' : 'bg-slate-800/60 text-slate-200 border-slate-700 hover:bg-slate-700/60')
              }`}
            >
              {isLight ? <FaMoon /> : <FaSun />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`p-2 rounded-lg transition-colors duration-300 ${
                scrolled ? 'text-slate-900 hover:bg-slate-200' : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isOpen ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={{ height: isOpen ? 'auto' : 0 }}
          className={`md:hidden overflow-hidden ${
            scrolled ? 'bg-white' : 'bg-slate-900'
          }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-300 ${getButtonStyles(isActive(link.path))}`}
                onClick={() => setIsOpen(false)}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </Link>
            ))}
            {/* Mobile theme toggle */}
            <div className="pt-2">
              <button
                onClick={() => { toggleTheme(); setIsOpen(false); }}
                aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors duration-300 ${
                  scrolled ? 'text-slate-900 hover:bg-slate-200' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isLight ? <FaMoon /> : <FaSun />}
                <span>Toggle theme</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.nav>
  );
};

export default Navbar;


