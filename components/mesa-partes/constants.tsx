import {
  AlertCircle, Ban, CheckCircle, Clock, ClipboardCheck,
  FileText, GraduationCap, UserPlus, X,
} from 'lucide-react'

export const ESTADO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  EN_REVISION: {
    label: 'En Revision',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-4 h-4" />,
  },
  OBSERVADA: {
    label: 'Observada',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  ASIGNANDO_JURADOS: {
    label: 'Asignando Jurados',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <UserPlus className="w-4 h-4" />,
  },
  EN_EVALUACION_JURADO: {
    label: 'En Evaluacion (Jurado)',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <ClipboardCheck className="w-4 h-4" />,
  },
  OBSERVADA_JURADO: {
    label: 'Observada por Jurado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  PROYECTO_APROBADO: {
    label: 'Proyecto Aprobado',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  INFORME_FINAL: {
    label: 'Informe Final',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: <FileText className="w-4 h-4" />,
  },
  EN_REVISION_INFORME: {
    label: 'Revisión Informe',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: <Clock className="w-4 h-4" />,
  },
  EN_EVALUACION_INFORME: {
    label: 'Evaluando Informe',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    icon: <ClipboardCheck className="w-4 h-4" />,
  },
  OBSERVADA_INFORME: {
    label: 'Informe Observado',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  APROBADA: {
    label: 'Aprobada',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  EN_SUSTENTACION: {
    label: 'En Sustentación',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: <GraduationCap className="w-4 h-4" />,
  },
  RECHAZADA: {
    label: 'Rechazada',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: <X className="w-4 h-4" />,
  },
  DESISTIDA: {
    label: 'Desistida',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    icon: <Ban className="w-4 h-4" />,
  },
}

export const TIPO_JURADO_LABELS: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  VOCAL: 'Vocal',
  SECRETARIO: 'Secretario',
  ACCESITARIO: 'Accesitario',
}

export const TIPO_JURADO_COLORS: Record<string, string> = {
  PRESIDENTE: 'border-amber-500 text-amber-700 bg-amber-50',
  VOCAL: 'border-blue-500 text-blue-700 bg-blue-50',
  SECRETARIO: 'border-green-500 text-green-700 bg-green-50',
  ACCESITARIO: 'border-gray-500 text-gray-700 bg-gray-50',
}
