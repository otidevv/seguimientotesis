import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface Participante {
  id: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string
  codigoEstudiante?: string
  codigoDocente?: string
  departamento?: string
  studentCareerId?: string
  tieneTesisActiva?: boolean
  tesisActivaTitulo?: string | null
  desistioDeEstaTesis?: boolean
}

type TipoParticipante = 'COAUTOR' | 'ASESOR' | 'COASESOR'
type ModoDialogo = 'REEMPLAZAR' | 'AGREGAR'

interface TesisMinima {
  id: string
  carreraNombre?: string
  facultad?: { id: string } | null
}

export function useParticipantManager(
  tesis: TesisMinima | null,
  onSuccess: () => void,
) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tipoReemplazo, setTipoReemplazo] = useState<TipoParticipante | null>(null)
  const [participanteActualId, setParticipanteActualId] = useState<string | null>(null)
  const [modoDialogo, setModoDialogo] = useState<ModoDialogo>('REEMPLAZAR')
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Participante[]>([])
  const [buscando, setBuscando] = useState(false)
  const [reemplazando, setReemplazando] = useState(false)
  const [participanteSeleccionado, setParticipanteSeleccionado] = useState<Participante | null>(null)

  const abrirReemplazo = useCallback((tipo: TipoParticipante, participanteId: string) => {
    setTipoReemplazo(tipo)
    setParticipanteActualId(participanteId)
    setModoDialogo('REEMPLAZAR')
    setBusqueda('')
    setResultados([])
    setParticipanteSeleccionado(null)
    setDialogOpen(true)
  }, [])

  const abrirAgregar = useCallback((tipo: 'COAUTOR' | 'COASESOR') => {
    setTipoReemplazo(tipo)
    setParticipanteActualId(null)
    setModoDialogo('AGREGAR')
    setBusqueda('')
    setResultados([])
    setParticipanteSeleccionado(null)
    setDialogOpen(true)
  }, [])

  const cerrar = useCallback(() => {
    setDialogOpen(false)
  }, [])

  const buscarParticipantes = useCallback(async (query: string) => {
    if (query.length < 2 || !tesis) {
      setResultados([])
      return
    }

    setBuscando(true)
    try {
      let endpoint: string
      if (tipoReemplazo === 'COAUTOR') {
        const carreraParam = tesis.carreraNombre ? `&carrera=${encodeURIComponent(tesis.carreraNombre)}` : ''
        const tesisParam = `&tesisId=${encodeURIComponent(tesis.id)}`
        endpoint = `/api/tesis/buscar-estudiantes?q=${encodeURIComponent(query)}${carreraParam}${tesisParam}`
      } else {
        const facultadParam = tesis.facultad?.id ? `&facultadId=${encodeURIComponent(tesis.facultad.id)}` : ''
        endpoint = `/api/tesis/buscar-docentes?q=${encodeURIComponent(query)}${facultadParam}`
      }

      const data = await api.get<{ data: Participante[] }>(endpoint)
      setResultados(data.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al buscar')
    } finally {
      setBuscando(false)
    }
  }, [tesis, tipoReemplazo])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busqueda.length >= 2) {
        buscarParticipantes(busqueda)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [busqueda, buscarParticipantes])

  const ejecutar = useCallback(async () => {
    if (!tesis || !tipoReemplazo || !participanteSeleccionado) return

    setReemplazando(true)
    try {
      let data: { message: string }

      if (modoDialogo === 'AGREGAR') {
        data = await api.post<{ message: string }>(`/api/tesis/${tesis.id}/participantes`, {
          tipo: tipoReemplazo,
          participanteId: participanteSeleccionado.id,
          studentCareerId: tipoReemplazo === 'COAUTOR' ? participanteSeleccionado.studentCareerId : undefined,
        })
      } else {
        data = await api.put<{ message: string }>(`/api/tesis/${tesis.id}/participantes`, {
          tipo: tipoReemplazo,
          accion: 'REEMPLAZAR',
          participanteId: participanteActualId,
          nuevoParticipanteId: participanteSeleccionado.id,
          studentCareerId: tipoReemplazo === 'COAUTOR' ? participanteSeleccionado.studentCareerId : undefined,
        })
      }

      toast.success(data.message)
      setDialogOpen(false)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    } finally {
      setReemplazando(false)
    }
  }, [tesis, tipoReemplazo, participanteSeleccionado, modoDialogo, participanteActualId, onSuccess])

  const eliminar = useCallback(async (tipo: 'COAUTOR' | 'COASESOR', participanteId: string) => {
    if (!tesis) return

    if (!confirm(`¿Estás seguro de eliminar este ${tipo === 'COAUTOR' ? 'coautor' : 'coasesor'}?`)) {
      return
    }

    try {
      const data = await api.put<{ message: string }>(`/api/tesis/${tesis.id}/participantes`, {
        tipo,
        accion: 'ELIMINAR',
        participanteId,
      })
      toast.success(data.message)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error de conexión')
    }
  }, [tesis, onSuccess])

  return {
    dialogOpen, tipoReemplazo, modoDialogo,
    busqueda, setBusqueda,
    resultados, buscando, reemplazando,
    participanteSeleccionado, setParticipanteSeleccionado,
    abrirReemplazo, abrirAgregar, cerrar,
    ejecutar, eliminar,
  }
}
