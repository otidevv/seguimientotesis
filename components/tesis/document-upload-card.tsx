'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Eye, File, FileCheck, Loader2, RefreshCw, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from './utils'
import type { Documento } from './types'

interface DocumentUploadCardProps {
  titulo: string
  descripcion: string
  tipoDocumento: string
  documento?: Documento
  onUpload: (tipo: string, file: File) => void
  subiendo: boolean
  accept: string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  observado?: string
  verificado?: boolean
  corregido?: boolean
}

export function DocumentUploadCard({
  titulo,
  descripcion,
  tipoDocumento,
  documento,
  onUpload,
  subiendo,
  accept,
  icon,
  iconColor,
  iconBg,
  observado,
  verificado,
  corregido,
}: DocumentUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      onUpload(tipoDocumento, file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onUpload(tipoDocumento, file)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button') || target.closest('input')) return
    if (documento) return
    if (!subiendo) inputRef.current?.click()
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 transition-all group',
        isDragging && 'border-primary bg-primary/5 border-dashed',
        corregido && 'border-blue-400 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20 border-solid',
        observado && !corregido && 'border-orange-400 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20 border-solid',
        documento && !isDragging && !observado && !corregido && 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 border-solid',
        !documento && !isDragging && !observado && !corregido && 'border-dashed border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer'
      )}
      onClick={handleCardClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={cn(
            'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
            corregido ? 'bg-blue-100 dark:bg-blue-900/50' :
            observado ? 'bg-orange-100 dark:bg-orange-900/50' : documento ? 'bg-green-100 dark:bg-green-900/50' : iconBg
          )}>
            {corregido ? (
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            ) : observado ? (
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            ) : documento ? (
              <FileCheck className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            ) : (
              <span className={iconColor}>{icon}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-semibold text-xs sm:text-sm">{titulo}</p>
              {corregido ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500 text-blue-600 shrink-0">
                  Corregido
                </Badge>
              ) : observado ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500 text-orange-600 shrink-0">
                  Observado
                </Badge>
              ) : documento && verificado ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600 shrink-0">
                  Verificado
                </Badge>
              ) : documento ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500 text-green-600 shrink-0">
                  Subido
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive shrink-0">
                  Requerido
                </Badge>
              )}
            </div>
            {corregido ? (
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 sm:mb-3">Documento actualizado — pendiente de revisión</p>
            ) : observado ? (
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-2 sm:mb-3">{observado}</p>
            ) : (
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3 line-clamp-1 sm:line-clamp-none">{descripcion}</p>
            )}

            {documento ? (
              <a
                href={documento.archivoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-white dark:bg-background border hover:bg-muted/50 transition-colors cursor-pointer"
                title="Ver documento"
              >
                <File className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                <span className="text-xs sm:text-sm flex-1 truncate">{documento.nombre}</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline shrink-0">
                  {formatFileSize(documento.archivoTamano)}
                </span>
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
              </a>
            ) : (
              <div className="text-center py-1 sm:py-2">
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Arrastra un archivo aquí o haz clic en subir
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleChange}
              className="hidden"
              disabled={subiendo}
            />
            <Button
              variant={documento ? 'outline' : 'default'}
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            >
              {subiendo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : documento ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Cambiar</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Subir</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {subiendo && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm font-medium">Subiendo documento...</span>
          </div>
        </div>
      )}
    </div>
  )
}
