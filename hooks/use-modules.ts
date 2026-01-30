'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import type { ModuleResponse, ModuleWithChildren } from '@/lib/admin/services/module.service'

interface ModuleFilters {
  search?: string
  isActive?: string
  parentId?: string | null
}

export function useModules() {
  const { authFetch } = useAuth()
  const [modules, setModules] = useState<ModuleResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModules = useCallback(async (filters: ModuleFilters = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, value as string)
        }
      })

      const response = await authFetch(`/api/admin/modulos?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar módulos')
      }

      setModules(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch])

  const getModule = useCallback(async (id: string): Promise<ModuleWithChildren> => {
    const response = await authFetch(`/api/admin/modulos/${id}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cargar módulo')
    }

    return data.data
  }, [authFetch])

  const createModule = useCallback(async (moduleData: {
    nombre: string
    codigo: string
    descripcion?: string
    icono?: string
    ruta?: string
    orden?: number
    parentId?: string | null
  }) => {
    const response = await authFetch('/api/admin/modulos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moduleData),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.error || 'Error al crear módulo') as any
      error.details = data.details
      throw error
    }

    return data.data
  }, [authFetch])

  const updateModule = useCallback(async (id: string, moduleData: {
    nombre?: string
    descripcion?: string
    icono?: string
    ruta?: string
    orden?: number
    parentId?: string | null
  }) => {
    const response = await authFetch(`/api/admin/modulos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(moduleData),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.error || 'Error al actualizar módulo') as any
      error.details = data.details
      throw error
    }

    return data.data
  }, [authFetch])

  const deleteModule = useCallback(async (id: string) => {
    const response = await authFetch(`/api/admin/modulos/${id}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar módulo')
    }

    return data
  }, [authFetch])

  const toggleActive = useCallback(async (id: string) => {
    const response = await authFetch(`/api/admin/modulos/${id}/toggle-active`, {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cambiar estado')
    }

    return data.data
  }, [authFetch])

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
