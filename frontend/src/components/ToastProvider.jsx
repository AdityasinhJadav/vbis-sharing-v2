import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const success = (message, duration) => addToast(message, 'success', duration);
  const error = (message, duration) => addToast(message, 'error', duration);
  const warning = (message, duration) => addToast(message, 'warning', duration);
  const info = (message, duration) => addToast(message, 'info', duration);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <FaCheckCircle className="h-5 w-5" />;
      case 'error': return <FaExclamationTriangle className="h-5 w-5" />;
      case 'warning': return <FaExclamationTriangle className="h-5 w-5" />;
      default: return <FaInfoCircle className="h-5 w-5" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600 text-white';
      case 'error':
        return 'bg-red-500 border-red-600 text-white';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600 text-white';
      default:
        return 'bg-blue-500 border-blue-600 text-white';
    }
  };

  return (
    <ToastContext.Provider value={{ success, error, warning, info, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
              className={`
                flex items-center gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
                max-w-sm min-w-[300px]
                ${getStyles(toast.type)}
              `}
            >
              {getIcon(toast.type)}
              <span className="flex-1 text-sm font-medium">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
