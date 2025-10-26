import React from 'react';
import { motion } from 'framer-motion';

const SkeletonPhotoGrid = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="aspect-square bg-slate-800 rounded-lg overflow-hidden"
        >
          <motion.div
            animate={{ 
              background: [
                'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
                'linear-gradient(90deg, #1e293b 0%, #475569 50%, #1e293b 100%)',
                'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)'
              ]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-full h-full"
          />
        </motion.div>
      ))}
    </div>
  );
};

const SkeletonCard = ({ height = 'h-32' }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${height} bg-slate-800 rounded-lg p-4`}
    >
      <motion.div
        animate={{ 
          background: [
            'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
            'linear-gradient(90deg, #1e293b 0%, #475569 50%, #1e293b 100%)',
            'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)'
          ]
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="w-full h-full rounded"
      />
    </motion.div>
  );
};

const SkeletonText = ({ lines = 3, width = 'w-full' }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className={`h-4 bg-slate-800 rounded ${width} ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        >
          <motion.div
            animate={{ 
              background: [
                'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
                'linear-gradient(90deg, #1e293b 0%, #475569 50%, #1e293b 100%)',
                'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)'
              ]
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-full h-full rounded"
          />
        </motion.div>
      ))}
    </div>
  );
};

const SkeletonButton = ({ width = 'w-24' }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`h-10 ${width} bg-slate-800 rounded-lg`}
    >
      <motion.div
        animate={{ 
          background: [
            'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
            'linear-gradient(90deg, #1e293b 0%, #475569 50%, #1e293b 100%)',
            'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)'
          ]
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="w-full h-full rounded-lg"
      />
    </motion.div>
  );
};

export { 
  SkeletonPhotoGrid, 
  SkeletonCard, 
  SkeletonText, 
  SkeletonButton 
};
