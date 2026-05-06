import { cn } from '@/lib/utils'

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-10 w-10 border-[3px]',
  }
  return (
    <div
      role="status"
      aria-label="Caricamento"
      className={cn(
        'animate-spin rounded-full border-pienissimo-blue border-t-transparent',
        sizes[size],
        className
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  )
}
