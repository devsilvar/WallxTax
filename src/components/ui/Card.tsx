import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({ children, className = '', noPadding }: CardProps) {
  return (
    <div className={`rounded-md border border-gray-200 bg-white shadow-sm ${noPadding ? '' : 'p-4 sm:p-6'} ${className}`}>
      {children}
    </div>
  );
}
