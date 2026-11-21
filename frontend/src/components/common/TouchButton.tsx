import React from 'react';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  variant = 'primary',
  size = 'lg',
  icon,
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-95 select-none rounded-2xl cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 shadow-touch';

  const variants = {
    primary: 'bg-korean-charcoal text-white hover:bg-neutral-800 shadow-korean-charcoal/20',
    secondary: 'bg-cream-100 text-korean-charcoal hover:bg-cream-200 border border-cream-300 shadow-soft',
    outline: 'bg-transparent border-2 border-korean-charcoal text-korean-charcoal hover:bg-cream-100',
    subtle: 'bg-cream-200/60 text-korean-charcoal hover:bg-cream-200 shadow-none',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-500/20'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm gap-2 rounded-xl min-h-[44px]',
    md: 'px-6 py-3 text-base gap-2.5 rounded-2xl min-h-[52px]',
    lg: 'px-8 py-4 text-lg gap-3 rounded-2xl min-h-[64px]',
    xl: 'px-10 py-5 text-xl gap-4 rounded-3xl min-h-[76px]'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
};
