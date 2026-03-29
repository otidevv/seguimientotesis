'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api'
import type { ModuleResponse, ModuleWithChildren } from '@/lib/admin/services/module.service'

interface ModuleFilters {
  search?: string
  isActive?: string
  parentId?: string | null | undefined
}

export function useModules() {
  const [modules, setModules] = useState<ModuleResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModules = useCallback(async (filters: ModuleFilters = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await api.get<{ data: ModuleResponse[] }>('/api/admin/modulos', { params: filters })
      setModules(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getModule = useCallback(async (id: string): Promise<ModuleWithChildren> => {
    const data = await api.get<{ data: ModuleWithChildren }>(`/api/admin/modulos/${id}`)
    return data.data
  }, [])

  const createModule = useCallback(async (moduleData: {
    nombre: string
    codigo: string
    descripcion?: string
    icono?: string
    ruta?: string
    orden?: number
    parentId?: string | null
  }) => {
    const data = await api.post<{ data: ModuleResponse }>('/api/admin/modulos', moduleData)
    return data.data
  }, [])

  const updateModule = useCallback(async (id: string, moduleData: {
    nombre?: string
    descripcion?: string
    icono?: string
    ruta?: string
    orden?: number
    parentId?: string | null
  }) => {
    const data = await api.put<{ data: ModuleResponse }>(`/api/admin/modulos/${id}`, moduleData)
    return data.data
  }, [])

  const deleteModule = useCallback(async (id: string) => {
    return await api.delete(`/api/admin/modulos/${id}`)
  }, [])

  const toggleActive = useCallback(async (id: string) => {
    const data = await api.post<{ data: ModuleResponse }>(`/api/admin/modulos/${id}/toggle-active`, {})
    return data.data
  }, [])

  return {
    modules,
    isLoading,
    error,
    fetchModules,
    getModule,
    createModule,
    updateModule,
    deleteModule,
    toggleActive,
  }
}
