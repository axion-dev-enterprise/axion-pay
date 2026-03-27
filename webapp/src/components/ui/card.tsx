import type { HTMLAttributes } from 'react'
import { cn } from '~/utils/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-panel p-6', className)} {...props} />
}

