import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { validarArchivoPDF } from '@/lib/utils'

export interface ResolutionUploadState {
  archivo: File | null
  setArchivo: (file: File | null) => void
  nombre: string
  setNombre: (nombre: string) => void
  subiendo: boolean
  submit: () => Promise<void>
}

interface ResolutionConfig {
  tipoDocumento: string
  accion?: string
  comentario?: string
  successMessage?: string
}

/**
 * Hook for a single resolution upload instance.
 * Call once per resolution type in the page component.
 */
export function useResolutionUploadInstance(
  tesisId: string,
  mesaPartesId: string,
  config: ResolutionConfig,
  onSuccess: () => void,
): ResolutionUploadState {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [nombre, setNombre] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const submit = useCallback(async () => {
    if (!archivo) {
      toast.error('Seleccione un archivo de resolución')
      return
    }
    const error = validarArchivoPDF(archivo)
    if (error) {
      toast.error(error)
      return
    }
    if (!nombre.trim()) {
      toast.error('Ingrese el título de la resolución')
      return
    }

    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('file', archivo)
      formData.append('tipoDocumento', config.tipoDocumento)
      formData.append('nombreDocumento', nombre.trim())

      await api.post(`/api/tesis/${tesisId}/documentos`, formData)

      if (config.accion) {
        const data = await api.put<{ message: string }>(`/api/mesa-partes/${mesaPartesId}`, {
          accion: config.accion,
          comentario: config.comentario ?? '',
        })
        toast.success(data.message)
      } else {
        toast.success(config.successMessage ?? 'Resolución subida correctamente')
      }

      setArchivo(null)
      setNombre('')
      onSuccess()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir resolución')
    } finally {
      setSubiendo(false)
    }
  }, [archivo, nombre, tesisId, mesaPartesId, config, onSuccess])

  return { archivo, setArchivo, nombre, setNombre, subiendo, submit }
}
