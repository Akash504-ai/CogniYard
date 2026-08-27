import React from 'react';

/**
 * PaperSheet
 * ------------------------------------------------------------
 * Premium tactile "operations workbook" surface.
 *
 * Variants:
 * - default   → primary paper surface
 * - grid      → engineering/grid paper
 * - secondary → muted paper surface
 * - note      → yellow operational note
 */
export function PaperSheet({
  children,
  className = '',
  variant = 'default',
  onClick,
  hover = true,
  noPadding = false,
  ...props
}) {
  const variantStyles = {
    default: `
      bg-[#FCFAF4]
      dark:bg-[#1B2422]

      border-[#E2DDD2]
      dark:border-[#2B3835]

      text-[#1C201E]
      dark:text-[#F5F7F6]

      shadow-[0_1px_2px_rgba(35,30,25,0.04),0_4px_14px_rgba(35,30,25,0.025)]
      dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_5px_18px_rgba(0,0,0,0.12)]
    `,

    grid: `
      bg-[#FCFAF4]
      dark:bg-[#1B2422]

      bg-grid-paper

      border-[#E2DDD2]
      dark:border-[#2B3835]

      text-[#1C201E]
      dark:text-[#F5F7F6]

      shadow-[0_1px_2px_rgba(35,30,25,0.04),0_4px_14px_rgba(35,30,25,0.025)]
      dark:shadow-[0_1px_2px_rgba(0,0,0,0.25),0_5px_18px_rgba(0,0,0,0.12)]
    `,

    secondary: `
      bg-[#F4EFE6]
      dark:bg-[#222D2B]

      border-[#DED8CC]
      dark:border-[#303B38]

      text-[#1C201E]
      dark:text-[#F5F7F6]

      shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]
      dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]
    `,

    note: `
      bg-[#FCF2CD]
      dark:bg-[#292E22]

      border-[#EEDBA5]
      dark:border-[#3F4735]

      text-[#332F22]
      dark:text-[#F4F0DA]

      shadow-[0_2px_5px_rgba(50,40,20,0.06),0_8px_18px_rgba(50,40,20,0.025)]
      dark:shadow-[0_3px_8px_rgba(0,0,0,0.18)]
    `,
  };

  const interactive =
    onClick && hover
      ? `
        cursor-pointer
        hover:-translate-y-[1px]
        hover:border-[#D1CBC0]
        dark:hover:border-[#3A4642]
        hover:shadow-[0_3px_8px_rgba(35,30,25,0.07),0_8px_20px_rgba(35,30,25,0.035)]
        dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.28)]
        active:translate-y-0
      `
      : '';

  return (
    <div
      className={`
        group
        relative
        overflow-hidden
        rounded-[4px]
        border
        transition-all
        duration-200
        ease-out

        ${variantStyles[variant] || variantStyles.default}

        ${interactive}

        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {/* =====================================================
          PAPER TOP-LAYER HIGHLIGHT
      ====================================================== */}
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-px
          bg-white/70
          dark:bg-white/[0.045]
        "
      />

      {/* =====================================================
          PAPER EDGE / INNER DEPTH
      ====================================================== */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          rounded-[3px]
          ring-1
          ring-inset
          ring-black/[0.015]
          dark:ring-white/[0.015]
        "
      />

      {/* =====================================================
          SUBTLE PAPER GRAIN
      ====================================================== */}
      <div
        className="
          pointer-events-none
          absolute
          inset-0
          opacity-[0.035]
          dark:opacity-[0.025]
        "
        style={{
          backgroundImage: `
            radial-gradient(
              circle at 20% 20%,
              rgba(70,60,45,0.8) 0.45px,
              transparent 0.6px
            )
          `,
          backgroundSize: '7px 7px',
        }}
      />

      {/* =====================================================
          NOTE CORNER DETAIL
      ====================================================== */}
      {variant === 'note' && (
        <div
          className="
            pointer-events-none
            absolute
            right-0
            top-0
            w-0
            h-0
            border-l-[16px]
            border-b-[16px]
            border-l-transparent
            border-b-[#E9D28B]
            dark:border-b-[#444A31]
            opacity-70
          "
        />
      )}

      {/* =====================================================
          CONTENT
      ====================================================== */}
      <div className={noPadding ? '' : 'relative z-[1]'}>
        {children}
      </div>
    </div>
  );
}

/**
 * SectionHeader
 * ------------------------------------------------------------
 * Technical / architectural section heading for CogniYard.
 */
export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  handwriting = true,
  eyebrow,
  divider = true,
  className = '',
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-start justify-between gap-4">
        {/* ===================================================
            LEFT SIDE
        ==================================================== */}
        <div className="flex items-start gap-2.5 min-w-0">
          {/* Icon container */}
          {Icon && (
            <div
              className="
                flex
                items-center
                justify-center
                w-7
                h-7
                mt-0.5
                rounded-[4px]

                bg-[#EAF2EC]
                dark:bg-[#203128]

                border
                border-[#D6E5D9]
                dark:border-[#2D4738]

                shrink-0
              "
            >
              <Icon
                className="
                  w-[15px]
                  h-[15px]
                  text-[#15803D]
                  dark:text-[#4ADE80]
                  stroke-[2.1]
                "
              />
            </div>
          )}

          <div className="min-w-0">
            {/* Eyebrow */}
            {eyebrow && (
              <p
                className="
                  mb-0.5

                  text-[8px]
                  sm:text-[9px]

                  font-mono
                  font-bold
                  uppercase
                  tracking-[0.16em]

                  text-[#929993]
                  dark:text-[#68736E]
                "
              >
                {eyebrow}
              </p>
            )}

            {/* Title */}
            <h2
              className={`
                leading-none
                text-[#1C201E]
                dark:text-[#F5F7F6]

                ${
                  handwriting
                    ? `
                      font-handwriting
                      text-xl
                      sm:text-2xl
                      tracking-wide
                      font-bold
                    `
                    : `
                      font-sans
                      text-sm
                      sm:text-[15px]
                      font-bold
                      tracking-tight
                    `
                }
              `}
            >
              {title}
            </h2>

            {/* Subtitle */}
            {subtitle && (
              <p
                className="
                  mt-1

                  text-[10px]
                  sm:text-[11px]

                  leading-relaxed

                  text-[#68716D]
                  dark:text-[#8E9C97]
                "
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* ===================================================
            ACTION
        ==================================================== */}
        {action && (
          <div
            className="
              shrink-0
              text-[10px]
              sm:text-xs
              font-sans
            "
          >
            {action}
          </div>
        )}
      </div>

      {/* =====================================================
          TECHNICAL DIVIDER
      ====================================================== */}
      {divider && (
        <div
          className="
            flex
            items-center
            gap-2
            mt-2.5
          "
        >
          <div
            className="
              h-px
              flex-1

              bg-[#DEDAD1]
              dark:bg-[#303936]
            "
          />

          <div
            className="
              w-1
              h-1
              rotate-45

              bg-[#A7ADA8]
              dark:bg-[#58635E]
            "
          />

          <div
            className="
              w-8
              h-px

              bg-[#B8BEB9]
              dark:bg-[#4B5651]
            "
          />
        </div>
      )}
    </div>
  );
}

export default PaperSheet;