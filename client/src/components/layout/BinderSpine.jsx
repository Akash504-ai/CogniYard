import React, { useId } from 'react';

export default function BinderSpine({ collapsed }) {
  // Unique ID prefix to avoid gradient ID collisions across SVG instances
  const gradientId = useId();
  const shadowGradientId = `${gradientId}-shadow`;

  const ringCount = 28;
  const rings = Array.from({ length: ringCount }, (_, i) => i);

  return (
    <div 
      className={`hidden lg:flex flex-col justify-around items-center w-6 min-w-[24px] h-screen fixed top-0 z-50 select-none pointer-events-none transition-all duration-200 ease-in-out ${
        collapsed ? 'left-16' : 'left-64'
      }`}
      style={{
        // Multi-layered depth shadow simulating a realistic spine groove
        background: 'linear-gradient(90deg, #0C100F 0%, #121817 40%, #1A2220 75%, #0D1211 100%)',
        boxShadow: `
          inset -4px 0 8px rgba(0, 0, 0, 0.6),
          inset 2px 0 4px rgba(255, 255, 255, 0.03),
          6px 0 14px rgba(0, 0, 0, 0.15)
        `
      }}
    >
      {/* Micro-texture Spine Highlight (Simulates brushed metal/stitching edge) */}
      <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/5" />

      {/* Dashed Paper Perforation Crease Line */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-[1px]"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #C4BAB0 10%, #C4BAB0 90%, transparent 100%)',
          opacity: 0.4
        }}
      />

      {rings.map((idx) => (
        <div key={idx} className="relative flex items-center justify-center w-full h-7 my-[-2px] group">
          
          {/* Punched Hole: Left Dark Rail Side */}
          <div 
            className="absolute left-[2px] w-2.5 h-3.5 rounded-full bg-[#050706] border border-black/80"
            style={{
              boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(255,255,255,0.05)'
            }}
          />
          
          {/* Punched Hole: Right Paper Workspace Side */}
          <div 
            className="absolute right-[-5px] w-2.5 h-3.5 rounded-full bg-[#181310] border border-[#C4BAB0]/50"
            style={{
              boxShadow: 'inset 2px 1px 3px rgba(0,0,0,0.8), 1px 0 1px rgba(255,255,255,0.3)'
            }}
          />

          {/* Realistic Cast Drop Shadow from Wire to Spine */}
          <div className="absolute w-7 h-4 bg-black/40 blur-[2px] translate-y-[2px] translate-x-[1px] rounded-full pointer-events-none" />

          {/* Double-loop Metallic Wire Coil SVG */}
          <svg 
            className="relative z-10 w-8 h-5 overflow-visible filter drop-shadow-[0_3px_2px_rgba(0,0,0,0.65)]" 
            viewBox="0 0 28 20" 
            fill="none"
          >
            {/* Dark Undercoat Path for Enhanced Wire Thickness & Ambient Occlusion */}
            <path
              d="M 2 4 C 10 -2, 22 -2, 26 5 C 27 7, 26 9, 23 8 C 17 6, 8 7, 2 12"
              stroke="#080A09"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 2 11 C 10 5, 22 5, 26 12 C 27 14, 26 16, 23 15 C 17 13, 8 14, 2 19"
              stroke="#080A09"
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Top Wire Loop */}
            <path
              d="M 2 4 C 10 -2, 22 -2, 26 5 C 27 7, 26 9, 23 8 C 17 6, 8 7, 2 12"
              stroke={`url(#${gradientId})`}
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Bottom Wire Loop */}
            <path
              d="M 2 11 C 10 5, 22 5, 26 12 C 27 14, 26 16, 23 15 C 17 13, 8 14, 2 19"
              stroke={`url(#${gradientId})`}
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Metallic Wire Sheen Highlights */}
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#374151" />
                <stop offset="25%" stopColor="#9CA3AF" />
                <stop offset="45%" stopColor="#FFFFFF" />
                <stop offset="55%" stopColor="#E5E7EB" />
                <stop offset="75%" stopColor="#6B7280" />
                <stop offset="100%" stopColor="#1F2937" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ))}
    </div>
  );
}