import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
  as?: 'span' | 'button';
}

export function Button({ variant = 'primary', className = '', children, as: Component = 'button', ...props }: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (Component === 'span') {
    return (
      <span className={classes} {...(props as any)}>
        {children}
      </span>
    );
  }

  return (
    <button
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}
