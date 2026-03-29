import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function formatDate(date: string | Date, locale = 'es-PE'): string {
  return new Date(date).toLocaleDateString(locale)
}

export function formatDateTime(date: string | Date, locale = 'es-PE'): string {
  return new Date(date).toLocaleString(locale)
}

export function validarArchivoPDF(file: File, maxMB = 25): string | null {
  if (file.size > maxMB * 1024 * 1024) {
    return `El archivo "${file.name}" excede el límite de ${maxMB}MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`
  }
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return 'Solo se permiten archivos PDF'
  }
  return null
}
