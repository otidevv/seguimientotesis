'use client'

import { Progress } from '@/components/ui/progress'
import { PermissionGuard } from '@/components/auth'
import { Target, Timer, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardData } from './constants'

interface AdvancedStatsProps {
  stats: DashboardData['statsAvanzados']
}

export function AdvancedStats({ stats }: AdvancedStatsProps) {
  return (
    <PermissionGuard moduleCode="reportes" action="view">
      <div className="grid gap-4 md:grid-cols-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:fill-mode-backwards" style={{ animationDelay: '560ms', animationDuration: '500ms' }}>
        {/* Tasa de aprobación */}
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Tasa de Aprobación</span>
            </div>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold tracking-tight">{stats.tasaAprobacion}</span>
            <span className="text-lg text-muted-foreground mb-0.5">%</span>
          </div>
          <Progress value={stats.tasaAprobacion} className="h-2" />
        </div>

        {/* Tiempo promedio */}
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40">
                <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Tiempo Promedio</span>
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <span className="text-3xl font-bold tracking-tight">
              {stats.tiempoPromedioMeses > 0 ? stats.tiempoPromedioMeses : '—'}
            </span>
            {stats.tiempoPromedioMeses > 0 && (
              <span className="text-sm text-muted-foreground mb-1">meses</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Desde registro hasta aprobación</p>
        </div>

        {/* Tesis este mes */}
        <div className="rounded-xl border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                <CalendarPlus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">Tesis este Mes</span>
            </div>
          </div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold tracking-tight">{stats.tesisEsteMes}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">nuevas tesis registradas</p>
        </div>
      </div>
    </PermissionGuard>
  )
}
