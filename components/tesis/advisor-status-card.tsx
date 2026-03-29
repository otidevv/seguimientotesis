'use client'

import { Badge } from '@/components/ui/badge'
import { Clock, Eye, File, FileCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ESTADO_ASESOR_CONFIG } from './constants'
import { formatFileSize } from './utils'
import type { Documento } from './types'

interface AdvisorStatusCardProps {
  titulo: string
  descripcion: string
  tipoAsesor: string
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
  icon: React.ReactNode
  iconColor: string
  iconBg: string
}

export function AdvisorStatusCard({
  titulo,
  tipoAsesor,
  asesor,
  documento,
  icon,
  iconColor,
  iconBg,
}: AdvisorStatusCardProps) {
  const estadoConfig = ESTADO_ASESOR_CONFIG[asesor.estado] || ESTADO_ASESOR_CONFIG.PENDIENTE
  const nombreAsesor = `${asesor.user.nombres} ${asesor.user.apellidoPaterno} ${asesor.user.apellidoMaterno}`

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 transition-all',
        asesor.estado === 'ACEPTADO' && documento && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20',
        asesor.estado === 'ACEPTADO' && !documento && 'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20',
        asesor.estado === 'PENDIENTE' && 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20',
        asesor.estado === 'RECHAZADO' && 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
            asesor.estado === 'ACEPTADO' && documento ? 'bg-green-100 dark:bg-green-900/50' :
            asesor.estado === 'ACEPTADO' && !documento ? 'bg-blue-100 dark:bg-blue-900/50' :
            asesor.estado === 'RECHAZADO' ? 'bg-red-100 dark:bg-red-900/50' : iconBg
          )}>
            {asesor.estado === 'ACEPTADO' && documento ? (
              <FileCheck className="w-6 h-6 text-green-600" />
            ) : asesor.estado === 'ACEPTADO' && !documento ? (
              <Clock className="w-6 h-6 text-blue-600" />
            ) : asesor.estado === 'RECHAZADO' ? (
              <X className="w-6 h-6 text-red-600" />
            ) : (
              <span className={iconColor}>{icon}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-semibold text-sm">{titulo}</p>
              {asesor.estado === 'ACEPTADO' && documento ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600">
                  Carta registrada
                </Badge>
              ) : asesor.estado === 'ACEPTADO' && !documento ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500 text-blue-600">
                  Falta carta
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] px-1.5 py-0',
                    estadoConfig.color,
                    asesor.estado === 'PENDIENTE' && 'border-yellow-500',
                    asesor.estado === 'RECHAZADO' && 'border-red-500'
                  )}
                >
                  {estadoConfig.label}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              {tipoAsesor}: <span className="font-medium">{nombreAsesor}</span>
            </p>

            {asesor.estado === 'ACEPTADO' && documento ? (
              <a
                href={documento.archivoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-background border hover:bg-muted/50 transition-colors cursor-pointer"
                title="Ver carta de aceptación"
              >
                <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{documento.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(documento.archivoTamano)}
                </span>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </a>
            ) : asesor.estado === 'ACEPTADO' && !documento ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-100/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Aceptó la asesoría — falta carta
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    El {tipoAsesor.toLowerCase()} debe subir su carta de aceptación
                  </p>
                </div>
              </div>
            ) : asesor.estado === 'PENDIENTE' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Esperando aceptación
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    El {tipoAsesor.toLowerCase()} debe aceptar y subir su carta de aceptación
                  </p>
                </div>
              </div>
            ) : asesor.estado === 'RECHAZADO' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-100/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Asesoría rechazada
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    El {tipoAsesor.toLowerCase()} ha rechazado la asesoría
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
