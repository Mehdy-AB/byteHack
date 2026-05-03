'use client'

import React from 'react'

export function Logo({ className = "h-8 w-8", showText = false }: { className?: string, showText?: boolean }) {
  return (
    <div className="flex items-center gap-3 group cursor-pointer">
      <div className={`relative ${className}`}>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-primary/40 blur-[8px] rounded-lg group-hover:bg-primary/60 transition-all duration-500" />
        
        {/* Original SVG Logo */}
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-2xl"
        >
          {/* Outer Frame */}
          <path 
            d="M20 30L50 15L80 30V70L50 85L20 70V30Z" 
            stroke="currentColor" 
            strokeWidth="6" 
            strokeLinejoin="round"
            className="text-primary/30"
          />
          
          {/* Stylized M / Neural Path */}
          <path 
            d="M30 65V35L50 55L70 35V65" 
            stroke="currentColor" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="text-primary animate-in fade-in zoom-in duration-1000"
          />
          
          {/* The "Core" */}
          <circle 
            cx="50" cy="55" r="4" 
            fill="white" 
            className="animate-pulse shadow-[0_0_10px_white]" 
          />
          
          {/* Accents */}
          <path 
            d="M50 15V25M20 30L30 35M80 30L70 35" 
            stroke="currentColor" 
            strokeWidth="2" 
            className="text-primary/50"
          />
        </svg>
      </div>
      
      {showText && (
        <span className="text-xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors duration-300 uppercase">
          Mythos
        </span>
      )}
    </div>
  )
}
