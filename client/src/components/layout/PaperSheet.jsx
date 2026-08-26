import React from 'react';

/**
 * PaperSheet Container
 * Recreates the light tactile operations sheet from the physical workbook reference.
 */
export function PaperSheet({
  children,
  className = '',
  variant = 'default', // 'default' | 'grid' | 'secondary' | 'note'
  onClick,
  ...props
}) {
  const baseClasses = "rounded-[3px] border transition-colors relative";

  const variantStyles = {
    default: "bg-[#FCFAF4] dark:bg-[#1B2422] border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] text-[#1C201E] dark:text-[#F5F7F6]",
    grid: "bg-[#FCFAF4] dark:bg-[#1B2422] bg-grid-paper border-[#E3DDD1] dark:border-[#2B3835] shadow-[0_1px_3px_rgba(35,30,25,0.04)] text-[#1C201E] dark:text-[#F5F7F6]",
    secondary: "bg-[#F4EFE6] dark:bg-[#222D2B] border-[#E3DDD1] dark:border-[#2B3835] shadow-none text-[#1C201E] dark:text-[#F5F7F6]",
    note: "bg-[#FCF2CD] dark:bg-[#292E22] border-[#EEDBA5] dark:border-[#3F4735] shadow-[0_2px_5px_rgba(50,40,20,0.06)] text-[#1C201E] dark:text-[#F5F7F6]"
  };

  return (
    <div
      className={`${baseClasses} ${variantStyles[variant] || variantStyles.default} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * SectionHeader
 * Distinctive architectural drafting / technical heading with optional handwriting flair and View All link.
 */
export function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  handwriting = true,
  className = ''
}) {
  return (
    <div className={`flex items-center justify-between gap-2 pb-2 ${className}`}>
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="w-4 h-4 text-[#15803D] dark:text-[#22C55E] stroke-[2.2]" />
        )}
        <div>
          <h2 className={`${handwriting ? 'font-handwriting text-xl sm:text-2xl tracking-wide font-bold' : 'font-sans text-sm font-bold tracking-tight'} text-[#1C201E] dark:text-[#F5F7F6]`}>
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-[#68716D] dark:text-[#8E9C97] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="text-xs font-sans">
          {action}
        </div>
      )}
    </div>
  );
}

export default PaperSheet;
