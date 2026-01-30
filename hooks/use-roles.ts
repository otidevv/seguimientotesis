'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import type { RoleResponse, RoleWithPermissions, ModulePermission } from '@/lib/admin/services/role.service'

interface RoleFilters {
  search?: string
  isActive?: string
  isSystem?: string
}

interface SystemModule {
  id: string
  nombre: string
  codigo: string
  descripcion: string | null
  icono: string | null
  ruta: string | null
  orden: number
  parentId: string | null
}

export function useRoles() {
  const { authFetch } = useAuth()
  const [roles, setRoles] = useState<RoleResponse[]>([])
  const [modules, setModules] = useState<SystemModule[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRoles = useCallback(async (filters: RoleFilters = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, value)
        }
      })

      const response = await authFetch(`/api/admin/roles?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar roles')
      }

      setRoles(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch])

  const fetchModules = useCallback(async () => {
    try {
      const response = await authFetch('/api/admin/modules')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar módulos')
      }

      setModules(data.data)
      return data.data
    } catch (err) {
      console.error('Error loading modules:', err)
      return []
    }
  }, [authFetch])

  const getRole = useCallback(async (id: string): Promise<RoleWithPermissions> => {
    const response = await authFetch(`/api/admin/roles/${id}`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cargar rol')
    }

    return data.data
  }, [authFetch])

  const createRole = useCallback(async (roleData: {
    nombre: string
    codigo: string
    descripcion?: string
    color?: string
  }) => {
    const response = await authFetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.error || 'Error al crear rol') as any
      error.details = data.details
      throw error
    }

    return data.data
  }, [authFetch])

  const updateRole = useCallback(async (id: string, roleData: {
    nombre?: string
    descripcion?: string
    color?: string
  }) => {
    const response = await authFetch(`/api/admin/roles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = new Error(data.error || 'Error al actualizar rol') as any
      error.details = data.details
      throw error
    }

    return data.data
  }, [authFetch])

  const deleteRole = useCallback(async (id: string) => {
    const response = await authFetch(`/api/admin/roles/${id}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al eliminar rol')
    }

    return data
  }, [authFetch])

  const toggleActive = useCallback(async (id: string) => {
    const response = await authFetch(`/api/admin/roles/${id}/toggle-active`, {
      method: 'POST',
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cambiar estado')
    }

    return data.data
  }, [authFetch])

  const getPermissions = useCallback(async (roleId: string): Promise<ModulePermission[]> => {
    const response = await authFetch(`/api/admin/roles/${roleId}/permissions`)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al cargar permisos')
    }

    return data.data
  }, [authFetch])

  const updatePermissions = useCallback(async (
    roleId: string,
    permissions: Array<{
      moduleId: string
      canView: boolean
      canCreate: boolean
      canEdit: boolean
      canDelete: boolean
    }>
  ) => {
    const response = await authFetch(`/api/admin/roles/${roleId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar permisos')
    }

    return data.data
  }, [authFetch])

  return {
    roles,
    modules,
    isLoading,
    error,
    fetchRoles,
    fetchModules,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    toggleActive,
    getPermissions,
    updatePermissions,
  }
}
