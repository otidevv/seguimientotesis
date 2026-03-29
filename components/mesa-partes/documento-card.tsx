'use client'

import { Badge } from '@/components/ui/badge'
import { Download, Eye, FileCheck, FileText } from 'lucide-react'
import { cn, formatFileSize } from '@/lib/utils'
import type { Documento } from './types'

interface DocumentoCardProps {
  titulo: string
  documento?: Documento
  iconColor: string
  iconBg: string
}

export function DocumentoCard({ titulo, documento, iconColor, iconBg }: DocumentoCardProps) {
  return (
    <div className={cn(
      'rounded-xl border-2 p-3 sm:p-4 overflow-hidden',
      documento ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20' : 'border-muted'
    )}>
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={cn(
          'w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0',
          documento ? 'bg-green-100 dark:bg-green-900/50' : iconBg
        )}>
          {documento ? (
            <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          ) : (
            <FileText className={cn('w-4 h-4 sm:w-5 sm:h-5', iconColor)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-xs sm:text-sm leading-tight">{titulo}</p>
            {documento ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600 shrink-0">
                {documento.firmado ? 'Firmado' : 'Subido'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground shrink-0">
                No subido
              </Badge>
            )}
          </div>
          {documento ? (
            <div className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-white dark:bg-background border mt-1.5 sm:mt-2 min-w-0">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
              <span className="text-xs sm:text-sm flex-1 truncate">{documento.nombre}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline shrink-0">
                {formatFileSize(documento.tamano)}
              </span>
              <a
                href={documento.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 sm:p-1.5 hover:bg-muted rounded-md transition-colors shrink-0"
                title="Ver documento"
              >
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
              <a
                href={documento.url}
                download
                className="p-1 sm:p-1.5 hover:bg-muted rounded-md transition-colors shrink-0"
                title="Descargar"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </a>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">El documento no ha sido subido</p>
          )}
        </div>
      </div>
    </div>
  )
}
