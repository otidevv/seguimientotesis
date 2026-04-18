'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Clock, Send, Stamp, XCircle, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'

type EstadoSolicitud = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CANCELADO'

interface Props {
  estadoSolicitud: EstadoSolicitud
  solicitadoAt: string
  aprobadoAt: string | null
  aprobadoPor: string | null
  motivoRechazo: string | null
  solicitanteNombre: string
}

function formatDateTime(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleString('es-PE', { timeZone: 'America/Lima' })
}

export function DesistimientoTimeline({
  estadoSolicitud,
  solicitadoAt,
  aprobadoAt,
  aprobadoPor,
  motivoRechazo,
  solicitanteNombre,
}: Props) {
  // Paso 1: solicitud enviada (siempre completo)
  // Paso 2: revisión por mesa de partes (in-progress si PENDIENTE)
  // Paso 3: resolución final (APROBADO / RECHAZADO / CANCELADO)

  const esResuelto = estadoSolicitud !== 'PENDIENTE'
  const esFinalPositivo = estadoSolicitud === 'APROBADO'
  const esFinalNegativo = estadoSolicitud === 'RECHAZADO' || estadoSolicitud === 'CANCELADO'

  const pasoFinal = {
    APROBADO: { icon: Check, label: 'Aprobado por mesa de partes', color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30', ring: 'ring-emerald-500' },
    RECHAZADO: { icon: XCircle, label: 'Rechazado por mesa de partes', color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30', ring: 'ring-red-500' },
    CANCELADO: { icon: Ban, label: 'Cancelado por el tesista', color: 'text-slate-700', bg: 'bg-slate-100 dark:bg-slate-800', ring: 'ring-slate-400' },
    PENDIENTE: { icon: Clock, label: 'Esperando resolución', color: 'text-muted-foreground', bg: 'bg-muted', ring: 'ring-muted-foreground' },
  }[estadoSolicitud]

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Línea de tiempo</CardTitle></CardHeader>
      <CardContent>
        <ol className="relative border-l-2 border-muted ml-3 space-y-6 py-1">
          {/* Paso 1: Solicitado */}
          <TimelineStep
            icon={Send}
            iconColor="text-blue-600"
            bgColor="bg-blue-100 dark:bg-blue-900/30"
            ring="ring-blue-500"
            activo
            titulo="Solicitud enviada"
            subtitulo={`${solicitanteNombre} registró la solicitud de desistimiento.`}
            fecha={formatDateTime(solicitadoAt)}
          />

          {/* Paso 2: En revisión */}
          <TimelineStep
            icon={esResuelto ? Check : Clock}
            iconColor={esResuelto ? 'text-emerald-600' : 'text-amber-600'}
            bgColor={esResuelto ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}
            ring={esResuelto ? 'ring-emerald-500' : 'ring-amber-500'}
            activo
            animado={!esResuelto}
            titulo={esResuelto ? 'Revisión completada por mesa de partes' : 'En revisión por mesa de partes'}
            subtitulo={
              esResuelto
                ? aprobadoPor
                  ? `Revisado por ${aprobadoPor}.`
                  : 'Mesa de partes resolvió la solicitud.'
                : 'Tu solicitud está siendo evaluada. Recibirás una notificación cuando haya resolución.'
            }
            fecha={esResuelto ? formatDateTime(aprobadoAt) : undefined}
          />

          {/* Paso 3: Resolución */}
          <TimelineStep
            icon={pasoFinal.icon}
            iconColor={pasoFinal.color}
            bgColor={pasoFinal.bg}
            ring={pasoFinal.ring}
            activo={esResuelto}
            titulo={pasoFinal.label}
            subtitulo={
              esFinalPositivo
                ? 'La solicitud fue aprobada. Se aplicaron los cambios correspondientes en la tesis.'
                : esFinalNegativo && motivoRechazo
                  ? `Motivo: ${motivoRechazo}`
                  : estadoSolicitud === 'PENDIENTE'
                    ? 'Pendiente de resolución.'
                    : undefined
            }
            fecha={esResuelto ? formatDateTime(aprobadoAt) : undefined}
            ultimo
          />
        </ol>
      </CardContent>
    </Card>
  )
}

function TimelineStep({
  icon: Icon, iconColor, bgColor, ring, activo, animado, titulo, subtitulo, fecha, ultimo,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  bgColor: string
  ring: string
  activo: boolean
  animado?: boolean
  titulo: string
  subtitulo?: string
  fecha?: string
  ultimo?: boolean
}) {
  return (
    <li className={cn('ml-6', ultimo && 'pb-0')}>
      <span
        className={cn(
          'absolute -left-[17px] flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-background',
          bgColor,
          !activo && 'opacity-40',
          animado && 'animate-pulse',
        )}
      >
        <Icon className={cn('w-4 h-4', iconColor)} />
      </span>
      <div className={cn('space-y-0.5', !activo && 'opacity-50')}>
        <h4 className="text-sm font-semibold leading-tight">{titulo}</h4>
        {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
        {fecha && <p className="text-[11px] text-muted-foreground/80 tabular-nums mt-0.5">{fecha}</p>}
      </div>
    </li>
  )
}
