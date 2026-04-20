import type { MotivoDesistimiento } from '@prisma/client'

export interface MotivoInfo {
  codigo: MotivoDesistimiento
  label: string
  descripcion: string
}

export const MOTIVOS_DESISTIMIENTO: MotivoInfo[] = [
  { codigo: 'PERSONAL_FAMILIAR', label: 'Personal / familiar',    descripcion: 'Situaciones personales o familiares' },
  { codigo: 'ECONOMICO',         label: 'Económico',              descripcion: 'Problemas económicos o falta de recursos' },
  { codigo: 'SALUD',             label: 'Salud',                  descripcion: 'Problemas de salud propios o de familiar' },
  { codigo: 'LABORAL',           label: 'Laboral',                descripcion: 'Trabajo que absorbe el tiempo disponible' },
  { codigo: 'CAMBIO_TEMA',       label: 'Cambio de tema',         descripcion: 'Decide cambiar el tema de investigación' },
  { codigo: 'PROBLEMA_ASESOR',   label: 'Problemas con asesor',   descripcion: 'Dificultades con el asesor de tesis' },
  { codigo: 'PROBLEMA_COAUTOR',  label: 'Problemas con coautor',  descripcion: 'Dificultades con el coautor' },
  { codigo: 'FALTA_TIEMPO',      label: 'Falta de tiempo',        descripcion: 'Sobrecarga académica u otros compromisos' },
  { codigo: 'CAMBIO_CARRERA',    label: 'Cambio de carrera',      descripcion: 'Cambio de carrera o de universidad' },
  { codigo: 'OTRO',              label: 'Otro',                   descripcion: 'Otro motivo no listado (describir en detalle)' },
]

export const MOTIVO_LABEL: Record<MotivoDesistimiento, string> =
  Object.fromEntries(MOTIVOS_DESISTIMIENTO.map(m => [m.codigo, m.label])) as Record<MotivoDesistimiento, string>
