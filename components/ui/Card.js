'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function Card({ 
  className, 
  children, 
  hover = false, 
  clickable = false,
  variant = 'default',
  ...props 
}) {
  const variants = {
    default: 'bg-white border border-gray-200',
    red: 'bg-red-50 border border-red-200',
    elevated: 'bg-white shadow-lg border-0'
  };

  const Component = clickable ? motion.button : motion.div;

  return (
    <Component
      className={cn(
        'rounded-xl p-6 transition-all duration-200',
        variants[variant],
        hover && 'hover:shadow-lg hover:scale-[1.02]',
        clickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
        className
      )}
      whileHover={hover ? { y: -2 } : {}}
      whileTap={clickable ? { scale: 0.98 } : {}}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3 className={cn('text-2xl font-bold leading-none tracking-tight text-gray-900', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p className={cn('text-sm text-gray-600', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('pt-0', className)} {...props}>
      {children}
    </div>
  );
}