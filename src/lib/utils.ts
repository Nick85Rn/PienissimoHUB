import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatta una data ISO in formato italiano leggibile.
 */
export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
): string {
  return new Date(iso).toLocaleDateString('it-IT', options)
}

/**
 * Formatta una data ISO in formato relativo ("2 ore fa", "ieri", ecc.)
 */
export function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'adesso'
  if (diffMin < 60) return `${diffMin} min fa`
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'ora' : 'ore'} fa`
  if (diffDay < 7) return `${diffDay} ${diffDay === 1 ? 'giorno' : 'giorni'} fa`

  return formatDate(iso)
}

/**
 * Iniziali per avatar: prende le prime due lettere del primo e secondo termine
 * (es. "Mario Rossi" -> "MR", "Mario" -> "MA").
 */
export function initialsOf(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
