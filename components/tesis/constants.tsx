import {
  AlertCircle, CheckCircle2, Clock, FileText, GraduationCap, X, Ban,
} from 'lucide-react'

export const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  BORRADOR: {
    label: 'Borrador',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: <FileText className="w-4 h-4" />
  },
  EN_REVISION: {
    label: 'En Revisión',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  REGISTRO_PENDIENTE: {
    label: 'En Revisión',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  OBSERVADA: {
    label: 'Observada',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  PROYECTO_OBSERVADO: {
    label: 'Observado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  APROBADA: {
    label: 'Aprobada',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  PROYECTO_APROBADO: {
    label: 'Proyecto Aprobado',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  EN_DESARROLLO: {
    label: 'En Desarrollo',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <FileText className="w-4 h-4" />
  },
  EN_SUSTENTACION: {
    label: 'En Sustentación',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <GraduationCap className="w-4 h-4" />
  },
  SUSTENTADA: {
    label: 'Sustentada',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle2 className="w-4 h-4" />
  },
  RECHAZADA: {
    label: 'Rechazada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-4 h-4" />
  },
  ASIGNANDO_JURADOS: {
    label: 'Asignando Jurados',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  EN_EVALUACION_JURADO: {
    label: 'En Evaluacion (Jurado)',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  OBSERVADA_JURADO: {
    label: 'Observada por Jurado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  INFORME_FINAL: {
    label: 'Informe Final',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: <FileText className="w-4 h-4" />
  },
  EN_REVISION_INFORME: {
    label: 'Informe en Revisión',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  EN_EVALUACION_INFORME: {
    label: 'Evaluando Informe',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  OBSERVADA_INFORME: {
    label: 'Informe Observado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />
  },
  DESISTIDA: {
    label: 'Desistida',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: <Ban className="w-4 h-4" />
  },
  SOLICITUD_DESISTIMIENTO: {
    label: 'Solicitud de Desistimiento',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <Clock className="w-4 h-4" />
  },
  ARCHIVADA: {
    label: 'Archivada',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: <FileText className="w-4 h-4" />
  },
}

export const ESTADO_ASESOR_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  PENDIENTE: {
    label: 'Pendiente de aceptación',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: <Clock className="w-5 h-5" />
  },
  ACEPTADO: {
    label: 'Aceptado',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-5 h-5" />
  },
  RECHAZADO: {
    label: 'Rechazado',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-5 h-5" />
  },
  DESISTIDO: {
    label: 'Desistido',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: <Ban className="w-5 h-5" />
  },
}
