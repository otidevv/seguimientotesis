// Mapeo de estado a progreso visual
export const PROGRESO_POR_ESTADO: Record<string, number> = {
  BORRADOR: 5,
  EN_REVISION: 15,
  OBSERVADA: 20,
  ASIGNANDO_JURADOS: 30,
  EN_EVALUACION_JURADO: 40,
  OBSERVADA_JURADO: 45,
  PROYECTO_APROBADO: 55,
  INFORME_FINAL: 60,
  EN_EVALUACION_INFORME: 70,
  OBSERVADA_INFORME: 75,
  APROBADA: 85,
  EN_SUSTENTACION: 90,
  SUSTENTADA: 100,
  ARCHIVADA: 100,
  RECHAZADA: 0,
}

export const ESTADO_LABEL: Record<string, { label: string; color: string; bgColor: string }> = {
  BORRADOR: { label: 'Borrador', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  EN_REVISION: { label: 'En Revision', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  OBSERVADA: { label: 'Observada', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  ASIGNANDO_JURADOS: { label: 'Asign. Jurados', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  EN_EVALUACION_JURADO: { label: 'Eval. Jurado', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  OBSERVADA_JURADO: { label: 'Obs. Jurado', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  PROYECTO_APROBADO: { label: 'Proy. Aprobado', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  INFORME_FINAL: { label: 'Informe Final', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  EN_EVALUACION_INFORME: { label: 'Eval. Informe', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  OBSERVADA_INFORME: { label: 'Obs. Informe', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  APROBADA: { label: 'Aprobada', color: 'text-green-500', bgColor: 'bg-green-500/10' },
  EN_SUSTENTACION: { label: 'En Sustentacion', color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  SUSTENTADA: { label: 'Sustentada', color: 'text-teal-500', bgColor: 'bg-teal-500/10' },
  ARCHIVADA: { label: 'Archivada', color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-500', bgColor: 'bg-red-500/10' },
}

export function tiempoRelativo(fecha: string): string {
  const ahora = new Date()
  const date = new Date(fecha)
  const diff = ahora.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Hace un momento'
  if (mins < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7) return `Hace ${days}d`
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
}

export function getAccionTexto(estadoNuevo: string, estadoAnterior: string | null): string {
  if (!estadoAnterior) return 'Tesis registrada'
  if (estadoNuevo === 'EN_REVISION' && estadoAnterior === 'BORRADOR') return 'Tesis enviada a revision'
  if (estadoNuevo === 'APROBADA') return 'Tesis aprobada'
  if (estadoNuevo === 'PROYECTO_APROBADO') return 'Proyecto aprobado'
  if (estadoNuevo === 'RECHAZADA') return 'Tesis rechazada'
  if (['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME'].includes(estadoNuevo)) return 'Tesis observada'
  if (estadoNuevo === 'ASIGNANDO_JURADOS') return 'Documentos aprobados'
  if (estadoNuevo === 'EN_SUSTENTACION') return 'Tesis lista para sustentacion'
  if (estadoNuevo === 'SUSTENTADA') return 'Tesis sustentada'
  const label = ESTADO_LABEL[estadoNuevo]?.label || estadoNuevo
  return `Cambio a ${label}`
}

export function getTipoActividad(estadoNuevo: string, estadoAnterior: string | null) {
  if (!estadoAnterior || (estadoAnterior === 'BORRADOR' && estadoNuevo === 'EN_REVISION')) return 'crear'
  if (['APROBADA', 'PROYECTO_APROBADO', 'ASIGNANDO_JURADOS'].includes(estadoNuevo)) return 'aprobar'
  if (['OBSERVADA', 'OBSERVADA_JURADO', 'OBSERVADA_INFORME'].includes(estadoNuevo)) return 'observar'
  if (estadoNuevo === 'RECHAZADA') return 'rechazar'
  return 'cambio'
}

export type DashboardScopeType = 'global' | 'facultad' | 'personal' | 'mixed' | 'empty'

export interface DashboardData {
  scope?: {
    type: DashboardScopeType
    facultadIds: string[]
  }
  stats: {
    totalTesis: number
    aprobadas: number
    enProceso: number
    documentos: number
    tendencias: { tesis: number; aprobadas: number; documentos: number }
  }
  actividadMensual: { month: string; registradas: number; actualizadas: number }[]
  tesisPorFacultad: { name: string; value: number; color: string }[]
  tesisRecientes: {
    id: string
    titulo: string
    estado: string
    estudiante: string
    facultad: string
    fechaCreacion: string
  }[]
  actividadReciente: {
    estadoAnterior: string | null
    estadoNuevo: string
    comentario: string | null
    usuario: string
    tesis: string
    fecha: string
  }[]
  proximosEventos: {
    id: string
    titulo: string
    estado: string
    fecha: string
    estudiante: string
    carrera: string
  }[]
  statsAvanzados: {
    tasaAprobacion: number
    tiempoPromedioMeses: number
    tesisEsteMes: number
  }
}
