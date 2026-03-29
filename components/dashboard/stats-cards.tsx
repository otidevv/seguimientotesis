'use client'

import { BookOpen, CheckCircle2, Clock, FileCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from './constants'

interface StatsCardsProps {
  stats: DashboardData['stats']
}

const CARD_CONFIG = [
  {
    key: 'totalTesis',
    title: 'Total Tesis',
    icon: BookOpen,
    gradient: 'from-blue-500 to-blue-600',
    lightBg: 'bg-blue-50 dark:bg-blue-950/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-100 dark:ring-blue-900/40',
  },
  {
    key: 'aprobadas',
    title: 'Aprobadas',
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-emerald-600',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-100 dark:ring-emerald-900/40',
  },
  {
    key: 'enProceso',
    title: 'En Proceso',
    icon: Clock,
    gradient: 'from-amber-500 to-amber-600',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-100 dark:ring-amber-900/40',
  },
  {
    key: 'documentos',
    title: 'Documentos',
    icon: FileCheck,
    gradient: 'from-violet-500 to-violet-600',
    lightBg: 'bg-violet-50 dark:bg-violet-950/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-100 dark:ring-violet-900/40',
  },
] as const

export function StatsCards({ stats }: StatsCardsProps) {
  const values: Record<string, number> = {
    totalTesis: stats.totalTesis,
    aprobadas: stats.aprobadas,
    enProceso: stats.enProceso,
    documentos: stats.documentos,
  }

  const tendencias: Record<string, number | null> = {
    totalTesis: stats.tendencias.tesis,
    aprobadas: stats.tendencias.aprobadas,
    enProceso: null,
    documentos: stats.tendencias.documentos,
  }

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {CARD_CONFIG.map((card, index) => {
        const Icon = card.icon
        const value = values[card.key]
        const tendencia = tendencias[card.key]

        return (
          <div
            key={card.key}
            className={cn(
              'group relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20',
              'animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards'
            )}
            style={{ animationDelay: `${index * 80}ms`, animationDuration: '500ms' }}
          >
            {/* Background gradient accent */}
            <div className={cn('absolute inset-0 opacity-[0.03] bg-gradient-to-br', card.gradient)} />

            <div className="relative flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
                <TendenciaChip valor={tendencia} subtexto={card.key === 'enProceso' ? 'activas en revisión' : undefined} />
              </div>
              <div className={cn('flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ring-1', card.lightBg, card.ring)}>
                <Icon className={cn('h-5 w-5', card.iconColor)} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TendenciaChip({ valor, subtexto }: { valor: number | null; subtexto?: string }) {
  if (valor === null || valor === undefined) {
    return <p className="text-[11px] text-muted-foreground">{subtexto || ''}</p>
  }

  if (valor === 0) {
    return (
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>sin cambios</span>
      </div>
    )
  }

  const positivo = valor > 0
  return (
    <div className={cn(
      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
      positivo
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
    )}>
      {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>{positivo ? '+' : ''}{valor}%</span>
    </div>
  )
}
