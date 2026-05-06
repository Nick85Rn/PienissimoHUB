import { useMemo } from 'react'
import { sanitizeHtml } from '@/lib/sanitize'
import { cn } from '@/lib/utils'

interface SafeHtmlProps {
  html: string
  className?: string
}

/**
 * Renderizza HTML sanitizzato. Usa SEMPRE questo componente al posto
 * di dangerouslySetInnerHTML diretto per i contenuti utente.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
  const clean = useMemo(() => sanitizeHtml(html), [html])

  return (
    <div
      className={cn(
        'prose prose-slate max-w-none',
        'prose-headings:font-bold prose-headings:text-slate-900',
        'prose-a:text-pienissimo-blue prose-a:font-medium',
        'prose-img:rounded-xl prose-img:border prose-img:border-slate-200',
        'prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-slate-900 prose-pre:text-slate-100',
        'prose-blockquote:border-l-pienissimo-blue prose-blockquote:bg-slate-50 prose-blockquote:py-1',
        className
      )}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
