'use client'

import { CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateLimitBadgeProps {
  fechaLimite: Date | string
  label?: string
  className?: string
}

export function DateLimitBadge({
  fechaLimite,
  label = 'Fecha límite (días hábiles)',
  className,
}: DateLimitBadgeProps) {
  const fecha = new Date(fechaLimite)

  // Calcular días en zona Lima (independiente del TZ del navegador) para que
  // un docente en otra TZ vea el mismo "Faltan X días" que el alumno en Lima.
  const ymdLima = (d: Date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(d)
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value)
    return Date.UTC(get('year'), get('month') - 1, get('day'))
  }
  const msPorDia = 1000 * 60 * 60 * 24
  const diffDias = Math.round((ymdLima(fecha) - ymdLima(new Date())) / msPorDia)

  const tono =
    diffDias < 5
      ? {
          wrap: 'bg-red-50 border-red-300 dark:bg-red-950/40 dark:border-red-800/70',
          label: 'text-red-700 dark:text-red-300',
          fecha: 'text-red-900 dark:text-red-100',
          sub: 'text-red-700 dark:text-red-300',
          icon: 'text-red-600 dark:text-red-400',
          dot: 'bg-red-500',
          pulso: diffDias <= 0,
        }
      : diffDias <= 14
        ? {
            wrap: 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800/70',
            label: 'text-amber-700 dark:text-amber-300',
            fecha: 'text-amber-900 dark:text-amber-100',
            sub: 'text-amber-700 dark:text-amber-300',
            icon: 'text-amber-600 dark:text-amber-400',
            dot: 'bg-amber-500',
            pulso: false,
          }
        : {
            wrap: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/70',
            label: 'text-emerald-700 dark:text-emerald-300',
            fecha: 'text-emerald-900 dark:text-emerald-100',
            sub: 'text-emerald-700 dark:text-emerald-300',
            icon: 'text-emerald-600 dark:text-emerald-400',
            dot: 'bg-emerald-500',
            pulso: false,
          }

  const fechaStr = fecha.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Lima',
  })

  const subtitle =
    diffDias < 0
      ? `Vencida hace ${Math.abs(diffDias)} día${Math.abs(diffDias) === 1 ? '' : 's'}`
      : diffDias === 0
        ? 'Vence hoy'
        : diffDias === 1
          ? 'Vence mañana'
          : `Faltan ${diffDias} días`

  return (
    <div
      className={cn(
        'mt-2 inline-flex items-stretch gap-3 rounded-lg border px-3 py-2 shadow-sm',
        tono.wrap,
        className,
      )}
    >
      <div className="flex items-center">
        <CalendarClock className={cn('w-6 h-6 shrink-0', tono.icon)} />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <p className={cn('text-[10px] uppercase font-semibold tracking-wider leading-tight', tono.label)}>
          {label}
        </p>
        <p className={cn('text-base font-bold leading-tight capitalize', tono.fecha)}>
          {fechaStr.replace(/\.$/, '')}
        </p>
        <p className={cn('text-xs font-medium flex items-center gap-1.5 mt-0.5', tono.sub)}>
          <span
            className={cn(
              'inline-block w-1.5 h-1.5 rounded-full',
              tono.dot,
              tono.pulso && 'animate-pulse',
            )}
          />
          {subtitle}
        </p>
      </div>
    </div>
  )
}
