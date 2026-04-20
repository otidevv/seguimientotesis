'use client'

/**
 * Widget compacto que muestra el estado de un conjunto de ventanas academicas.
 * Usado en mesa-partes para anticipar que acciones estaran bloqueadas por calendario.
 *
 * Por facultad: si el rol de mesa-partes tiene scope, pasa `facultadId`; sino usa global.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type WindowType =
  | 'PRESENTACION_PROYECTO'
  | 'REVISION_MESA_PARTES'
  | 'ASIGNACION_JURADOS'
  | 'EVALUACION_JURADO'
  | 'INFORME_FINAL'
  | 'SUSTENTACION'
  | 'DESISTIMIENTO'

interface VentanaVigente {
  windowId: string
  tipo: WindowType
  fechaInicio: string
  fechaFin: string
  periodoNombre: string
  dentroDeVentana: boolean
  overrideVigenteHasta: string | null
  motivo: string
}

const TIPO_LABEL: Record<WindowType, string> = {
  PRESENTACION_PROYECTO: 'Presentacion',
  REVISION_MESA_PARTES: 'Revision MP',
  ASIGNACION_JURADOS: 'Asign. jurados',
  EVALUACION_JURADO: 'Evaluacion',
  INFORME_FINAL: 'Informe final',
  SUSTENTACION: 'Sustentacion',
  DESISTIMIENTO: 'Desistimiento',
}

export interface CalendarStatusWidgetProps {
  tipos?: WindowType[]
  thesisId?: string
  className?: string
  titulo?: string
}

export function CalendarStatusWidget({
  tipos = [
    'PRESENTACION_PROYECTO',
    'REVISION_MESA_PARTES',
    'ASIGNACION_JURADOS',
    'EVALUACION_JURADO',
    'INFORME_FINAL',
    'SUSTENTACION',
    'DESISTIMIENTO',
  ],
  thesisId,
  className,
  titulo = 'Calendario academico',
}: CalendarStatusWidgetProps) {
  const [ventanas, setVentanas] = useState<Record<WindowType, VentanaVigente | null>>({} as Record<WindowType, VentanaVigente | null>)
  const [loading, setLoading] = useState(true)

  // Usamos la firma estringuificada como dep estable: cualquier default o
  // literal inline crea un array nuevo en cada render, lo que dispararia un
  // loop de refetch si usaramos `tipos` directamente.
  const tiposKey = tipos.join(',')

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    const tiposList = tiposKey.split(',') as WindowType[]

    Promise.all(
      tiposList.map((tipo) =>
        fetch(
          `/api/academic-calendar/ventana?tipo=${tipo}${thesisId ? `&thesisId=${thesisId}` : ''}`,
          { signal: ac.signal },
        )
          .then((r) => (r.ok ? r.json() : { ventana: null }))
          .then((d: { ventana: VentanaVigente | null }) => [tipo, d.ventana] as const)
          .catch(() => [tipo, null] as const),
      ),
    )
      .then((pairs) => {
        if (ac.signal.aborted) return
        const next = {} as Record<WindowType, VentanaVigente | null>
        for (const [t, v] of pairs) next[t] = v
        setVentanas(next)
      })
      .finally(() => { if (!ac.signal.aborted) setLoading(false) })

    return () => ac.abort()
  }, [tiposKey, thesisId])

  return (
    <Card className={cn('bg-muted/20', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando ventanas...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tipos.map((tipo) => {
              const v = ventanas[tipo]
              if (!v) {
                return (
                  <Badge key={tipo} variant="outline" className="text-[11px]" title="Sin periodo configurado">
                    {TIPO_LABEL[tipo]} — sin config
                  </Badge>
                )
              }
              const abierta = v.dentroDeVentana
              const overrideAct = v.overrideVigenteHasta
              return (
                <Badge
                  key={tipo}
                  variant={abierta ? 'default' : 'secondary'}
                  className={cn(
                    'text-[11px] gap-1 flex items-center',
                    abierta && !overrideAct && 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200',
                    abierta && overrideAct && 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200',
                    !abierta && 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-200',
                  )}
                  title={`${v.motivo} (${new Date(v.fechaInicio).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })} — ${new Date(v.fechaFin).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })})`}
                >
                  {abierta
                    ? overrideAct
                      ? <AlertTriangle className="w-3 h-3" />
                      : <CheckCircle2 className="w-3 h-3" />
                    : <Clock className="w-3 h-3" />}
                  {TIPO_LABEL[tipo]}
                </Badge>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
