import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { BusquedaJurado } from '@/components/mesa-partes'

export function useJuradoManager(
  tesisId: string,
  estado: string | undefined,
  onSuccess: () => void,
) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<BusquedaJurado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [tipoJurado, setTipoJurado] = useState<string>('PRESIDENTE')
  const [procesando, setProcesando] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  const buscar = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResultados([])
      return
    }

    setBuscando(true)
    try {
      const fase = estado === 'INFORME_FINAL' ? 'INFORME_FINAL' : 'PROYECTO'
      const data = await api.get<{ data: BusquedaJurado[] }>('/api/buscar-jurados', {
        params: { q: query, tesisId, fase },
      })
      setResultados(data.data)
    } catch {
      // silently fail
    } finally {
      setBuscando(false)
    }
  }, [tesisId, estado])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(busqueda), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [busqueda, buscar])

  const asignar = useCallback(async (userId: string) => {
    setProcesando(true)
    try {
      const data = await api.post<{ message: string }>(`/api/mesa-partes/${tesisId}/jurados`, {
        userId,
        tipo: tipoJurado,
      })
      toast.success(data.message)
      setBusqueda('')
      setResultados([])
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al asignar jurado')
    } finally {
      setProcesando(false)
    }
  }, [tesisId, tipoJurado, onSuccess])

  const remover = useCallback(async (juradoId: string) => {
    setProcesando(true)
    try {
      const data = await api.delete<{ message: string }>(`/api/mesa-partes/${tesisId}/jurados`, { juradoId })
      toast.success(data.message)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al remover jurado')
    } finally {
      setProcesando(false)
    }
  }, [tesisId, onSuccess])

  const confirmar = useCallback(async () => {
    setProcesando(true)
    try {
      const data = await api.put<{ message: string }>(`/api/mesa-partes/${tesisId}`, {
        accion: 'CONFIRMAR_JURADOS',
      })
      toast.success(data.message)
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al confirmar jurados')
    } finally {
      setProcesando(false)
    }
  }, [tesisId, onSuccess])

  return {
    busqueda, setBusqueda,
    resultados, buscando,
    tipoJurado, setTipoJurado,
    procesando,
    asignar, remover, confirmar,
  }
}
