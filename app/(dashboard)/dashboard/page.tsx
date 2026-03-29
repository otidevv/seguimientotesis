'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { PermissionGuard } from '@/components/auth'
import { BookOpen, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import {
  StatsCards,
  ActivityChart,
  FacultyChart,
  RecentTabs,
  AdvancedStats,
} from '@/components/dashboard'
import type { DashboardData } from '@/components/dashboard'

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.get<DashboardData>('/api/dashboard')
      setData(result)
    } catch (error) {
      console.error('Error cargando dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboard()
    }
  }, [authLoading, user, loadDashboard])

  if (authLoading || loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Error al cargar el dashboard</p>
        <Button variant="outline" onClick={loadDashboard}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    )
  }

  const { stats, actividadMensual, tesisPorFacultad, tesisRecientes, actividadReciente, proximosEventos, statsAvanzados } = data

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* Header */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards"
        style={{ animationDuration: '500ms' }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bienvenido, {user?.nombres}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resumen general del sistema de tesis
          </p>
          <div className="flex gap-2 mt-2.5">
            {user?.roles.map((role) => (
              <Badge
                key={role.id}
                style={{ backgroundColor: role.color || '#6b7280' }}
                className="text-white text-[11px]"
              >
                {role.nombre}
              </Badge>
            ))}
          </div>
        </div>
        <PermissionGuard moduleCode="mis-tesis" action="view">
          <Button asChild size="sm">
            <Link href="/mis-tesis">
              <BookOpen className="mr-2 h-4 w-4" />
              Mis Tesis
            </Link>
          </Button>
        </PermissionGuard>
      </div>

      <StatsCards stats={stats} />

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-7 overflow-hidden">
        <ActivityChart data={actividadMensual} />
        <FacultyChart data={tesisPorFacultad} />
      </div>

      <RecentTabs
        tesisRecientes={tesisRecientes}
        actividadReciente={actividadReciente}
        proximosEventos={proximosEventos}
      />

      <AdvancedStats stats={statsAvanzados} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-44" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-11 w-11 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-7 overflow-hidden">
        <Card className="md:col-span-4 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] sm:h-[280px] w-full rounded-md" />
          </CardContent>
        </Card>
        <Card className="md:col-span-3 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full rounded-md" />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-10 w-full lg:w-[400px] rounded-md" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
