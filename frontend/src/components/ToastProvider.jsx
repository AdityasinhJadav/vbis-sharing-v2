import React, { createContext, useContext, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes, FaSpinner } from 'react-icons/fa';

const ToastContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', options = {}) => {
    const {
      duration = 5000,
      persistent = false,
      action = null,
      progress = null
    } = options;

    const id = Date.now() + Math.random();
    const toast = { 
      id, 
      message, 
      type, 
      duration, 
      persistent,
      action,
      progress,
      timestamp: Date.now()
    };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0 && !persistent) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const updateToast = (id, updates) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  };

  const success = (message, options) => addToast(message, 'success', options);
  const error = (message, options) => addToast(message, 'error', options);
  const warning = (message, options) => addToast(message, 'warning', options);
  const info = (message, options) => addToast(message, 'info', options);
  
  // Enhanced toast methods
  const loading = (message, id) => {
    if (id) {
      updateToast(id, { type: 'loading', message });
    } else {
      return addToast(message, 'loading', { persistent: true });
    }
  };

  const progress = (message, progressValue, id) => {
    if (id) {
      updateToast(id, { message, progress: progressValue });
    } else {
      return addToast(message, 'info', { progress: progressValue, persistent: true });
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <FaCheckCircle className="h-5 w-5" />;
      case 'error': return <FaExclamationTriangle className="h-5 w-5" />;
      case 'warning': return <FaExclamationTriangle className="h-5 w-5" />;
      case 'loading': return <FaSpinner className="h-5 w-5 animate-spin" />;
      default: return <FaInfoCircle className="h-5 w-5" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500 border-emerald-600 text-white';
      case 'error':
        return 'bg-rose-500 border-rose-600 text-white';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600 text-white';
      case 'loading':
        return 'bg-sky-500 border-sky-600 text-white';
      default:
        return 'bg-sky-500 border-sky-600 text-white';
    }
  };

  return (
    <ToastContext.Provider value={{ 
      success, 
      error, 
      warning, 
      info, 
      loading,
      progress,
      removeToast,
      updateToast 
    }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <Motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
              className={`
                flex flex-col gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
                max-w-sm min-w-[300px]
                ${getStyles(toast.type)}
              `}
            >
              <div className="flex items-center gap-3">
                {getIcon(toast.type)}
                <span className="flex-1 text-sm font-medium">{toast.message}</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
              
              {/* Progress bar */}
              {toast.progress !== null && (
                <div className="w-full bg-white/20 rounded-full h-1.5">
                  <Motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${toast.progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="bg-white h-1.5 rounded-full"
                  />
                </div>
              )}
              
              {/* Action button */}
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </Motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
