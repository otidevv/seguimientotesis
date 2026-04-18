'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText, Plus, Clock, CheckCircle, AlertCircle, Users,
  GraduationCap, Calendar, Eye, Search, ArrowRight, Sparkles,
  BookOpen, TrendingUp, Inbox, Ban, MoreHorizontal,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ModalSolicitarDesistimiento } from '@/components/desistimiento/modal-solicitar-desistimiento'
import { MOTIVO_LABEL } from '@/lib/constants/motivos-desistimiento'

interface Autor {
  id: string; tipoParticipante: string; estado: string
  user: { id: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string }
}
interface Asesor {
  id: string; tipoAsesor: string; estado: string
  user: { id: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string }
}
interface Tesis {
  id: string; codigo: string; titulo: string; estado: string; carreraNombre: string
  createdAt: string; fechaRegistro: string | null
  autores: Autor[]; asesores: Asesor[]
  facultad: { nombre: string }
}

interface DesistimientoHistorial {
  id: string
  thesisId: string
  tituloTesis: string
  estadoTesisActual: string
  estadoSolicitud: string
  motivoCategoria: string
  motivoDescripcion: string
  solicitadoAt: string
  aprobadoAt: string | null
  teniaCoautor: boolean
  estadoTesisAlSolicitar: string
  carreraNombre: string
  facultad: string
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; dotColor: string; bgColor: string; icon: React.ReactNode; step: number }> = {
  BORRADOR:               { label: 'Borrador',             color: 'text-gray-600',    dotColor: 'bg-gray-400',    bgColor: 'bg-gray-100 dark:bg-gray-800/40',       icon: <FileText className="w-3.5 h-3.5" />,     step: 1 },
  EN_REVISION:            { label: 'En Revisión',          color: 'text-blue-600',    dotColor: 'bg-blue-500',    bgColor: 'bg-blue-100 dark:bg-blue-900/30',       icon: <Clock className="w-3.5 h-3.5" />,        step: 2 },
  REGISTRO_PENDIENTE:     { label: 'En Revisión',          color: 'text-blue-600',    dotColor: 'bg-blue-500',    bgColor: 'bg-blue-100 dark:bg-blue-900/30',       icon: <Clock className="w-3.5 h-3.5" />,        step: 2 },
  OBSERVADA:              { label: 'Observada',            color: 'text-orange-600',  dotColor: 'bg-orange-500',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   icon: <AlertCircle className="w-3.5 h-3.5" />,  step: 2 },
  PROYECTO_OBSERVADO:     { label: 'Observada',            color: 'text-orange-600',  dotColor: 'bg-orange-500',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   icon: <AlertCircle className="w-3.5 h-3.5" />,  step: 2 },
  ASIGNANDO_JURADOS:      { label: 'Asignando Jurados',    color: 'text-purple-600',  dotColor: 'bg-purple-500',  bgColor: 'bg-purple-100 dark:bg-purple-900/30',   icon: <Clock className="w-3.5 h-3.5" />,        step: 3 },
  EN_EVALUACION_JURADO:   { label: 'En Evaluación',        color: 'text-indigo-600',  dotColor: 'bg-indigo-500',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',   icon: <Clock className="w-3.5 h-3.5" />,        step: 3 },
  OBSERVADA_JURADO:       { label: 'Obs. por Jurado',      color: 'text-orange-600',  dotColor: 'bg-orange-500',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   icon: <AlertCircle className="w-3.5 h-3.5" />,  step: 3 },
  PROYECTO_APROBADO:      { label: 'Proy. Aprobado',       color: 'text-emerald-600', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: <CheckCircle className="w-3.5 h-3.5" />,  step: 4 },
  APROBADA:               { label: 'Aprobada',             color: 'text-green-600',   dotColor: 'bg-green-500',   bgColor: 'bg-green-100 dark:bg-green-900/30',     icon: <CheckCircle className="w-3.5 h-3.5" />,  step: 4 },
  INFORME_FINAL:          { label: 'Informe Final',        color: 'text-cyan-600',    dotColor: 'bg-cyan-500',    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',       icon: <FileText className="w-3.5 h-3.5" />,     step: 5 },
  EN_REVISION_INFORME:    { label: 'Informe en Revisión',  color: 'text-blue-600',    dotColor: 'bg-blue-500',    bgColor: 'bg-blue-100 dark:bg-blue-900/30',       icon: <Clock className="w-3.5 h-3.5" />,        step: 5 },
  EN_EVALUACION_INFORME:  { label: 'Evaluando Informe',    color: 'text-indigo-600',  dotColor: 'bg-indigo-500',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',   icon: <Clock className="w-3.5 h-3.5" />,        step: 5 },
  OBSERVADA_INFORME:      { label: 'Informe Observado',    color: 'text-orange-600',  dotColor: 'bg-orange-500',  bgColor: 'bg-orange-100 dark:bg-orange-900/30',   icon: <AlertCircle className="w-3.5 h-3.5" />,  step: 5 },
  EN_SUSTENTACION:        { label: 'En Sustentación',      color: 'text-purple-600',  dotColor: 'bg-purple-500',  bgColor: 'bg-purple-100 dark:bg-purple-900/30',   icon: <Calendar className="w-3.5 h-3.5" />,     step: 6 },
  SUSTENTADA:             { label: 'Sustentada',           color: 'text-teal-600',    dotColor: 'bg-teal-500',    bgColor: 'bg-teal-100 dark:bg-teal-900/30',       icon: <GraduationCap className="w-3.5 h-3.5" />,step: 7 },
  ARCHIVADA:              { label: 'Archivada',            color: 'text-gray-600',    dotColor: 'bg-gray-400',    bgColor: 'bg-gray-100 dark:bg-gray-800/40',       icon: <FileText className="w-3.5 h-3.5" />,     step: 7 },
  RECHAZADA:              { label: 'Rechazada',            color: 'text-red-600',     dotColor: 'bg-red-500',     bgColor: 'bg-red-100 dark:bg-red-900/30',         icon: <AlertCircle className="w-3.5 h-3.5" />,  step: 0 },
  DESISTIDA:              { label: 'Desistida',            color: 'text-slate-600',   dotColor: 'bg-slate-400',   bgColor: 'bg-slate-100 dark:bg-slate-800/40',     icon: <Ban className="w-3.5 h-3.5" />,          step: 0 },
  SOLICITUD_DESISTIMIENTO: { label: 'Solicitud en trámite', color: 'text-amber-700',   dotColor: 'bg-amber-500',   bgColor: 'bg-amber-100 dark:bg-amber-900/30',     icon: <Clock className="w-3.5 h-3.5" />,        step: 0 },
}

const MAX_STEPS = 7
const PROGRESO_ESTADOS = ['EN_REVISION', 'REGISTRO_PENDIENTE', 'EN_EVALUACION_JURADO', 'ASIGNANDO_JURADOS', 'EN_REVISION_INFORME', 'EN_EVALUACION_INFORME', 'INFORME_FINAL']
const APROBADA_ESTADOS = ['APROBADA', 'PROYECTO_APROBADO', 'SUSTENTADA']
const OBSERVADA_ESTADOS = ['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME', 'PROYECTO_OBSERVADO']

// Solo fase de gestión de proyecto (antes de informe final)
const ESTADOS_DESISTIMIENTO = [
  'BORRADOR', 'EN_REVISION', 'OBSERVADA', 'ASIGNANDO_JURADOS',
  'EN_EVALUACION_JURADO', 'OBSERVADA_JURADO', 'PROYECTO_APROBADO',
]

export default function MisTesisPage() {
  const { user, isLoading: authLoading, hasPermission } = useAuth()
  const [tesis, setTesis] = useState<Tesis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // Desistimiento
  const [desistirDialogOpen, setDesistirDialogOpen] = useState(false)
  const [tesisDesistir, setTesisDesistir] = useState<Tesis | null>(null)
  const [desistidas, setDesistidas] = useState<DesistimientoHistorial[]>([])

  const loadTesis = useCallback(async () => {
    try {
      setLoading(true)
      const result = await api.get<{ data: Tesis[] }>('/api/tesis')
      setTesis(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDesistidas = useCallback(async () => {
    try {
      const result = await api.get<{ data: DesistimientoHistorial[] }>(
        '/api/mis-desistimientos?estadoSolicitud=APROBADO',
      )
      setDesistidas(result.data)
    } catch {
      // silencioso: no es crítico para el renderizado de la lista activa
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      loadTesis()
      loadDesistidas()
    }
  }, [authLoading, user, loadTesis, loadDesistidas])

  const abrirDesistimiento = (t: Tesis) => {
    setTesisDesistir(t)
    setDesistirDialogOpen(true)
  }

  const stats = useMemo(() => ({
    total: tesis.length,
    enProgreso: tesis.filter(t => PROGRESO_ESTADOS.includes(t.estado)).length,
    aprobadas: tesis.filter(t => APROBADA_ESTADOS.includes(t.estado)).length,
    observadas: tesis.filter(t => OBSERVADA_ESTADOS.includes(t.estado)).length,
  }), [tesis])

  const filteredTesis = useMemo(() => {
    let result = tesis
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t => t.titulo.toLowerCase().includes(q) || t.codigo.toLowerCase().includes(q) || t.carreraNombre.toLowerCase().includes(q))
    }
    if (activeFilter === 'progreso') result = result.filter(t => PROGRESO_ESTADOS.includes(t.estado))
    else if (activeFilter === 'aprobadas') result = result.filter(t => APROBADA_ESTADOS.includes(t.estado))
    else if (activeFilter === 'observadas') result = result.filter(t => OBSERVADA_ESTADOS.includes(t.estado))
    return result
  }, [tesis, searchQuery, activeFilter])

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-7 w-36" /><Skeleton className="h-4 w-52" /></div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (<Skeleton key={i} className="h-[76px] rounded-xl" />))}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    )
  }

  if (!hasPermission('mis-tesis', 'view')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Acceso Restringido</h2>
                <p className="text-sm text-muted-foreground">Esta sección es solo para estudiantes.</p>
              </div>
              <Button variant="outline" asChild><Link href="/dashboard">Volver al Dashboard</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Tesis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus proyectos de tesis</p>
        </div>
        <Button asChild>
          <Link href="/mis-tesis/nuevo">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proyecto
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {tesis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BookOpen, label: 'Total', value: stats.total, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
            { icon: TrendingUp, label: 'En progreso', value: stats.enProgreso, iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-600 dark:text-blue-400' },
            { icon: CheckCircle, label: 'Aprobadas', value: stats.aprobadas, iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
            { icon: AlertCircle, label: 'Observadas', value: stats.observadas, iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-600 dark:text-amber-400' },
          ].map((s, i) => (
            <div
              key={s.label}
              className="rounded-xl border p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards"
              style={{ animationDelay: `${i * 60}ms`, animationDuration: '400ms' }}
            >
              <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl', s.iconBg)}>
                <s.icon className={cn('w-5 h-5', s.iconColor)} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter chips */}
      {(tesis.length > 0 || desistidas.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por título, código o carrera..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: null, label: 'Todos', count: stats.total, show: true },
              { key: 'progreso', label: 'En progreso', count: stats.enProgreso, show: true },
              { key: 'aprobadas', label: 'Aprobadas', count: stats.aprobadas, show: true },
              { key: 'observadas', label: 'Observadas', count: stats.observadas, show: true },
              // Solo muestra el chip si el usuario tiene al menos un desistimiento aprobado:
              { key: 'desistidas', label: 'Desistidas', count: desistidas.length, show: desistidas.length > 0, highlight: true },
            ].filter(f => f.show).map((f) => (
              <button
                key={f.key ?? 'all'}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                  activeFilter === f.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : f.highlight
                      ? 'border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
                      : 'border bg-card hover:bg-accent text-muted-foreground',
                  f.count === 0 && activeFilter !== f.key && !f.highlight && 'opacity-50',
                )}
              >
                {f.label}
                <span className={cn('tabular-nums', activeFilter === f.key ? 'text-primary-foreground/70' : f.highlight ? 'text-amber-700/70' : 'text-muted-foreground/50')}>{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {tesis.length === 0 && activeFilter !== 'desistidas' && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="relative inline-block mb-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8 text-primary/60" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary" />
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1.5">No tienes proyectos de tesis</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Comienza registrando tu proyecto de tesis para dar seguimiento a todo el proceso académico
            </p>
            <Button asChild size="lg">
              <Link href="/mis-tesis/nuevo">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Proyecto
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pestaña "Desistidas": vista de solo lectura, tesis que el usuario dejó */}
      {activeFilter === 'desistidas' && (
        desistidas.length === 0 ? (
          <div className="py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
              <Ban className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Sin desistimientos registrados</h3>
            <p className="text-xs text-muted-foreground">No has desistido de ningún proyecto de tesis.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border-b">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Estos proyectos ya no se encuentran activos para ti. La información no se actualiza — refleja el momento del desistimiento.
                </p>
              </div>
            </div>
            <div className="divide-y">
              {desistidas
                .filter(d => !searchQuery.trim() || d.tituloTesis.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(d => {
                  const fechaAprob = d.aprobadoAt
                    ? new Date(d.aprobadoAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Lima' })
                    : '—'
                  const tesisContinua = d.estadoTesisActual !== 'DESISTIDA'
                  return (
                    <div key={d.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-snug line-clamp-2">{d.tituloTesis}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{d.carreraNombre} · {d.facultad}</p>
                        </div>
                        <Badge variant="outline" className="gap-1 text-[11px] border-slate-400 text-slate-600 bg-slate-100 dark:bg-slate-800/40">
                          <Ban className="w-3 h-3" />Desistida
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                          {MOTIVO_LABEL[d.motivoCategoria as keyof typeof MOTIVO_LABEL] ?? d.motivoCategoria}
                        </Badge>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />Aprobado {fechaAprob}
                        </span>
                        {d.teniaCoautor && (
                          <span className="text-[11px] text-muted-foreground">
                            {tesisContinua ? '· Continuó con el coautor' : '· La tesis quedó desistida'}
                          </span>
                        )}
                      </div>
                      {d.motivoDescripcion && (
                        <p className="text-xs text-muted-foreground italic line-clamp-2">“{d.motivoDescripcion}”</p>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )
      )}

      {/* No search results */}
      {tesis.length > 0 && filteredTesis.length === 0 && activeFilter !== 'desistidas' && (
        <div className="py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
            <Inbox className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Sin resultados</h3>
          <p className="text-xs text-muted-foreground">No se encontraron tesis que coincidan con tu búsqueda</p>
        </div>
      )}

      {/* Tabla de tesis */}
      {filteredTesis.length > 0 && activeFilter !== 'desistidas' && (
        <div className="rounded-xl border overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Código</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Título</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Asesor</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Estado</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 w-[120px]">Avance</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Fecha</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3 w-[100px]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTesis.map((t) => {
                  const ec = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG.BORRADOR
                  const progressPercent = Math.round((ec.step / MAX_STEPS) * 100)
                  const fecha = new Date(t.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
                  const asesor = t.asesores.find(a => a.tipoAsesor === 'ASESOR')
                  const miRegistro = t.autores.find(a => a.user.id === user?.id)
                  const yoDesisti = miRegistro?.estado === 'DESISTIDO'
                  const puedeDesistir = !yoDesisti && ESTADOS_DESISTIMIENTO.includes(t.estado)

                  return (
                    <tr key={t.id} className={cn('border-b last:border-b-0 hover:bg-muted/30 transition-colors', yoDesisti && 'opacity-60')}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{t.codigo}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[300px]">
                        <Link href={`/mis-tesis/${t.id}`} className="font-medium hover:text-primary transition-colors line-clamp-2 block">
                          {t.titulo}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">{t.carreraNombre}</p>
                      </td>
                      <td className="px-4 py-3">
                        {asesor ? (
                          <span className="text-xs">
                            {asesor.user.apellidoPaterno} {asesor.user.apellidoMaterno}, {asesor.user.nombres}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin asesor</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {yoDesisti ? (
                          <Badge variant="outline" className="gap-1 text-[11px] font-medium border-transparent whitespace-nowrap text-slate-600 bg-slate-100 dark:bg-slate-800/40">
                            <Ban className="w-3.5 h-3.5" /><span>Desistido</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium border-transparent whitespace-nowrap', ec.color, ec.bgColor)}>
                            {ec.icon}<span>{ec.label}</span>
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={progressPercent} className="h-1.5 flex-1" />
                          <span className="text-[11px] text-muted-foreground font-medium tabular-nums">{progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{fecha}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/mis-tesis/${t.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalle
                              </Link>
                            </DropdownMenuItem>
                            {puedeDesistir && (
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 cursor-pointer"
                                onClick={() => abrirDesistimiento(t)}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Desistir de esta tesis
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {filteredTesis.map((t) => {
              const ec = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG.BORRADOR
              const progressPercent = Math.round((ec.step / MAX_STEPS) * 100)
              const fecha = new Date(t.createdAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
              const asesor = t.asesores.find(a => a.tipoAsesor === 'ASESOR')
              const miRegistroMobile = t.autores.find(a => a.user.id === user?.id)
              const yoDesistiMobile = miRegistroMobile?.estado === 'DESISTIDO'
              const puedeDesistir = !yoDesistiMobile && ESTADOS_DESISTIMIENTO.includes(t.estado)

              return (
                <div key={t.id} className={cn('p-4 space-y-3', yoDesistiMobile && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-muted-foreground">{t.codigo}</span>
                        {yoDesistiMobile ? (
                          <Badge variant="outline" className="gap-1 text-[11px] font-medium border-transparent text-slate-600 bg-slate-100 dark:bg-slate-800/40">
                            <Ban className="w-3.5 h-3.5" /><span>Desistido</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={cn('gap-1 text-[11px] font-medium border-transparent', ec.color, ec.bgColor)}>
                            {ec.icon}<span>{ec.label}</span>
                          </Badge>
                        )}
                      </div>
                      <Link href={`/mis-tesis/${t.id}`} className="font-semibold leading-snug line-clamp-2 block hover:text-primary transition-colors">
                        {t.titulo}
                      </Link>
                      <p className="text-xs text-muted-foreground">{t.carreraNombre}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href={`/mis-tesis/${t.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalle
                          </Link>
                        </DropdownMenuItem>
                        {puedeDesistir && (
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                            onClick={() => abrirDesistimiento(t)}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Desistir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {asesor && (
                      <span className="flex items-center gap-1 truncate">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        {asesor.user.apellidoPaterno} {asesor.user.apellidoMaterno}
                      </span>
                    )}
                    <span className="flex items-center gap-1 shrink-0 ml-auto">
                      <Calendar className="w-3 h-3" />{fecha}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={progressPercent} className="h-1.5 flex-1" />
                    <span className="text-[11px] text-muted-foreground font-medium tabular-nums w-8 text-right">{progressPercent}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal nuevo: solicita desistimiento con categoría + descripción */}
      {tesisDesistir && (
        <ModalSolicitarDesistimiento
          open={desistirDialogOpen}
          onOpenChange={(open) => {
            setDesistirDialogOpen(open)
            if (!open) setTesisDesistir(null)
          }}
          thesisId={tesisDesistir.id}
          tituloTesis={tesisDesistir.titulo}
          onSuccess={() => {
            setTesisDesistir(null)
            loadTesis()
          }}
        />
      )}
    </div>
  )
}
