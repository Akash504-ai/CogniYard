import React, { useId } from 'react';

export default function BinderSpine({ collapsed }) {
  const id = useId();

  const gradientId = `${id}-metal`;
  const highlightId = `${id}-highlight`;
  const shadowId = `${id}-shadow`;

  const ringCount = 24;
  const rings = Array.from({ length: ringCount }, (_, i) => i);

  return (
    <div
      className={`
        hidden lg:flex
        fixed top-0 z-50
        flex-col items-center justify-around
        h-screen w-[26px] min-w-[26px]
        select-none pointer-events-none
        transition-[left] duration-300 ease-out
        ${collapsed ? 'left-16' : 'left-64'}
      `}
      style={{
        background: `
          linear-gradient(
            90deg,
            #080b0a 0%,
            #101513 18%,
            #1b211f 45%,
            #151a18 68%,
            #090c0b 100%
          )
        `,
        boxShadow: `
          inset 1px 0 0 rgba(255,255,255,0.035),
          inset -2px 0 5px rgba(0,0,0,0.85),
          5px 0 16px rgba(0,0,0,0.22)
        `,
      }}
    >
      {/* =========================================================
          SPINE EDGE HIGHLIGHT
      ========================================================== */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(255,255,255,.08) 15%, rgba(255,255,255,.035) 85%, transparent)',
        }}
      />

      {/* =========================================================
          INNER SPINE GROOVE
      ========================================================== */}
      <div
        className="absolute right-[3px] top-0 bottom-0 w-[2px]"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(196,186,176,.28) 12%, rgba(196,186,176,.12) 50%, rgba(196,186,176,.28) 88%, transparent)',
          boxShadow: '0 0 3px rgba(196,186,176,.08)',
        }}
      />

      {/* =========================================================
          SUBTLE CENTER SEAM
      ========================================================== */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 opacity-20"
        style={{
          background:
            'linear-gradient(to bottom, transparent, #7c857f 20%, #7c857f 80%, transparent)',
        }}
      />

      {rings.map((idx) => (
        <div
          key={idx}
          className="
            relative
            flex items-center justify-center
            w-full h-8
          "
        >
          {/* =====================================================
              LEFT PUNCH HOLE
          ====================================================== */}
          <div
            className="
              absolute
              left-[2px]
              w-[9px] h-[15px]
              rounded-full
            "
            style={{
              background:
                'radial-gradient(ellipse at 65% 40%, #030504 0%, #070a09 45%, #111614 100%)',
              boxShadow: `
                inset 1px 1px 2px rgba(0,0,0,.95),
                inset -1px -1px 1px rgba(255,255,255,.035)
              `,
            }}
          />

          {/* =====================================================
              RIGHT PUNCH HOLE
          ====================================================== */}
          <div
            className="
              absolute
              right-[-4px]
              w-[10px] h-[15px]
              rounded-full
            "
            style={{
              background:
                'radial-gradient(ellipse at 35% 40%, #28221d 0%, #15110e 55%, #090807 100%)',
              border: '1px solid rgba(196,186,176,.38)',
              boxShadow: `
                inset 2px 1px 3px rgba(0,0,0,.9),
                0 0 1px rgba(255,255,255,.15)
              `,
            }}
          />

          {/* =====================================================
              RING CONTACT SHADOW
          ====================================================== */}
          <div
            className="
              absolute
              w-[28px] h-[8px]
              rounded-full
              blur-[3px]
              translate-x-[1px]
              translate-y-[3px]
            "
            style={{
              background: 'rgba(0,0,0,.55)',
            }}
          />

          {/* =====================================================
              METALLIC DOUBLE LOOP
          ====================================================== */}
          <svg
            className="
              relative z-10
              w-8 h-6
              overflow-visible
              drop-shadow-[0_2px_2px_rgba(0,0,0,.8)]
            "
            viewBox="0 0 32 24"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              {/* Main metal */}
              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor="#252b29" />
                <stop offset="20%" stopColor="#69716e" />
                <stop offset="38%" stopColor="#e2e5e4" />
                <stop offset="48%" stopColor="#ffffff" />
                <stop offset="58%" stopColor="#b6bcb9" />
                <stop offset="78%" stopColor="#555d5a" />
                <stop offset="100%" stopColor="#171b1a" />
              </linearGradient>

              {/* Sharp highlight */}
              <linearGradient
                id={highlightId}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="45%" stopColor="rgba(255,255,255,.85)" />
                <stop offset="55%" stopColor="rgba(255,255,255,.95)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>

              {/* Contact shadow */}
              <linearGradient
                id={shadowId}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#020303" />
                <stop offset="100%" stopColor="#0c0f0e" />
              </linearGradient>
            </defs>

            {/* ===================================================
                DARK UNDERCOAT
            ==================================================== */}
            <path
              d="
                M 2 5
                C 9 -1, 23 -1, 28 5
                C 30 8, 28 10, 25 9
                C 19 7, 9 8, 2 13
              "
              stroke={`url(#${shadowId})`}
              strokeWidth="4"
              strokeLinecap="round"
            />

            <path
              d="
                M 2 13
                C 9 7, 23 7, 28 13
                C 30 16, 28 18, 25 17
                C 19 15, 9 16, 2 21
              "
              stroke={`url(#${shadowId})`}
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* ===================================================
                MAIN METALLIC COILS
            ==================================================== */}
            <path
              d="
                M 2 5
                C 9 -1, 23 -1, 28 5
                C 30 8, 28 10, 25 9
                C 19 7, 9 8, 2 13
              "
              stroke={`url(#${gradientId})`}
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            <path
              d="
                M 2 13
                C 9 7, 23 7, 28 13
                C 30 16, 28 18, 25 17
                C 19 15, 9 16, 2 21
              "
              stroke={`url(#${gradientId})`}
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* ===================================================
                MICRO HIGHLIGHT
            ==================================================== */}
            <path
              d="
                M 5 4
                C 12 0, 22 0, 26 5
              "
              stroke={`url(#${highlightId})`}
              strokeWidth="0.7"
              strokeLinecap="round"
              opacity="0.8"
            />

            <path
              d="
                M 5 12
                C 12 8, 22 8, 26 13
              "
              stroke={`url(#${highlightId})`}
              strokeWidth="0.7"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}