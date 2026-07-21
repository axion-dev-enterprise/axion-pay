import * as React from 'react'
import { cn } from '~/utils/cn'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-400/60',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

