import React from 'react';
import { motion } from 'framer-motion';
import { FaSpinner, FaCamera, FaUpload, FaSearch } from 'react-icons/fa';

const LoadingSpinner = ({ 
  type = 'default', 
  message = 'Loading...', 
  size = 'medium',
  showProgress = false,
  progress = 0 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'camera':
        return <FaCamera className="h-6 w-6" />;
      case 'upload':
        return <FaUpload className="h-6 w-6" />;
      case 'search':
        return <FaSearch className="h-6 w-6" />;
      default:
        return <FaSpinner className="h-6 w-6 animate-spin" />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-4 w-4';
      case 'large':
        return 'h-8 w-8';
      default:
        return 'h-6 w-6';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center p-8"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={`${getSizeClasses()} text-sky-400 mb-4`}
      >
        {getIcon()}
      </motion.div>
      
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-slate-300 text-center"
      >
        {message}
      </motion.p>

      {showProgress && (
        <div className="w-48 mt-4">
          <div className="w-full bg-slate-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="bg-sky-400 h-2 rounded-full"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1 text-center">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default LoadingSpinner;
