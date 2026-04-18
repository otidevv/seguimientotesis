import { Ban, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { EstadoSolicitudDesistimiento } from '@prisma/client'

export const ESTADO_SOLICITUD_CONFIG: Record<EstadoSolicitudDesistimiento, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}> = {
  PENDIENTE:  { label: 'Pendiente',  color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: <Clock className="w-4 h-4" /> },
  APROBADO:   { label: 'Aprobado',   color: 'text-green-700',  bgColor: 'bg-green-100  dark:bg-green-900/30',  icon: <CheckCircle2 className="w-4 h-4" /> },
  RECHAZADO:  { label: 'Rechazado',  color: 'text-red-700',    bgColor: 'bg-red-100    dark:bg-red-900/30',    icon: <XCircle className="w-4 h-4" /> },
  CANCELADO:  { label: 'Cancelado',  color: 'text-slate-700',  bgColor: 'bg-slate-100  dark:bg-slate-800',     icon: <Ban className="w-4 h-4" /> },
}

export const MOTIVO_COLOR: Record<string, string> = {
  PERSONAL_FAMILIAR: 'bg-purple-100 text-purple-800',
  ECONOMICO:         'bg-amber-100  text-amber-800',
  SALUD:             'bg-rose-100   text-rose-800',
  LABORAL:           'bg-blue-100   text-blue-800',
  CAMBIO_TEMA:       'bg-teal-100   text-teal-800',
  PROBLEMA_ASESOR:   'bg-orange-100 text-orange-800',
  PROBLEMA_COAUTOR:  'bg-orange-100 text-orange-800',
  FALTA_TIEMPO:      'bg-indigo-100 text-indigo-800',
  CAMBIO_CARRERA:    'bg-cyan-100   text-cyan-800',
  OTRO:              'bg-gray-100   text-gray-800',
}
