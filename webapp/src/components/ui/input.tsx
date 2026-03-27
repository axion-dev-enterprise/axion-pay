import * as React from 'react'
import { cn } from '~/utils/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-400/60',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

