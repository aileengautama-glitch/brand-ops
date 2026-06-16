import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  // crypto.randomUUID() produces RFC-4122 v4 UUIDs — required for Supabase FK compatibility.
  // Falls back to the old timestamp-based format in environments where crypto is unavailable
  // (e.g. some test runners), so existing code is unaffected.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`
}

export function formatDate(date: string | Date, pattern = 'dd MMM yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return String(date)
    return format(d, pattern)
  } catch {
    return String(date)
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd MMM yyyy, HH:mm')
}

export function formatShortDate(date: string | Date): string {
  return formatDate(date, 'dd MMM')
}

export function now(): string {
  return new Date().toISOString()
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return `${str.slice(0, max)}…`
}
