'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Download, Eye, File, FileCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from './utils'
import type { Documento } from './types'

// Documento en modo solo lectura
interface ReadOnlyDocumentCardProps {
  titulo: string
  documento?: Documento
  icon: React.ReactNode
  iconColor: string
  iconBg: string
}

export function ReadOnlyDocumentCard({
  titulo,
  documento,
  icon,
  iconColor,
  iconBg,
}: ReadOnlyDocumentCardProps) {
  return (
    <div className={cn(
      'rounded-xl border-2 p-4',
      documento ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' : 'border-muted'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          documento ? 'bg-green-100 dark:bg-green-900/50' : iconBg
        )}>
          {documento ? (
            <FileCheck className="w-5 h-5 text-green-600" />
          ) : (
            <span className={iconColor}>{icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm">{titulo}</p>
            {documento && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                Subido
              </Badge>
            )}
          </div>
          {documento ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border mt-2">
              <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1 truncate">{documento.nombre}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(documento.archivoTamano)}
              </span>
              <a
                href={documento.archivoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Ver documento"
              >
                <Eye className="w-4 h-4" />
              </a>
              <a
                href={documento.archivoUrl}
                download
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Descargar documento"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay documento subido</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Estado del asesor en modo solo lectura
interface ReadOnlyAdvisorCardProps {
  titulo: string
  asesor: {
    id: string
    tipoAsesor: string
    estado: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
  }
  documento?: Documento
}

export function ReadOnlyAdvisorCard({ titulo, asesor, documento }: ReadOnlyAdvisorCardProps) {
  const nombreAsesor = `${asesor.user.nombres} ${asesor.user.apellidoPaterno} ${asesor.user.apellidoMaterno}`

  return (
    <div className={cn(
      'rounded-xl border-2 p-4',
      asesor.estado === 'ACEPTADO' && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
      asesor.estado === 'PENDIENTE' && 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20',
      asesor.estado === 'RECHAZADO' && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          asesor.estado === 'ACEPTADO' && 'bg-green-100 dark:bg-green-900/50',
          asesor.estado === 'PENDIENTE' && 'bg-yellow-100 dark:bg-yellow-900/50',
          asesor.estado === 'RECHAZADO' && 'bg-red-100 dark:bg-red-900/50'
        )}>
          {asesor.estado === 'ACEPTADO' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : asesor.estado === 'RECHAZADO' ? (
            <X className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-sm">{titulo}</p>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                asesor.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                asesor.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                asesor.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
              )}
            >
              {asesor.estado === 'ACEPTADO' ? 'Aceptado' : asesor.estado === 'PENDIENTE' ? 'Pendiente' : 'Rechazado'}
            </Badge>
          </div>
          <p className="text-sm font-medium">{nombreAsesor}</p>
          <p className="text-xs text-muted-foreground">{asesor.user.email}</p>

          {asesor.estado === 'ACEPTADO' && documento && (
            <a
              href={documento.archivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border mt-2 hover:bg-muted/50 transition-colors cursor-pointer"
              title="Ver carta de aceptación"
            >
              <FileCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm flex-1 truncate">Carta de Aceptación</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(documento.archivoTamano)}
              </span>
              <Eye className="w-4 h-4 text-muted-foreground" />
            </a>
          )}
          {asesor.estado === 'ACEPTADO' && !documento && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              Aceptó la asesoría — pendiente de subir carta
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Estado del coautor en modo solo lectura
interface ReadOnlyCoauthorCardProps {
  coautor: {
    id: string
    tipoParticipante: string
    estado: string
    user: {
      id: string
      nombres: string
      apellidoPaterno: string
      apellidoMaterno: string
      email: string
    }
    studentCareer: {
      codigoEstudiante: string
    }
  }
}

export function ReadOnlyCoauthorCard({ coautor }: ReadOnlyCoauthorCardProps) {
  const nombreCoautor = `${coautor.user.nombres} ${coautor.user.apellidoPaterno} ${coautor.user.apellidoMaterno}`

  return (
    <div className={cn(
      'rounded-xl border-2 p-4',
      coautor.estado === 'ACEPTADO' && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
      coautor.estado === 'PENDIENTE' && 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20',
      coautor.estado === 'RECHAZADO' && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          coautor.estado === 'ACEPTADO' && 'bg-green-100 dark:bg-green-900/50',
          coautor.estado === 'PENDIENTE' && 'bg-yellow-100 dark:bg-yellow-900/50',
          coautor.estado === 'RECHAZADO' && 'bg-red-100 dark:bg-red-900/50'
        )}>
          {coautor.estado === 'ACEPTADO' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : coautor.estado === 'RECHAZADO' ? (
            <X className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-yellow-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-sm">Coautor (Tesista 2)</p>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0',
                coautor.estado === 'ACEPTADO' && 'border-green-500 text-green-600',
                coautor.estado === 'PENDIENTE' && 'border-yellow-500 text-yellow-600',
                coautor.estado === 'RECHAZADO' && 'border-red-500 text-red-600'
              )}
            >
              {coautor.estado === 'ACEPTADO' ? 'Aceptado' : coautor.estado === 'PENDIENTE' ? 'Pendiente' : 'Rechazado'}
            </Badge>
          </div>
          <p className="text-sm font-medium">{nombreCoautor}</p>
          <p className="text-xs text-muted-foreground">
            {coautor.studentCareer.codigoEstudiante} • {coautor.user.email}
          </p>
        </div>
      </div>
    </div>
  )
}
