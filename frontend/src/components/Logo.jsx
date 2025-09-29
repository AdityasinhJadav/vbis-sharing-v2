import React from 'react';

const Logo = ({ width = 120, height = 40, className = "" }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 120 40" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{stopColor:"#667eea", stopOpacity:1}} />
          <stop offset="100%" style={{stopColor:"#764ba2", stopOpacity:1}} />
        </linearGradient>
      </defs>
      
      {/* Face icon */}
      <circle cx="20" cy="20" r="12" fill="none" stroke="url(#logoGradient)" strokeWidth="2"/>
      <circle cx="16" cy="17" r="1.5" fill="url(#logoGradient)"/>
      <circle cx="24" cy="17" r="1.5" fill="url(#logoGradient)"/>
      <path d="M15 23 Q20 26 25 23" stroke="url(#logoGradient)" strokeWidth="1.5" fill="none"/>
      
      {/* Text */}
      <text x="38" y="16" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="bold" fill="url(#logoGradient)">Face</text>
      <text x="38" y="28" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="bold" fill="url(#logoGradient)">Match</text>
      
      {/* Connection dots */}
      <circle cx="72" cy="12" r="1" fill="url(#logoGradient)" opacity="0.7"/>
      <circle cx="76" cy="16" r="1" fill="url(#logoGradient)" opacity="0.5"/>
      <circle cx="80" cy="20" r="1" fill="url(#logoGradient)" opacity="0.7"/>
      <circle cx="76" cy="24" r="1" fill="url(#logoGradient)" opacity="0.5"/>
      <circle cx="72" cy="28" r="1" fill="url(#logoGradient)" opacity="0.7"/>
      
      {/* Second face outline */}
      <circle cx="100" cy="20" r="12" fill="none" stroke="url(#logoGradient)" strokeWidth="2" opacity="0.6"/>
      <circle cx="96" cy="17" r="1.5" fill="url(#logoGradient)" opacity="0.6"/>
      <circle cx="104" cy="17" r="1.5" fill="url(#logoGradient)" opacity="0.6"/>
      <path d="M95 23 Q100 26 105 23" stroke="url(#logoGradient)" strokeWidth="1.5" fill="none" opacity="0.6"/>
    </svg>
  );
};

export default Logo;
