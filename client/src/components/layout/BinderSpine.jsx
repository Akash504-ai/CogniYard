import React from 'react';

/**
 * BinderSpine Component
 * 
 * Recreates the physical spiral wire binder coil signature running vertically
 * between the Dark Operations Rail and the Warm Light Paper Workspace.
 */
export default function BinderSpine() {
  // Generate 26 evenly spaced spiral coil rings for full desktop height
  const ringCount = 28;
  const rings = Array.from({ length: ringCount }, (_, i) => i);

  return (
    <div 
      className="hidden lg:flex flex-col justify-around items-center w-6 min-w-[24px] h-screen sticky top-0 z-30 select-none pointer-events-none bg-[#101514] border-r border-[#E3DDD1] relative shadow-sm"
      style={{
        boxShadow: 'inset -3px 0 6px rgba(0, 0, 0, 0.4), 4px 0 10px rgba(40, 30, 20, 0.08)'
      }}
    >
      {/* Paper Perforation Crease Line on right */}
      <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-[#D4CABE]" />

      {rings.map((idx) => (
        <div key={idx} className="relative flex items-center justify-center w-full h-7 my-[-2px]">
          {/* Punched Hole Shadow in dark rail */}
          <div className="absolute left-[3px] w-2 h-3.5 rounded-full bg-[#080B0A] shadow-inner border border-black/60" />
          
          {/* Punched Hole in paper workspace edge */}
          <div className="absolute right-[-4px] w-2 h-3.5 rounded-full bg-[#201A15] shadow-inner border border-[#D4CABE]" />

          {/* Double-loop Metallic Wire Coil SVG */}
          <svg 
            className="relative z-10 w-7 h-5 overflow-visible drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" 
            viewBox="0 0 28 20" 
            fill="none"
          >
            {/* Top Wire Loop */}
            <path
              d="M 2 4 C 10 -2, 22 -2, 26 5 C 27 7, 26 9, 23 8 C 17 6, 8 7, 2 12"
              stroke="url(#metallicGradient)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Bottom Wire Loop */}
            <path
              d="M 2 11 C 10 5, 22 5, 26 12 C 27 14, 26 16, 23 15 C 17 13, 8 14, 2 19"
              stroke="url(#metallicGradient)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Gradient definition for polished steel wire */}
            <defs>
              <linearGradient id="metallicGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4B5563" />
                <stop offset="30%" stopColor="#D1D5DB" />
                <stop offset="50%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor="#9CA3AF" />
                <stop offset="100%" stopColor="#374151" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ))}
    </div>
  );
}
